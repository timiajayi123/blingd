import { isAdminRequest, secretsMatch } from "@/lib/adminAuth";

export type BillingPrincipal = "local" | "timzi-hub";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export function getBillingPrincipal(request: Request): BillingPrincipal | null {
  if (isAdminRequest(request)) return "local";

  const expected = process.env.TIMZI_HUB_API_KEY || "";
  const supplied = bearerToken(request);
  if (expected && supplied && secretsMatch(supplied, expected)) return "timzi-hub";
  return null;
}

export function isBillingCronRequest(request: Request) {
  if (isAdminRequest(request)) return true;
  const expected = process.env.CRON_SECRET || "";
  const supplied = bearerToken(request);
  return Boolean(expected && supplied && secretsMatch(supplied, expected));
}
