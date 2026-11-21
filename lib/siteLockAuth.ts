import { createHmac, timingSafeEqual } from 'crypto';

export const SITE_LOCK_COOKIE = 'storefront_site_lock_bypass';
export const SITE_LOCK_SESSION_SECONDS = 20 * 60;

function getSessionSecret() {
  return process.env.SITE_LOCK_SESSION_SECRET || process.env.APPWRITE_API_KEY || '';
}

export function createSiteLockToken(password: string) {
  const secret = getSessionSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(`site-lock:${password}`).digest('hex');
}

export function isValidSiteLockToken(token: string | undefined, password: string) {
  const expected = createSiteLockToken(password);
  if (!token || !expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function passwordsMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  return inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);
}
