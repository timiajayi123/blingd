import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { removeAdminPushSubscription, saveAdminPushSubscription } from '@/lib/adminPush';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const result = await saveAdminPushSubscription(body.subscription, body.userAgent);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not save this push subscription.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    await removeAdminPushSubscription(body.endpoint);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not remove this push subscription.' }, { status: 400 });
  }
}
