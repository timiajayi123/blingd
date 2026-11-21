#!/usr/bin/env node
/**
 * migrate-release.js
 * Backfill and flip relased flag based on releaseAt timestamp for products in Appwrite
 * Usage: node scripts/migrate-release.js
 * Requires env vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_KEY
 */

const { Client, Databases } = require('@appwrite/sdk');

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_KEY);

const db = new Databases(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.APPWRITE_PRODUCTS_COLLECTION_ID;

async function run() {
  if (!DATABASE_ID || !COLLECTION_ID) {
    console.error('Missing APPWRITE_DATABASE_ID or APPWRITE_PRODUCTS_COLLECTION_ID env vars');
    process.exit(1);
  }

  const limit = 100;
  let offset = 0;
  let totalUpdated = 0;

  while (true) {
    const res = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
      // Appwrite SDK v8: databases.listDocuments signature differs across versions; adapt as needed
      // We'll use 'offset' and 'limit' if supported
    ]);

    // Fallback if SDK variant returns structured object differently
    const docs = res.documents || res.documents || [];
    if (!docs || docs.length === 0) break;

    for (const doc of docs) {
      const rel = doc.relased ?? doc.released ?? false;
      const releaseAt = doc.releaseAt ? new Date(doc.releaseAt) : null;
      const countdownEnabled = typeof doc.countdownEnabled === 'undefined' ? true : !!doc.countdownEnabled;
      const shouldRelease = !rel && countdownEnabled && releaseAt && releaseAt.getTime() <= Date.now();

      const updates = {};
      if (shouldRelease) updates.relased = true;
      if (typeof doc.countdownEnabled === 'undefined') updates.countdownEnabled = true;

      if (Object.keys(updates).length > 0) {
        await db.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, updates);
        totalUpdated++;
        console.log('Updated:', doc.$id, updates);
      }
    }

    if (docs.length < limit) break;
    offset += limit;
  }

  console.log('Migration complete. Updated', totalUpdated);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});