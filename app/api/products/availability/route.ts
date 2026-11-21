import { NextResponse } from 'next/server';
import { validateCartAgainstAppwrite } from '@/lib/cartValidation';

export async function POST(request: Request) {
  try {
    const { productIds, items } = await request.json();
    const cartItems = Array.isArray(items)
      ? items
      : (Array.isArray(productIds) ? productIds : []).map((productId) => ({ productId, quantity: 1 }));
    if (!cartItems.length) return NextResponse.json({ available: true, products: [], issues: [], unavailable: [], priceChanges: [] });

    return NextResponse.json(await validateCartAgainstAppwrite(cartItems));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Could not validate products' }, { status: 500 });
  }
}
