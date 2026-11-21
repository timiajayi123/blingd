import { Client, ID, Storage } from 'node-appwrite';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';

const BUCKET_ID = process.env.APPWRITE_ORDER_PROOF_BUCKET_ID || 'storefront_order_proofs';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const storage = new Storage(
  new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT || 'unconfigured_source_project')
    .setKey(process.env.APPWRITE_API_KEY || '')
);

export async function POST(request: Request) {
  try {
    if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a payment proof file.' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or PDF file.' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Payment proof must be 10 MB or smaller.' }, { status: 400 });

    const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), file);
    return NextResponse.json({ fileId: uploaded.$id, fileName: uploaded.name });
  } catch (error: any) {
    console.error('Manual order proof upload failed:', error);
    return NextResponse.json({ error: error?.message || 'Could not upload payment proof.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const fileId = new URL(request.url).searchParams.get('fileId');
    if (!fileId) return NextResponse.json({ error: 'Missing file ID.' }, { status: 400 });
    await storage.deleteFile(BUCKET_ID, fileId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not remove payment proof.' }, { status: 500 });
  }
}
