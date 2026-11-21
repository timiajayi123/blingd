import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { isAdminRequest } from '@/lib/adminAuth';
import { serverStorage } from '@/lib/serverAppwrite';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
type ImageKitAsset = { fileId: string; name: string; filePath: string; url: string; thumbnail?: string; fileType?: string; size?: number; createdAt?: string };
const buckets: Record<string, string> = {
  media: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || 'storefront_media',
  proofs: process.env.APPWRITE_ORDER_PROOF_BUCKET_ID || 'storefront_order_proofs',
};
function imageKitHeaders() {
  if (!process.env.IMAGEKIT_PRIVATE_KEY) throw new Error('ImageKit is not configured.');
  return { Authorization: `Basic ${Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}` };
}
async function imageKit(path: string, method = 'GET') {
  const response = await fetch(`https://api.imagekit.io/v1/${path}`, { method, headers: imageKitHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error(`ImageKit request failed (${response.status}).`);
  return response.status === 204 ? null : response.json();
}
function ownImageKitPath(path: unknown) {
  return typeof path === 'string' && path.toLowerCase().startsWith('/storefront/');
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  const params = new URL(request.url).searchParams;
  const source = params.get('source') || 'imagekit';
  const offset = Math.max(0, Math.min(100000, Number(params.get('offset')) || 0));
  const limit = 100;
  try {
    if (source === 'imagekit') {
      const query = new URLSearchParams({ type: 'file', limit: String(limit), skip: String(offset) });
      const assets = await imageKit(`files?${query}`);
      if (!Array.isArray(assets)) throw new Error('Unexpected ImageKit response.');
      return NextResponse.json({ files: (assets as ImageKitAsset[]).filter((f) => ownImageKitPath(f.filePath)).map((f) => ({ id: f.fileId, name: f.name, path: f.filePath, url: f.url, thumbnail: f.thumbnail, type: f.fileType, size: f.size, createdAt: f.createdAt })), hasMore: assets.length === limit, nextOffset: offset + limit }, { headers });
    }
    const bucket = source === 'media' || source === 'proofs' ? buckets[source] : undefined;
    if (!bucket) return NextResponse.json({ error: 'Unknown storage source.' }, { status: 400, headers });
    const result = await serverStorage.listFiles(bucket, [Query.limit(limit), Query.offset(offset)]);
    return NextResponse.json({ files: result.files.map((f) => ({ id: f.$id, name: f.name, path: bucket, type: f.mimeType, size: f.sizeOriginal, createdAt: f.$createdAt, url: `/api/admin/storage/file?source=${encodeURIComponent(source)}&id=${encodeURIComponent(f.$id)}` })), hasMore: offset + result.files.length < result.total, nextOffset: offset + limit }, { headers });
  } catch (error: unknown) {
    console.error('Storage list failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load storage.' }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  const { source, id } = await request.json().catch(() => ({}));
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return NextResponse.json({ error: 'Invalid file ID.' }, { status: 400, headers });
  try {
    if (source === 'imagekit') {
      const details = await imageKit(`files/${encodeURIComponent(id)}/details`);
      if (!ownImageKitPath(details?.filePath)) return NextResponse.json({ error: 'This file is outside BLING’D storage.' }, { status: 403, headers });
      await imageKit(`files/${encodeURIComponent(id)}`, 'DELETE');
    } else {
      const bucket = source === 'media' || source === 'proofs' ? buckets[source] : undefined;
      if (!bucket) return NextResponse.json({ error: 'Unknown storage source.' }, { status: 400, headers });
      await serverStorage.deleteFile(bucket, id);
    }
    return NextResponse.json({ deleted: true }, { headers });
  } catch (error: unknown) {
    console.error('Storage deletion failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete file.' }, { status: 503, headers });
  }
}
