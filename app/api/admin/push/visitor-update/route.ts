import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { sendTodayVercelVisitorUpdate } from "@/lib/visitorMilestones";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await sendTodayVercelVisitorUpdate();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not send today’s visitor update." },
      { status: 500 },
    );
  }
}
