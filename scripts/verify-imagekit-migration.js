const { loadEnvConfig } = require('@next/env');
const { Client, Databases, Query } = require('node-appwrite');
const fs = require('fs/promises');
const path = require('path');

loadEnvConfig(process.cwd());

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const settingsCollectionId = process.env.APPWRITE_SETTINGS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID || 'storefront_settings';
const productsCollectionId = process.env.APPWRITE_PRODUCT_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID || 'storefront_products';
const expectedEndpoint = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '/placeholder.svg').replace(/\/$/, '');

if (!projectId || !apiKey || !databaseId) throw new Error('Appwrite server configuration is incomplete.');

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

function productImages(product) {
  const value = product.images ?? product.Images ?? [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [value];
  } catch {
    return [value];
  }
}

async function main() {
  const settings = await databases.getDocument(databaseId, settingsCollectionId, 'global_settings');
  const products = await databases.listDocuments(databaseId, productsCollectionId, [Query.limit(100)]);
  const urls = products.documents.flatMap(productImages);
  const manifest = JSON.parse(await fs.readFile(path.join(process.cwd(), 'lib', 'imagekit-manifest.json'), 'utf8'));
  const keyUrls = [settings.homeVideoUrl, settings.shopVideoUrl, manifest['/placeholder.svg'], manifest['/placeholder.svg']];

  const checks = [];
  for (const url of keyUrls) {
    const response = await fetch(url, { method: 'HEAD' });
    checks.push({ url, status: response.status, contentType: response.headers.get('content-type') });
  }

  const report = {
    manifestAssets: Object.keys(manifest).length,
    products: products.total,
    totalProductImages: urls.length,
    imageKitProductImages: urls.filter((url) => url.startsWith(expectedEndpoint)).length,
    homeVideoUrl: settings.homeVideoUrl,
    shopVideoUrl: settings.shopVideoUrl,
    checks,
  };

  const failures = checks.filter((check) => check.status < 200 || check.status >= 400);
  if (!String(settings.homeVideoUrl).startsWith(expectedEndpoint) || !String(settings.shopVideoUrl).startsWith(expectedEndpoint)) {
    throw new Error('Storefront video settings do not point to the configured ImageKit endpoint.');
  }
  if (report.imageKitProductImages !== report.totalProductImages) {
    throw new Error(`Only ${report.imageKitProductImages}/${report.totalProductImages} product images use ImageKit.`);
  }
  if (failures.length) throw new Error(`CDN checks failed: ${JSON.stringify(failures)}`);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
