import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { loadStorefrontWaitlist } from "@/lib/storefrontWaitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await loadStorefrontWaitlist(), {
      headers: { "Cache-Control": "private, max-age=0, must-revalidate" },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load the BLING’D waitlist.",
      },
      { status: 500 },
    );
  }
}
