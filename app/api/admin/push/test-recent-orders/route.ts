import { Query } from 'node-appwrite';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { sendAdminPushToEndpoint } from '@/lib/adminPush';
import { parseOrderPayload } from '@/lib/orderPayload';
import { serverDatabase } from '@/lib/serverAppwrite';
import { Config } from '@/lib/appwriteConfig';

export const runtime = 'nodejs';

const SPECTRUM_DROP_NAME = 'spectrum';

function orderProductSummary(items: any[]) {
  return items
    .map((item: any) => `${Math.max(1, Number(item?.quantity) || 1)} × ${String(item?.name || 'Product').trim()}`)
    .filter(Boolean)
    .join(', ')
    .slice(0, 120) || 'Order item';
}

async function listAll(collectionId: string) {
  const documents: any[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const page = await serverDatabase.listDocuments(Config.databaseId, collectionId, [Query.limit(limit), Query.offset(offset)]);
    documents.push(...page.documents);
    offset += page.documents.length;
    if (!page.documents.length || documents.length >= page.total) return documents;
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : '';
    if (!endpoint) {
      return NextResponse.json({ error: 'Push notifications must be enabled on this device before replaying orders.' }, { status: 400 });
    }

    const [orders, products, drops] = await Promise.all([
      listAll(Config.ordersCollectionId),
      listAll(Config.productsCollectionId),
      listAll(Config.dropsCollectionId),
    ]);
    const spectrumDrop = drops.find((drop: any) => String(drop?.name || '').trim().toLowerCase() === SPECTRUM_DROP_NAME);
    if (!spectrumDrop) {
      return NextResponse.json({ error: 'The Spectrum drop could not be found.' }, { status: 404 });
    }
    const spectrumDropId = String(spectrumDrop.$id);
    const spectrumProductIds = new Set(products
      .filter((product: any) => String(product?.dropId || '') === spectrumDropId)
      .map((product: any) => String(product.$id)));
    const results = orders
      .map((order: any) => {
        const { lineItems } = parseOrderPayload(order.items);
        const spectrumItems = lineItems.filter((item: any) => {
          const productId = String(item?.$id || item?.productId || item?.id || '');
          return String(item?.dropId || '') === spectrumDropId || spectrumProductIds.has(productId);
        });
        return { order, spectrumItems };
      })
      .filter(({ spectrumItems }) => spectrumItems.length > 0)
      .sort(({ order: left }, { order: right }) => String(right.$createdAt || '').localeCompare(String(left.$createdAt || '')));

    if (!results.length) {
      return NextResponse.json({ error: 'There are no Spectrum drop orders available to replay.' }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;
    for (const { order, spectrumItems } of results) {
      const amount = Math.max(0, Number(order.total || 0));
      const customerName = String(order.userName || order.email || 'Customer').trim();
      const productSummary = orderProductSummary(spectrumItems);
      const orderId = String(order.$id);

      const orderAlert = await sendAdminPushToEndpoint({
        title: 'New order',
        body: `${productSummary} purchased · ₦${amount.toLocaleString()}`,
        url: '/admin/orders',
        tag: `storefront-order-preview-${orderId}`,
        renotify: true,
      }, endpoint);
      const paymentAlert = await sendAdminPushToEndpoint({
        title: 'Payment received 🎉',
        body: `₦${amount.toLocaleString()} received from ${customerName}.`,
        url: '/admin/orders',
        tag: `storefront-payment-preview-${orderId}`,
        renotify: true,
      }, endpoint);
      sent += orderAlert.sent + paymentAlert.sent;
      failed += orderAlert.failed + paymentAlert.failed;
    }

    return NextResponse.json({
      success: true,
      drop: spectrumDrop.name,
      orders: results.length,
      notifications: results.length * 2,
      sent,
      failed,
      deviceOnly: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not replay recent-order notifications.' }, { status: 500 });
  }
}
