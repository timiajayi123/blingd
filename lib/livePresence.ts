import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { Query } from "node-appwrite";
import { Config } from "@/lib/appwriteConfig";
import { serverDatabase } from "@/lib/serverAppwrite";

export const LIVE_PRESENCE_COOKIE = "storefront_live_presence";
export const LIVE_PRESENCE_SECONDS = 60 * 60 * 24 * 30;
export const LIVE_PRESENCE_WINDOW_SECONDS = 2 * 60;
function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

function getPresenceSecret() {
  return (
    process.env.PRESENCE_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SITE_LOCK_SESSION_SECRET ||
    process.env.APPWRITE_API_KEY ||
    ""
  );
}

function signSessionId(sessionId: string) {
  const secret = getPresenceSecret();
  return secret
    ? createHmac("sha256", secret)
        .update(`storefront-live-presence:${sessionId}`)
        .digest("hex")
    : "";
}

export function createLivePresenceToken() {
  const sessionId = randomUUID();
  const signature = signSessionId(sessionId);
  return signature ? `${sessionId}.${signature}` : null;
}

export function readLivePresenceSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LIVE_PRESENCE_COOKIE}=`));
  const token = cookie?.slice(LIVE_PRESENCE_COOKIE.length + 1);
  if (!token) return null;

  let decodedToken: string;
  try {
    decodedToken = decodeURIComponent(token);
  } catch {
    return null;
  }
  const [sessionId, suppliedSignature] = decodedToken.split(".");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId || "") || !/^[0-9a-f]{64}$/i.test(suppliedSignature || "")) return null;

  const expectedSignature = signSessionId(sessionId);
  if (
    !expectedSignature ||
    expectedSignature.length !== suppliedSignature.length
  ) {
    return null;
  }

  return timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(suppliedSignature),
  )
    ? sessionId
    : null;
}

export async function recordLivePresence(sessionId: string) {
  const now = new Date().toISOString();
  try {
    await serverDatabase.updateDocument(
      Config.databaseId,
      Config.sessionsCollectionId,
      sessionId,
      { lastActive: now, isActive: "true" },
    );
  } catch (error: unknown) {
    if (errorCode(error) !== 404) throw error;
    try {
      await serverDatabase.createDocument(
        Config.databaseId,
        Config.sessionsCollectionId,
        sessionId,
        {
          userId: sessionId,
          startTime: now,
          lastActive: now,
          isActive: "true",
        },
      );
    } catch (createError: unknown) {
      if (errorCode(createError) !== 409) throw createError;
      await serverDatabase.updateDocument(
        Config.databaseId,
        Config.sessionsCollectionId,
        sessionId,
        { lastActive: now, isActive: "true" },
      );
    }
  }
}

export async function countOnlineVisitors() {
  const activeSince = new Date(
    Date.now() - LIVE_PRESENCE_WINDOW_SECONDS * 1000,
  ).toISOString();
  const result = await serverDatabase.listDocuments(
    Config.databaseId,
    Config.sessionsCollectionId,
    [
      Query.greaterThan("lastActive", activeSince),
      Query.equal("isActive", "true"),
      Query.limit(1),
    ],
  );
  return result.total;
}
