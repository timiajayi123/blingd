import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import {
  isLiveAdminTestEmail,
  isLocalTestEmail,
} from "@/lib/paystackMode";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const testModeAllowed =
    isLocalTestEmail(email) ||
    (isLiveAdminTestEmail(email) && isAdminRequest(request));

  return NextResponse.json(
    { mode: testModeAllowed ? "test" : "live" },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
