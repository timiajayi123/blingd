import { NextResponse } from "next/server";
import { isBillingCronRequest } from "@/lib/billingAuth";
import { runBillingRenewalReminders } from "@/lib/billingReminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isBillingCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runBillingRenewalReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    console.error("Billing renewal reminder run failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Reminder run failed" },
      { status: 500 },
    );
  }
}
