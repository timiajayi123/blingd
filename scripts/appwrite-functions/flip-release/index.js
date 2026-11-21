// Appwrite Function: flip-release
// Node.js logic to find products with releaseAt <= now and set 'relased' to true.
// Install dependencies: @appwrite/sdk

const { Client, Databases } = require('@appwrite/sdk');

module.exports = async function (req, res) {
  try {
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const project = process.env.APPWRITE_PROJECT;
    const key = process.env.APPWRITE_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_PRODUCTS_COLLECTION_ID;

    if (!endpoint || !project || !key) throw new Error('Missing Appwrite env vars');

    const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
    const db = new Databases(client);

    const limit = 100;
    let offset = 0;
    let totalUpdated = 0;

    while (true) {
      const response = await db.listDocuments(databaseId, collectionId, [
        // adjust pagination flags for your Appwrite SDK version as needed
      ]);
      const docs = response.documents || [];
      if (docs.length === 0) break;

      for (const doc of docs) {
        const rel = doc.relased ?? doc.released ?? false;
        const releaseAt = doc.releaseAt ? new Date(doc.releaseAt) : null;
        const countdownEnabled = typeof doc.countdownEnabled === 'undefined' ? true : !!doc.countdownEnabled;
        const shouldRelease = !rel && countdownEnabled && releaseAt && releaseAt.getTime() <= Date.now();

        const updates = {};
        if (shouldRelease) updates.relased = true;
        if (typeof doc.countdownEnabled === 'undefined') updates.countdownEnabled = true;

        if (Object.keys(updates).length > 0) {
          await db.updateDocument(databaseId, collectionId, doc.$id, updates);
          totalUpdated++;
        }
      }

      if (docs.length < limit) break;
      offset += limit;
    }

    console.log('Flip-release finished. Updated:', totalUpdated);
    return res.json({ ok: true, updated: totalUpdated });
  } catch (err) {
    console.error('flip-release error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};