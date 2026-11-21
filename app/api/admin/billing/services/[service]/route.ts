import { NextResponse } from "next/server";
import { getBillingPrincipal } from "@/lib/billingAuth";
import {
  BillingManager,
  BillingPlan,
  isBillingServiceId,
  updateBillingService,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

function normalizeStartDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Enter a valid purchase/start date");
  return parsed.toISOString();
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ service: string }> },
) {
  const principal = getBillingPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { service } = await context.params;
  if (!isBillingServiceId(service)) {
    return NextResponse.json({ error: "Unsupported billing service" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const plan: BillingPlan | null = body.plan === "pro" ? "pro" : body.plan === "free" ? "free" : null;
    if (!plan) throw new Error("Plan must be free or pro");

    const startDate = normalizeStartDate(body.startDate);
    if (plan === "pro" && !startDate) throw new Error("A purchase/start date is required for Pro");

    let monthlyPrice: number | null = null;
    if (body.monthlyPrice !== undefined && body.monthlyPrice !== null && body.monthlyPrice !== "") {
      monthlyPrice = Number(body.monthlyPrice);
      if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
        throw new Error("Monthly price must be zero or greater");
      }
    }

    const managedBy: BillingManager = principal === "timzi-hub"
      ? body.managedBy === "local" ? "local" : "timzi-hub"
      : "local";
    const updated = await updateBillingService(service, {
      plan,
      startDate,
      monthlyPrice,
      note: typeof body.note === "string" ? body.note : "",
      managedBy,
    });

    return NextResponse.json({ service: updated });
  } catch (error: unknown) {
    console.error(`Billing update failed for ${service}:`, error);
    const message = error instanceof Error ? error.message : "Could not update billing service";
    const notConfigured = message.toLowerCase().includes("collection") || message.toLowerCase().includes("not found");
    return NextResponse.json({ error: message }, { status: notConfigured ? 503 : 400 });
  }
}
