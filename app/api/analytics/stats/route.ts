import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getVercelAnalyticsDashboard } from "@/lib/vercelAnalytics";

export async function GET(request: Request) {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const requestedRange = searchParams.get("range") || "24h";
    const range = ["24h", "7d", "30d"].includes(requestedRange)
      ? requestedRange
      : "24h";
    return NextResponse.json(await getVercelAnalyticsDashboard(range));
  } catch (error: any) {
    console.error("Vercel Analytics API error:", error);
    return NextResponse.json(
      { error: error?.message || "Could not load Vercel Analytics." },
      { status: 503 },
    );
  }
}
