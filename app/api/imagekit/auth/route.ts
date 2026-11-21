import { getUploadAuthParams } from "@imagekit/next/server";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey =
    process.env.IMAGEKIT_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
    "public_3o/4m11Q8utD4MyuROab3xwHSmk=";

  if (!privateKey || !publicKey) {
    return NextResponse.json(
      { error: "ImageKit keys are not configured on the server" },
      { status: 503 }
    );
  }

  const auth = getUploadAuthParams({
    privateKey,
    publicKey,
    expire: Math.floor(Date.now() / 1000) + 10 * 60,
  });

  return NextResponse.json({ ...auth, publicKey });
}
