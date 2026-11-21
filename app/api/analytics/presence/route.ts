import { NextResponse } from "next/server";
import {
  createLivePresenceToken,
  LIVE_PRESENCE_COOKIE,
  LIVE_PRESENCE_SECONDS,
  readLivePresenceSession,
  recordLivePresence,
} from "@/lib/livePresence";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const existingSession = readLivePresenceSession(request);
  const token = existingSession ? null : createLivePresenceToken();
  const sessionId = existingSession || token?.split(".")[0];
  if (!sessionId) {
    return NextResponse.json(
      { error: "Live presence is not configured." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  try {
    await recordLivePresence(sessionId);
    const response = NextResponse.json({ recorded: true }, { headers: NO_STORE_HEADERS });
    if (token) response.cookies.set(LIVE_PRESENCE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: LIVE_PRESENCE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("Live presence update failed:", error);
    return NextResponse.json(
      { error: "Could not update live presence." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
