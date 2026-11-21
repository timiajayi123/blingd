const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_ACTIVITY_COLLECTION_ID || "useractivity";

if (!projectId || !databaseId || !apiKey) {
  console.error("Missing APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID/NEXT_PUBLIC_APPWRITE_DATABASE_ID, or APPWRITE_API_KEY");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function appwriteFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(data.message || `Appwrite request failed: ${response.status}`);
    error.status = response.status;
    error.type = data.type;
    error.data = data;
    throw error;
  }

  return data;
}

async function ensureCollection() {
  const collectionUrl = `${endpoint}/databases/${databaseId}/collections/${collectionId}`;

  try {
    const collection = await appwriteFetch(collectionUrl);
    console.log(`Collection exists: ${collection.$id}`);
    return;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const created = await appwriteFetch(`${endpoint}/databases/${databaseId}/collections`, {
    method: "POST",
    body: JSON.stringify({
      collectionId,
      name: "User Activity",
      permissions: [],
      documentSecurity: false,
      enabled: true,
    }),
  });

  console.log(`Created collection: ${created.$id}`);
}

async function ensureStringAttribute(key, size, required = false) {
  const attributesUrl = `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes`;
  const attributeUrl = `${attributesUrl}/${key}`;

  try {
    const attribute = await appwriteFetch(attributeUrl);
    console.log(`Attribute exists: ${attribute.key}`);
    return;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const created = await appwriteFetch(`${attributesUrl}/string`, {
    method: "POST",
    body: JSON.stringify({
      key,
      size,
      required,
      array: false,
    }),
  });

  console.log(`Created attribute: ${created.key}`);
}

async function main() {
  console.log("Setting up Appwrite activity collection", {
    endpoint,
    projectId,
    databaseId,
    collectionId,
  });

  await ensureCollection();
  await ensureStringAttribute("type", 20, true);
  await ensureStringAttribute("productId", 50);
  await ensureStringAttribute("cart", 8000);
  await ensureStringAttribute("userId", 50);

  console.log("Activity collection setup complete.");
}

main().catch((error) => {
  console.error("Activity collection setup failed:", {
    message: error.message,
    status: error.status,
    type: error.type,
    data: error.data,
  });
  process.exit(1);
});
