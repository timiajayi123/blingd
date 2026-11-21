import { NextRequest, NextResponse } from 'next/server';
import { releaseInventoryReservation, reserveInventory } from '@/lib/inventoryReservation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { action, reference, items } = await request.json();
    if (action === 'release') {
      return NextResponse.json(await releaseInventoryReservation(reference));
    }
    if (action !== 'reserve' || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid inventory reservation request.' }, { status: 400 });
    }
    return NextResponse.json(await reserveInventory(reference, items));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not reserve inventory.' },
      { status: error?.statusCode || 500 }
    );
  }
}
