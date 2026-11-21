import { NextResponse } from "next/server";
import { checkVercelVisitorMilestone } from "@/lib/visitorMilestones";

export async function POST() {
  try {
    return NextResponse.json(await checkVercelVisitorMilestone());
  } catch (error: any) {
    console.error("Vercel visitor milestone check failed:", error);
    return NextResponse.json(
      { error: error?.message || "Visitor milestone check failed." },
      { status: 503 },
    );
  }
}
