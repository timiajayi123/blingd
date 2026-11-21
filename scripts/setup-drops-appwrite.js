const { Client, Databases, IndexType, Permission, Query, Role } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const productsCollectionId = process.env.APPWRITE_PRODUCT_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID || 'storefront_products';
const dropsCollectionId = process.env.APPWRITE_DROPS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_DROPS_COLLECTION_ID || 'storefront_drops';
const projectZeroId = 'project_0';

if (!projectId || !apiKey || !databaseId) {
  throw new Error('Missing Appwrite project, API key, or database environment variables.');
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureCollection() {
  try {
    await databases.getCollection(databaseId, dropsCollectionId);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createCollection(databaseId, dropsCollectionId, 'STOREFRONT DROPS', [Permission.read(Role.any())], false, true);
  }

  await databases.updateCollection(
    databaseId,
    dropsCollectionId,
    'STOREFRONT DROPS',
    [Permission.read(Role.any())],
    false,
    true
  );
}

async function ensureAttribute(collectionId, key, create) {
  try {
    await databases.getAttribute(databaseId, collectionId, key);
  } catch (error) {
    if (error.code !== 404) throw error;
    await create();
  }
}

async function waitForAttribute(collectionId, key) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const attribute = await databases.getAttribute(databaseId, collectionId, key);
    if (attribute.status === 'available') return;
    if (attribute.status === 'failed') throw new Error(`Appwrite attribute ${collectionId}.${key} failed to build.`);
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${collectionId}.${key}.`);
}

async function ensureIndex(collectionId, key, type, attributes) {
  try {
    await databases.getIndex(databaseId, collectionId, key);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
  }
}

async function ensureProjectZero() {
  const data = {
    name: 'Project 0',
    slug: 'project-0',
    description: 'The original YOUR BRAND product release.',
    enabled: true,
    featured: true,
    coverImage: '',
    position: 0,
  };

  try {
    await databases.getDocument(databaseId, dropsCollectionId, projectZeroId);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createDocument(databaseId, dropsCollectionId, projectZeroId, data);
  }
}

async function migrateProducts() {
  let migrated = 0;
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(databaseId, productsCollectionId, [
      Query.limit(100),
      Query.offset(offset),
    ]);

    for (const product of response.documents) {
      if (!product.dropId) {
        await databases.updateDocument(databaseId, productsCollectionId, product.$id, { dropId: projectZeroId });
        migrated += 1;
      }
    }

    if (response.documents.length < 100) break;
    offset += 100;
  }

  return migrated;
}

async function main() {
  await ensureCollection();
  await ensureAttribute(dropsCollectionId, 'name', () => databases.createStringAttribute(databaseId, dropsCollectionId, 'name', 160, true));
  await ensureAttribute(dropsCollectionId, 'slug', () => databases.createStringAttribute(databaseId, dropsCollectionId, 'slug', 160, true));
  await ensureAttribute(dropsCollectionId, 'description', () => databases.createStringAttribute(databaseId, dropsCollectionId, 'description', 2000, false, ''));
  await ensureAttribute(dropsCollectionId, 'enabled', () => databases.createBooleanAttribute(databaseId, dropsCollectionId, 'enabled', false, true));
  await ensureAttribute(dropsCollectionId, 'featured', () => databases.createBooleanAttribute(databaseId, dropsCollectionId, 'featured', false, false));
  await ensureAttribute(dropsCollectionId, 'launchAt', () => databases.createDatetimeAttribute(databaseId, dropsCollectionId, 'launchAt', false));
  await ensureAttribute(dropsCollectionId, 'coverImage', () => databases.createStringAttribute(databaseId, dropsCollectionId, 'coverImage', 2000, false, ''));
  await ensureAttribute(dropsCollectionId, 'position', () => databases.createIntegerAttribute(databaseId, dropsCollectionId, 'position', false, 0, 10000, 0));

  for (const key of ['name', 'slug', 'description', 'enabled', 'featured', 'launchAt', 'coverImage', 'position']) {
    await waitForAttribute(dropsCollectionId, key);
  }

  await ensureIndex(dropsCollectionId, 'slug_unique', IndexType.Unique, ['slug']);
  await ensureIndex(dropsCollectionId, 'enabled_idx', IndexType.Key, ['enabled']);
  await ensureIndex(dropsCollectionId, 'position_idx', IndexType.Key, ['position']);

  await ensureAttribute(productsCollectionId, 'dropId', () => databases.createStringAttribute(databaseId, productsCollectionId, 'dropId', 64, false, projectZeroId));
  await waitForAttribute(productsCollectionId, 'dropId');
  await ensureIndex(productsCollectionId, 'drop_id_idx', IndexType.Key, ['dropId']);

  await ensureProjectZero();
  const migrated = await migrateProducts();
  const products = await databases.listDocuments(databaseId, productsCollectionId, [Query.limit(1)]);

  console.log(`Drops ready: ${dropsCollectionId}. Project 0 contains ${products.total} products (${migrated} newly assigned).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
