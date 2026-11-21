const { loadEnvConfig } = require('@next/env');
const { Client, Databases } = require('node-appwrite');

loadEnvConfig(process.cwd());

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const settingsCollectionId = process.env.APPWRITE_SETTINGS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID || 'storefront_settings';

if (!projectId || !apiKey || !databaseId) {
  throw new Error('Missing Appwrite project, API key, or database environment variables.');
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const attributes = [
  ['homeVideoUrl', '/placeholder.svg'],
  ['homeVideoFileId', ''],
  ['homePosterUrl', ''],
  ['shopVideoUrl', ''],
  ['shopVideoFileId', ''],
  ['shopPosterUrl', ''],
];

async function ensureAttribute(key, fallback) {
  try {
    await databases.getAttribute(databaseId, settingsCollectionId, key);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createStringAttribute(databaseId, settingsCollectionId, key, 2048, false, fallback);
  }
}

async function waitForAttributes() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await databases.listAttributes(databaseId, settingsCollectionId);
    const mediaAttributes = result.attributes.filter((attribute) =>
      attributes.some(([key]) => key === attribute.key)
    );
    if (mediaAttributes.length === attributes.length && mediaAttributes.every((attribute) => attribute.status === 'available')) return;
    if (mediaAttributes.some((attribute) => attribute.status === 'failed')) {
      throw new Error('An Appwrite storefront media attribute failed to build.');
    }
    await sleep(1000);
  }
  throw new Error('Timed out waiting for storefront media attributes.');
}

async function main() {
  for (const [key, fallback] of attributes) await ensureAttribute(key, fallback);
  await waitForAttributes();
  console.log(`ImageKit storefront media fields are ready in ${settingsCollectionId}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
