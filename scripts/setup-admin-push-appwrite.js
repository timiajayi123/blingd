const { Client, Databases, IndexType } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_ADMIN_PUSH_COLLECTION_ID || 'storefront_admin_push_subscriptions';

if (!projectId || !apiKey || !databaseId) throw new Error('Missing Appwrite project, API key, or database environment variables.');

const databases = new Databases(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureCollection() {
  try { await databases.getCollection(databaseId, collectionId); }
  catch (error) {
    if (error.code !== 404) throw error;
    await databases.createCollection(databaseId, collectionId, 'YOUR BRAND ADMIN PUSH SUBSCRIPTIONS', [], false, true);
  }
}

async function ensureAttribute(key, create) {
  try { await databases.getAttribute(databaseId, collectionId, key); }
  catch (error) {
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
  try { await databases.getIndex(databaseId, collectionId, key); }
  catch (error) {
    if (error.code !== 404) throw error;
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
  }
}

async function main() {
  await ensureCollection();
  await ensureAttribute('endpoint', () => databases.createStringAttribute(databaseId, collectionId, 'endpoint', 512, true));
  await ensureAttribute('p256dh', () => databases.createStringAttribute(databaseId, collectionId, 'p256dh', 512, true));
  await ensureAttribute('auth', () => databases.createStringAttribute(databaseId, collectionId, 'auth', 512, true));
  await ensureAttribute('adminUserId', () => databases.createStringAttribute(databaseId, collectionId, 'adminUserId', 160, false, ''));
  await ensureAttribute('userAgent', () => databases.createStringAttribute(databaseId, collectionId, 'userAgent', 1024, false, ''));
  await ensureAttribute('active', () => databases.createBooleanAttribute(databaseId, collectionId, 'active', false, true));
  for (const key of ['endpoint', 'p256dh', 'auth', 'adminUserId', 'userAgent', 'active']) await waitForAttribute(key);
  await ensureIndex('endpoint_unique', IndexType.Unique, ['endpoint']);
  await ensureIndex('active_idx', IndexType.Key, ['active']);
  console.log(`Admin Web Push subscriptions ready: ${collectionId}.`);
}

main().catch((error) => { console.error(error.message || error); process.exit(1); });
