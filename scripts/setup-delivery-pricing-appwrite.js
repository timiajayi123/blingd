const { Client, Databases, ID, IndexType } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_DELIVERY_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_DELIVERY_COLLECTION_ID || 'storefront_delivery';

if (!projectId || !apiKey || !databaseId) {
  throw new Error('Missing Appwrite project, API key, or database environment variables.');
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

const states = [
  ['Abia', 8000], ['Adamawa', 8000], ['Akwa Ibom', 8000], ['Anambra', 8000],
  ['Bauchi', 8000], ['Bayelsa', 8000], ['Benue', 8000], ['Borno', 8000],
  ['Cross River', 8000], ['Delta', 8000], ['Ebonyi', 8000], ['Edo', 8000],
  ['Ekiti', 8000], ['Enugu', 8000], ['FCT - Abuja', 7000], ['Gombe', 8000],
  ['Imo', 8000], ['Jigawa', 8000], ['Kaduna', 8000], ['Kano', 8000],
  ['Katsina', 8000], ['Kebbi', 8000], ['Kogi', 8000], ['Kwara', 8000],
  ['Lagos', 4000], ['Nasarawa', 8000], ['Niger', 8000], ['Ogun', 8000],
  ['Ondo', 8000], ['Osun', 8000], ['Oyo', 8000], ['Plateau', 8000],
  ['Rivers', 8000], ['Sokoto', 8000], ['Taraba', 8000], ['Yobe', 8000],
  ['Zamfara', 8000],
];

const subLocations = [
  ['FCT - Abuja', 'Nile University', 7000],
  ['FCT - Abuja', 'Baze University', 7000],
  ['FCT - Abuja', 'Veritas University', 7000],
  ['FCT - Abuja', 'University of Abuja (UNIABUJA)', 7000],
  ['Ogun', 'Babcock University', 8000],
  ['Ogun', 'Covenant University', 8000],
  ['Lagos', 'Pan-Atlantic University (PAU)', 4000],
  ['Lagos', 'University of Lagos (UNILAG)', 4000],
  ['Oyo', 'Obafemi Awolowo University (OAU)', 8000],
];

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureCollection() {
  try {
    await databases.getCollection(databaseId, collectionId);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createCollection(databaseId, collectionId, 'STOREFRONT DELIVERY', [], false, true);
  }
}

async function ensureAttribute(key, create) {
  try {
    await databases.getAttribute(databaseId, collectionId, key);
    return;
  } catch (error) {
    if (error.code !== 404) throw error;
  }
  await create();
}

async function waitForAttributes() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await databases.listAttributes(databaseId, collectionId);
    if (result.attributes.length >= 6 && result.attributes.every((attribute) => attribute.status === 'available')) return;
    if (result.attributes.some((attribute) => attribute.status === 'failed')) throw new Error('An Appwrite delivery attribute failed to build.');
    await sleep(1000);
  }
  throw new Error('Timed out waiting for delivery attributes.');
}

async function ensureIndex(key, type, attributes) {
  try {
    await databases.getIndex(databaseId, collectionId, key);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
  }
}

async function createIfMissing(documentId, data) {
  try {
    await databases.getDocument(databaseId, collectionId, documentId);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createDocument(databaseId, collectionId, documentId, data);
  }
}

async function main() {
  await ensureCollection();
  await ensureAttribute('state', () => databases.createStringAttribute(databaseId, collectionId, 'state', 100, true));
  await ensureAttribute('name', () => databases.createStringAttribute(databaseId, collectionId, 'name', 160, true));
  await ensureAttribute('price', () => databases.createIntegerAttribute(databaseId, collectionId, 'price', true, 0, 10000000));
  await ensureAttribute('type', () => databases.createEnumAttribute(databaseId, collectionId, 'type', ['state', 'sub_location'], true));
  await ensureAttribute('active', () => databases.createBooleanAttribute(databaseId, collectionId, 'active', false, true));
  await ensureAttribute('sortOrder', () => databases.createIntegerAttribute(databaseId, collectionId, 'sortOrder', false, 0, 10000, 0));
  await waitForAttributes();
  await ensureIndex('state_idx', IndexType.Key, ['state']);
  await ensureIndex('type_idx', IndexType.Key, ['type']);

  for (let index = 0; index < states.length; index += 1) {
    const [state, price] = states[index];
    await createIfMissing(`state_${slug(state)}`, { state, name: state, price, type: 'state', active: true, sortOrder: index });
  }
  for (let index = 0; index < subLocations.length; index += 1) {
    const [state, name, price] = subLocations[index];
    await createIfMissing(`place_${slug(name)}`, { state, name, price, type: 'sub_location', active: true, sortOrder: index });
  }

  const result = await databases.listDocuments(databaseId, collectionId);
  console.log(`Delivery pricing ready: ${result.total} locations in ${collectionId}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
