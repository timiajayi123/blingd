import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { serverStorage } from '@/lib/serverAppwrite';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return new Response('Unauthorized', { status: 401 });
  const query = new URL(request.url).searchParams;
  const source = query.get('source');
  const id = query.get('id');
  const bucket = source === 'media' ? (process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || 'storefront_media') : source === 'proofs' ? (process.env.APPWRITE_ORDER_PROOF_BUCKET_ID || 'storefront_order_proofs') : null;
  if (!bucket || !id || !/^[A-Za-z0-9_-]{1,36}$/.test(id)) return new Response('Invalid file', { status: 400 });
  try {
    const file = await serverStorage.getFile(bucket, id);
    const bytes = await serverStorage.getFileView(bucket, id);
    const safeInline = /^(image\/(png|jpeg|webp|gif|avif)|video\/(mp4|webm))$/i.test(file.mimeType || '');
    return new Response(bytes, { headers: { 'Content-Type': safeInline ? file.mimeType : 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': safeInline ? 'inline' : 'attachment' } });
  } catch {
    return NextResponse.json({ error: 'Could not load file.' }, { status: 503 });
  }
}
