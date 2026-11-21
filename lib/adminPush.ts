import { ID, Query } from 'node-appwrite';
import webpush from 'web-push';
import { serverDatabase } from '@/lib/serverAppwrite';

const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'unconfigured_source_database';
const collectionId = process.env.APPWRITE_ADMIN_PUSH_COLLECTION_ID || 'storefront_admin_push_subscriptions';
const defaultIcon = '/placeholder.svg';

type PushPayload = {
  title: string;
  body: string;
  url: string;
  icon?: string;
  badge?: string;
  tag?: string;
  renotify?: boolean;
};

type StoredSubscription = {
  $id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  active?: boolean;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  const subject = process.env.VAPID_EMAIL || '';
  if (!publicKey || !privateKey || !subject) throw new Error('Web Push is not configured. Add the VAPID environment variables.');
  return { publicKey, privateKey, subject };
}

function getWebPush() {
  const { publicKey, privateKey, subject } = getVapidConfig();
  webpush.setVapidDetails(subject.startsWith('mailto:') ? subject : `mailto:${subject}`, publicKey, privateKey);
  return webpush;
}

function normalizeSubscription(subscription: unknown) {
  const input = subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = typeof input?.endpoint === 'string' ? input.endpoint.trim() : '';
  const p256dh = typeof input?.keys?.p256dh === 'string' ? input.keys.p256dh.trim() : '';
  const auth = typeof input?.keys?.auth === 'string' ? input.keys.auth.trim() : '';
  if (!endpoint.startsWith('https://') || endpoint.length > 512 || !p256dh || !auth) throw new Error('Invalid push subscription.');
  return { endpoint, p256dh, auth };
}

export async function saveAdminPushSubscription(subscription: unknown, userAgent?: unknown) {
  const normalized = normalizeSubscription(subscription);
  const safeUserAgent = typeof userAgent === 'string' ? userAgent.slice(0, 1024) : '';
  const existing = await serverDatabase.listDocuments(databaseId, collectionId, [Query.equal('endpoint', normalized.endpoint), Query.limit(1)]);
  const data = { ...normalized, active: true, userAgent: safeUserAgent, adminUserId: '' };
  if (existing.documents[0]) {
    const updated = await serverDatabase.updateDocument(databaseId, collectionId, existing.documents[0].$id, data);
    return { id: updated.$id, created: false };
  }
  const created = await serverDatabase.createDocument(databaseId, collectionId, ID.unique(), data);
  return { id: created.$id, created: true };
}

export async function removeAdminPushSubscription(endpoint: unknown) {
  const value = typeof endpoint === 'string' ? endpoint.trim() : '';
  if (!value) throw new Error('A subscription endpoint is required.');
  const existing = await serverDatabase.listDocuments(databaseId, collectionId, [Query.equal('endpoint', value), Query.limit(1)]);
  if (existing.documents[0]) await serverDatabase.deleteDocument(databaseId, collectionId, existing.documents[0].$id);
}

async function sendPushToSubscriptions(payload: PushPayload, subscriptions: StoredSubscription[]) {
  const notifier = getWebPush();
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url.startsWith('/') ? payload.url : '/admin',
    icon: payload.icon || defaultIcon,
    badge: payload.badge || defaultIcon,
    tag: payload.tag,
    renotify: payload.renotify,
  });

  let sent = 0;
  let removed = 0;
  let failed = 0;
  for (const document of subscriptions) {
    try {
      await notifier.sendNotification({ endpoint: document.endpoint, keys: { p256dh: document.p256dh, auth: document.auth } }, message);
      sent += 1;
    } catch (error: any) {
      const statusCode = Number(error?.statusCode || error?.status);
      if (statusCode === 404 || statusCode === 410) {
        await serverDatabase.deleteDocument(databaseId, collectionId, document.$id).catch(() => null);
        removed += 1;
      } else {
        failed += 1;
        console.error('Admin push delivery failed:', { statusCode: error?.statusCode, message: error?.message });
      }
    }
  }
  return { sent, removed, failed, total: subscriptions.length };
}

export async function sendAdminPush(payload: PushPayload) {
  const subscriptions: StoredSubscription[] = [];
  let cursor: string | undefined;
  do {
    const page = await serverDatabase.listDocuments(databaseId, collectionId, [
      Query.equal('active', true),
      Query.limit(100),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    subscriptions.push(...(page.documents as unknown as StoredSubscription[]));
    cursor = page.documents.length === 100 ? page.documents[page.documents.length - 1].$id : undefined;
  } while (cursor);

  return sendPushToSubscriptions(payload, subscriptions);
}

export async function sendAdminPushToEndpoint(payload: PushPayload, endpoint: unknown) {
  const value = typeof endpoint === 'string' ? endpoint.trim() : '';
  if (!value.startsWith('https://') || value.length > 512) throw new Error('A valid device subscription is required.');

  const page = await serverDatabase.listDocuments(databaseId, collectionId, [
    Query.equal('endpoint', value),
    Query.equal('active', true),
    Query.limit(1),
  ]);
  return sendPushToSubscriptions(payload, page.documents as unknown as StoredSubscription[]);
}
