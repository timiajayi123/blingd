const { Client, Databases } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_BILLING_COLLECTION_ID || 'storefront_billing_services';

if (!projectId || !apiKey || !databaseId) {
  throw new Error('Missing Appwrite project, API key, or database environment variables.');
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureCollection() {
  try {
    await databases.getCollection(databaseId, collectionId);
  } catch (error) {
    if (error.code !== 404) throw error;
    // No public permissions: all billing access stays server-side through authenticated routes.
    await databases.createCollection(databaseId, collectionId, 'STOREFRONT BILLING SERVICES', [], false, true);
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

async function waitForAttributes(expectedCount) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await databases.listAttributes(databaseId, collectionId);
    if (result.attributes.length >= expectedCount && result.attributes.every((attribute) => attribute.status === 'available')) return;
    if (result.attributes.some((attribute) => attribute.status === 'failed')) throw new Error('An Appwrite billing attribute failed to build.');
    await sleep(1000);
  }
  throw new Error('Timed out waiting for billing attributes.');
}

async function createDefaultService(service) {
  try {
    await databases.getDocument(databaseId, collectionId, service);
  } catch (error) {
    if (error.code !== 404) throw error;
    await databases.createDocument(databaseId, collectionId, service, {
      service,
      plan: 'free',
      note: '',
      managedBy: 'local',
      lastReminder7Day: '',
      lastReminder3Day: '',
      lastReminder1Day: '',
      lastExpiryReminder: '',
    });
  }
}

async function main() {
  await ensureCollection();
  await ensureAttribute('service', () => databases.createEnumAttribute(databaseId, collectionId, 'service', ['appwrite', 'vercel'], true));
  await ensureAttribute('plan', () => databases.createEnumAttribute(databaseId, collectionId, 'plan', ['free', 'pro'], false, 'free'));
  await ensureAttribute('startDate', () => databases.createDatetimeAttribute(databaseId, collectionId, 'startDate', false));
  await ensureAttribute('monthlyPrice', () => databases.createFloatAttribute(databaseId, collectionId, 'monthlyPrice', false, 0, 1000000000));
  await ensureAttribute('note', () => databases.createStringAttribute(databaseId, collectionId, 'note', 2000, false, ''));
  await ensureAttribute('managedBy', () => databases.createEnumAttribute(databaseId, collectionId, 'managedBy', ['local', 'timzi-hub'], false, 'local'));
  await ensureAttribute('lastReminder7Day', () => databases.createStringAttribute(databaseId, collectionId, 'lastReminder7Day', 64, false, ''));
  await ensureAttribute('lastReminder3Day', () => databases.createStringAttribute(databaseId, collectionId, 'lastReminder3Day', 64, false, ''));
  await ensureAttribute('lastReminder1Day', () => databases.createStringAttribute(databaseId, collectionId, 'lastReminder1Day', 64, false, ''));
  await ensureAttribute('lastExpiryReminder', () => databases.createStringAttribute(databaseId, collectionId, 'lastExpiryReminder', 64, false, ''));
  await waitForAttributes(10);
  await createDefaultService('appwrite');
  await createDefaultService('vercel');
  console.log(`Billing ready: Appwrite and Vercel services created in ${collectionId}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
