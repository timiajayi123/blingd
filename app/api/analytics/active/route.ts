import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { countOnlineVisitors } from "@/lib/livePresence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request))
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );

  try {
    return NextResponse.json(
      { activeUsers: await countOnlineVisitors() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: unknown) {
    console.error("Live online visitor count failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load active visitors." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
