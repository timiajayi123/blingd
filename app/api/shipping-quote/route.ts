import { NextResponse } from "next/server";
import { validateCartAgainstAppwrite } from "@/lib/cartValidation";
import {
  calculateInternationalShipping,
  isInternationalCountry,
} from "@/lib/internationalShipping";

export async function POST(request: Request) {
  try {
    const { country, items } = await request.json();
    const destination = String(country || "").toUpperCase();
    const cartItems = Array.isArray(items) ? items : [];

    if (!isInternationalCountry(destination)) {
      return NextResponse.json(
        { error: "Shipping is not configured for this destination." },
        { status: 400 },
      );
    }

    const validation = await validateCartAgainstAppwrite(cartItems, {
      checkStock: false,
      checkDrop: false,
    });
    if (!validation.available) {
      return NextResponse.json(
        { error: "One or more products could not be found." },
        { status: 409 },
      );
    }

    const products = new Map(
      validation.products.map((product) => [product.productId, product]),
    );
    const weightedItems = cartItems.map((item: any) => ({
      shippingWeightGrams: products.get(String(item.$id || item.productId))
        ?.shippingWeightGrams,
      quantity: Number(item.quantity || 1),
    }));

    return NextResponse.json(
      calculateInternationalShipping(destination, weightedItems),
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Could not calculate shipping." },
      { status: 500 },
    );
  }
}
