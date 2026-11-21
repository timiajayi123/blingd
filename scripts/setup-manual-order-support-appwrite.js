const { Client, Compression, Databases, Storage } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const ordersCollectionId = process.env.APPWRITE_ORDER_COLLECTION_ID || process.env.APPWRITE_ORDERS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID || 'storefront_orders';
const proofBucketId = process.env.APPWRITE_ORDER_PROOF_BUCKET_ID || 'storefront_order_proofs';

if (!projectId || !apiKey || !databaseId) throw new Error('Missing Appwrite project, API key, or database environment variables.');

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const storage = new Storage(client);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureAttribute(key) {
  try {
    await databases.getAttribute(databaseId, ordersCollectionId, key);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createStringAttribute(databaseId, ordersCollectionId, key, 128, false, '');
  }
}

async function waitForAttribute(key) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const attribute = await databases.getAttribute(databaseId, ordersCollectionId, key);
    if (attribute.status === 'available') return;
    if (attribute.status === 'failed') throw new Error(`Appwrite attribute ${ordersCollectionId}.${key} failed to build.`);
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${ordersCollectionId}.${key}.`);
}

async function ensureProofBucket() {
  try {
    await storage.getBucket(proofBucketId);
  } catch (error) {
    if (error.code !== 404) throw error;
    await storage.createBucket(
      proofBucketId,
      'YOUR BRAND ORDER PROOFS',
      [],
      true,
      true,
      10 * 1024 * 1024,
      ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      Compression.None,
      true,
      true
    );
  }
}

async function main() {
  await ensureAttribute('salesSource');
  await ensureAttribute('paymentProofFileId');
  await Promise.all(['salesSource', 'paymentProofFileId'].map(waitForAttribute));
  await ensureProofBucket();
  console.log(`Manual-order support ready: ${ordersCollectionId}; private proof bucket: ${proofBucketId}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
