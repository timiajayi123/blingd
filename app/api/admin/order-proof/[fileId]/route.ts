import { Client, Storage } from 'node-appwrite';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';

const BUCKET_ID = process.env.APPWRITE_ORDER_PROOF_BUCKET_ID || 'storefront_order_proofs';
const storage = new Storage(
  new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT || 'unconfigured_source_project')
    .setKey(process.env.APPWRITE_API_KEY || '')
);

export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { fileId } = await params;
    const [file, content] = await Promise.all([
      storage.getFile(BUCKET_ID, fileId),
      storage.getFileDownload(BUCKET_ID, fileId),
    ]);
    return new NextResponse(content, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${file.name.replace(/["\\]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Payment proof was not found.' }, { status: 404 });
  }
}
