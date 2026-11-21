import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { sendAdminPush } from '@/lib/adminPush';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await sendAdminPush({
      title: 'BLING’D Admin',
      body: 'Push notifications are working!',
      url: '/admin',
      tag: 'storefront-admin-test',
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not send a test notification.' }, { status: 500 });
  }
}
