import { NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
import { Config } from '@/lib/appwriteConfig';

// Use server-side Appwrite client to ensure we can list documents reliably
function getServerDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || Config.endpoint)
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT || Config.projectId || '')
    .setKey(process.env.APPWRITE_API_KEY || '');
  return new Databases(client);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = (body.code || '').toString().trim();

    if (!code) {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 });
    }

    const collectionId = process.env.APPWRITE_COUPONS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID || Config.couponsCollectionId;
    console.log('[coupons/validate] code=', code, 'collectionId=', collectionId);
    if (!collectionId) {
      console.error('Coupons collection ID not configured');
      return NextResponse.json({ success: false, error: 'Coupon configuration missing' }, { status: 500 });
    }

    const databases = getServerDatabases();

    const res = await databases.listDocuments(process.env.APPWRITE_DATABASE_ID || Config.databaseId, collectionId);
    console.log('[coupons/validate] documents found=', (res.documents || []).length);

    const found = (res.documents || []).find((d: any) => (d.code || '').toString().toLowerCase() === code.toLowerCase());

    if (!found) {
      console.warn('[coupons/validate] coupon not found for code=', code);
      return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 404 });
    }

    console.log('[coupons/validate] found coupon id=', found.$id, 'used=', found.used, 'limit=', found.limit, 'expiresAt=', found.expiresAt);

    if (found.active === false) {
      return NextResponse.json({ success: false, error: 'Coupon is not active' }, { status: 400 });
    }

    const used = Number(found.used ?? 0);
    const limit = Number(found.limit ?? 0);
    if (limit > 0 && used >= limit) {
      return NextResponse.json({ success: false, error: 'Coupon has reached its usage limit' }, { status: 400 });
    }

    if (found.expiresAt) {
      const expires = new Date(found.expiresAt);
      if (isNaN(expires.getTime()) === false && expires < new Date()) {
        return NextResponse.json({ success: false, error: 'Coupon has expired' }, { status: 400 });
      }
    }

    // Return coupon details (do not increment uses yet)
    const coupon = {
      id: found.$id,
      code: found.code,
      discountPercent: Number(found.discountPercent ?? 0),
      used,
      limit,
      expiresAt: found.expiresAt || null,
      active: Boolean(found.active !== false),
    };

    // Also return raw doc for debugging
    return NextResponse.json({ success: true, coupon, raw: found });
  } catch (err) {
    console.error('Coupon validate error', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
