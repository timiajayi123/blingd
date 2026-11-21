import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "storefront_admin_session";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SITE_LOCK_SESSION_SECRET ||
    process.env.APPWRITE_API_KEY ||
    ""
  );
}

function signTimestamp(timestamp: string) {
  const secret = getSessionSecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(`storefront-admin:${timestamp}`)
    .digest("hex");
}

export function createAdminSessionToken() {
  const timestamp = Date.now().toString();
  const signature = signTimestamp(timestamp);
  return signature ? `${timestamp}.${signature}` : null;
}

export function isValidAdminSessionToken(token?: string | null) {
  if (!token) return false;
  const [timestamp, suppliedSignature] = token.split(".");
  if (!timestamp || !suppliedSignature) return false;

  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > ADMIN_SESSION_SECONDS * 1000) return false;
  if (issuedAt > Date.now() + 60_000) return false;

  const expectedSignature = signTimestamp(timestamp);
  if (!expectedSignature || expectedSignature.length !== suppliedSignature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(suppliedSignature)
  );
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const item of cookieHeader.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return null;
}

export function isAdminRequest(request: Request) {
  return isValidAdminSessionToken(readCookie(request, ADMIN_SESSION_COOKIE));
}

export function secretsMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  return (
    inputBuffer.length === expectedBuffer.length &&
    timingSafeEqual(inputBuffer, expectedBuffer)
  );
}
