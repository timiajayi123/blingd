import { NextResponse } from "next/server";
import { getStorefrontMedia } from "@/lib/storefrontMedia";

export async function GET() {
  const media = await getStorefrontMedia();
  return NextResponse.json({ cartBackgroundUrl: media.cartBackgroundUrl }, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
}
