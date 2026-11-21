const { Client, Databases } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const productsCollectionId = process.env.APPWRITE_PRODUCT_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID || 'storefront_products';

if (!projectId || !apiKey || !databaseId) {
  throw new Error('Missing Appwrite project, API key, or database environment variables.');
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  try {
    await databases.getAttribute(databaseId, productsCollectionId, 'shippingWeightGrams');
    console.log('Product shipping-weight attribute already exists.');
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createIntegerAttribute(
      databaseId,
      productsCollectionId,
      'shippingWeightGrams',
      false,
      0,
      50000,
      0,
    );
    console.log('Created product shipping-weight attribute.');
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const attribute = await databases.getAttribute(databaseId, productsCollectionId, 'shippingWeightGrams');
    if (attribute.status === 'available') {
      console.log('Product shipping-weight attribute is ready.');
      return;
    }
    if (attribute.status === 'failed') throw new Error('Product shipping-weight attribute failed to build.');
    await sleep(1000);
  }

  throw new Error('Timed out waiting for the product shipping-weight attribute.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
