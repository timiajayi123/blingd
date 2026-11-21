import { Account, Client, Query } from 'node-appwrite';
import { NextResponse } from 'next/server';
import { serverDatabase } from '@/lib/serverAppwrite';
import { orderTrackingUrl } from '@/lib/orderTracking';

export async function GET(request: Request) {
  const jwt = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!jwt) return NextResponse.json({ error: 'Sign in to view orders.' }, { status: 401 });
  let user;
  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || 'unconfigured_source_project')
      .setJWT(jwt);
    user = await new Account(client).get();
  } catch {
    return NextResponse.json({ error: 'Sign in to view orders.' }, { status: 401 });
  }
  if (!user.emailVerification) return NextResponse.json({ error: 'Verify your account email to view order history, or use your private tracking link.' }, { status: 403 });
  try {
    const limit = new URL(request.url).searchParams.get('limit') === '1' ? 1 : 25;
    const orders = await serverDatabase.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'unconfigured_source_database',
      process.env.NEXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID || 'storefront_orders',
      [Query.equal('email', user.email.trim().toLowerCase()), Query.orderDesc('$createdAt'), Query.limit(limit)],
    );
    return NextResponse.json({ total: orders.total, documents: orders.documents.map((order) => ({
      $id: order.$id, $createdAt: order.$createdAt, items: order.items,
      total: order.total, address: order.address, phone: order.phone,
      status: order.status, trackingUrl: orderTrackingUrl(order.$id),
    })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Order history is temporarily unavailable.' }, { status: 503 });
  }
}
