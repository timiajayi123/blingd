const { Client, Databases, IndexType } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_INVENTORY_RESERVATIONS_COLLECTION_ID || 'storefront_inventory_reservations';

if (!projectId || !apiKey || !databaseId) {
  throw new Error('Missing Appwrite project, API key, or database environment variables.');
}

const databases = new Databases(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureCollection() {
  try {
    await databases.getCollection(databaseId, collectionId);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createCollection(databaseId, collectionId, 'YOUR BRAND INVENTORY RESERVATIONS', [], false, true);
  }
}

async function ensureAttribute(key, create) {
  try {
    await databases.getAttribute(databaseId, collectionId, key);
  } catch (error) {
    if (error.code !== 404) throw error;
    await create();
  }
}

async function waitForAttribute(key) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const attribute = await databases.getAttribute(databaseId, collectionId, key);
    if (attribute.status === 'available') return;
    if (attribute.status === 'failed') throw new Error(`Appwrite attribute ${collectionId}.${key} failed to build.`);
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${collectionId}.${key}.`);
}

async function ensureIndex(key, type, attributes) {
  try {
    await databases.getIndex(databaseId, collectionId, key);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
  }
}

async function main() {
  await ensureCollection();
  await ensureAttribute('reference', () => databases.createStringAttribute(databaseId, collectionId, 'reference', 160, true));
  await ensureAttribute('status', () => databases.createEnumAttribute(databaseId, collectionId, 'status', ['pending', 'reserved', 'paid', 'released'], true));
  await ensureAttribute('items', () => databases.createStringAttribute(databaseId, collectionId, 'items', 10000, true));
  await ensureAttribute('expiresAt', () => databases.createDatetimeAttribute(databaseId, collectionId, 'expiresAt', true));
  await ensureAttribute('orderId', () => databases.createStringAttribute(databaseId, collectionId, 'orderId', 64, false, ''));
  for (const key of ['reference', 'status', 'items', 'expiresAt', 'orderId']) await waitForAttribute(key);
  await ensureIndex('reference_unique', IndexType.Unique, ['reference']);
  await ensureIndex('status_expires_idx', IndexType.Key, ['status', 'expiresAt']);
  console.log(`Inventory reservations ready: ${collectionId}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
