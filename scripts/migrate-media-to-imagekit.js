const { loadEnvConfig } = require('@next/env');
const { Client, Databases, Query, Storage } = require('node-appwrite');
const fs = require('fs/promises');
const path = require('path');

loadEnvConfig(process.cwd());

const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '/placeholder.svg').replace(/\/$/, '');
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const productsCollectionId = process.env.APPWRITE_PRODUCT_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID || 'storefront_products';
const categoriesCollectionId = process.env.APPWRITE_CATEGORIES_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID || 'storefront_categories';
const bannersCollectionId = process.env.APPWRITE_BANNERS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_BANNERS_COLLECTION_ID || 'storefront_banners';
const settingsCollectionId = process.env.APPWRITE_SETTINGS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID || 'storefront_settings';
const bucketId = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || 'storefront_media';

if (!privateKey) throw new Error('IMAGEKIT_PRIVATE_KEY is required. Keep it server-only.');
if (!projectId || !apiKey || !databaseId) throw new Error('Appwrite server configuration is incomplete.');

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const storage = new Storage(client);
const publicDirectory = path.join(process.cwd(), 'public');
const manifestPath = path.join(process.cwd(), 'lib', 'imagekit-manifest.json');
const mediaExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.mov', '.mp4', '.png', '.svg', '.webm', '.webp']);
const uploadedBySource = new Map();

function mimeType(fileName) {
  return {
    '.avif': 'image/avif', '.gif': 'image/gif', '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg', '.mov': 'video/quicktime', '.mp4': 'video/mp4',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.webm': 'video/webm',
    '.webp': 'image/webp',
  }[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
}

function safeName(value, fallback) {
  const cleaned = String(value || '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

async function uploadToImageKit({ source, fileName, folder, contentType }) {
  const cacheKey = typeof source === 'string' ? source : `${folder}/${fileName}`;
  if (uploadedBySource.has(cacheKey)) return uploadedBySource.get(cacheKey);

  const body = new FormData();
  if (typeof source === 'string') body.append('file', source);
  else body.append('file', new Blob([source], { type: contentType }), fileName);
  body.append('fileName', safeName(fileName, 'asset'));
  body.append('folder', folder);
  body.append('useUniqueFileName', 'false');
  body.append('overwriteFile', 'true');
  body.append('tags', 'storefront,migrated');

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}` },
    body,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`ImageKit upload failed for ${fileName}: ${result.message || response.statusText}`);
  uploadedBySource.set(cacheKey, result);
  return result;
}

async function listLocalMedia(directory = publicDirectory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listLocalMedia(fullPath));
    else if (mediaExtensions.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

async function migratePublicMedia() {
  let manifest = {};
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}

  const uploadedFiles = {};
  for (const fullPath of await listLocalMedia()) {
    const relative = path.relative(publicDirectory, fullPath).replace(/\\/g, '/');
    const publicPath = `/${relative}`;
    const directory = path.posix.dirname(relative);
    const result = await uploadToImageKit({
      source: await fs.readFile(fullPath),
      fileName: path.basename(relative),
      folder: `/storefront/public/${directory === '.' ? '' : directory}`,
      contentType: mimeType(relative),
    });
    manifest[publicPath] = result.url;
    uploadedFiles[publicPath] = result;
    console.log(`Public: ${publicPath} -> ${result.url}`);
  }
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { manifest, uploadedFiles };
}

function parseImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch {}
  return [value];
}

function appwriteFileId(value) {
  const match = String(value).match(/\/storage\/buckets\/[^/]+\/files\/([^/?]+)\/(?:view|preview|download)/i);
  if (match) return match[1];
  if (!/^https?:/i.test(value) && !value.startsWith('/')) return value;
  return null;
}

async function migrateStoredAsset(value, folder, fileName, manifest) {
  if (!value || value.includes('ik.imagekit.io')) return value;
  if (value.startsWith('/')) return manifest[value] || value;

  const fileId = appwriteFileId(value);
  if (fileId) {
    const file = await storage.getFile(bucketId, fileId);
    const download = await storage.getFileDownload(bucketId, fileId);
    const result = await uploadToImageKit({
      source: Buffer.from(download),
      fileName: safeName(file.name || fileName, fileName),
      folder,
      contentType: file.mimeType || mimeType(file.name || fileName),
    });
    return result.url;
  }

  if (/^https:\/\//i.test(value)) {
    const result = await uploadToImageKit({ source: value, fileName, folder });
    return result.url;
  }
  return value;
}

async function listAllDocuments(collectionId) {
  const documents = [];
  for (let offset = 0; ; offset += 100) {
    const result = await databases.listDocuments(databaseId, collectionId, [Query.limit(100), Query.offset(offset)]);
    documents.push(...result.documents);
    if (result.documents.length < 100) break;
  }
  return documents;
}

async function migrateProducts(manifest) {
  const products = await listAllDocuments(productsCollectionId);
  let changed = 0;
  for (const product of products) {
    const key = product.images !== undefined ? 'images' : product.Images !== undefined ? 'Images' : null;
    if (!key) continue;
    const images = parseImages(product[key]);
    const migrated = [];
    for (let index = 0; index < images.length; index += 1) {
      migrated.push(await migrateStoredAsset(
        images[index],
        `/storefront/products/${safeName(product.$id, 'product')}`,
        `${index + 1}-${safeName(product.name || product.Name, 'product')}.jpg`,
        manifest
      ));
    }
    if (JSON.stringify(images) !== JSON.stringify(migrated)) {
      await databases.updateDocument(databaseId, productsCollectionId, product.$id, { [key]: migrated });
      changed += 1;
    }
  }
  console.log(`Products migrated: ${changed}/${products.length}`);
}

async function migrateCategories(manifest) {
  const categories = await listAllDocuments(categoriesCollectionId);
  let changed = 0;
  for (const category of categories) {
    if (!category.sizeGuide) continue;
    const migrated = await migrateStoredAsset(
      String(category.sizeGuide),
      `/storefront/categories/${safeName(category.$id, 'category')}`,
      `${safeName(category.name, 'size-guide')}.jpg`,
      manifest
    );
    if (migrated !== category.sizeGuide) {
      await databases.updateDocument(databaseId, categoriesCollectionId, category.$id, { sizeGuide: migrated });
      changed += 1;
    }
  }
  console.log(`Category assets migrated: ${changed}/${categories.length}`);
}

async function migrateBanners(manifest) {
  let banners;
  try {
    banners = await listAllDocuments(bannersCollectionId);
  } catch (error) {
    if (error.code === 404) {
      console.log(`Banner collection ${bannersCollectionId} does not exist; skipping.`);
      return;
    }
    throw error;
  }

  const singleFields = ['image', 'videoUrl', 'video', 'VIDEO', 'video_url', 'fileId'];
  let changed = 0;
  for (const banner of banners) {
    const data = {};
    for (const field of singleFields) {
      if (typeof banner[field] !== 'string' || !banner[field]) continue;
      data[field] = await migrateStoredAsset(
        banner[field],
        `/storefront/banners/${safeName(banner.$id, 'banner')}`,
        `${safeName(banner.title, field)}-${field}`,
        manifest
      );
    }

    if (Array.isArray(banner.fileIds)) {
      data.fileIds = [];
      for (let index = 0; index < banner.fileIds.length; index += 1) {
        data.fileIds.push(await migrateStoredAsset(
          String(banner.fileIds[index]),
          `/storefront/banners/${safeName(banner.$id, 'banner')}`,
          `${index + 1}-${safeName(banner.title, 'banner')}.jpg`,
          manifest
        ));
      }
    }

    if (typeof banner.link === 'string' && (/storage\/buckets/i.test(banner.link) || /\.(avif|gif|jpe?g|mov|mp4|png|svg|webm|webp)(\?|$)/i.test(banner.link))) {
      data.link = await migrateStoredAsset(
        banner.link,
        `/storefront/banners/${safeName(banner.$id, 'banner')}`,
        `${safeName(banner.title, 'banner')}-linked-asset`,
        manifest
      );
    }

    const changedData = Object.fromEntries(
      Object.entries(data).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(banner[key]))
    );
    if (Object.keys(changedData).length) {
      await databases.updateDocument(databaseId, bannersCollectionId, banner.$id, changedData);
      changed += 1;
    }
  }
  console.log(`Banner assets migrated: ${changed}/${banners.length}`);
}

async function updateStorefrontMedia(publicUploads) {
  const home = publicUploads['/placeholder.svg'];
  const shop = publicUploads[''];
  const data = {};
  if (home) Object.assign(data, { homeVideoUrl: home.url, homeVideoFileId: home.fileId });
  if (shop) Object.assign(data, { shopVideoUrl: shop.url, shopVideoFileId: shop.fileId });
  if (Object.keys(data).length) {
    await databases.updateDocument(databaseId, settingsCollectionId, 'global_settings', data);
  }
}

async function main() {
  console.log(`Migrating media to ${urlEndpoint} ...`);
  const { manifest, uploadedFiles } = await migratePublicMedia();
  await updateStorefrontMedia(uploadedFiles);
  await migrateProducts(manifest);
  await migrateCategories(manifest);
  await migrateBanners(manifest);
  console.log('ImageKit media migration complete. Existing Appwrite files were not deleted.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
