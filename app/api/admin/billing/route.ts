import { NextResponse } from "next/server";
import { getBillingPrincipal } from "@/lib/billingAuth";
import { getBillingServices } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!getBillingPrincipal(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getBillingServices();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    console.error("Billing list failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load billing services" },
      { status: 500 },
    );
  }
}
