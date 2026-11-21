import { createHmac, timingSafeEqual } from 'crypto';

const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
function secret() {
  const value = process.env.ORDER_TRACKING_SECRET || process.env.APPWRITE_API_KEY;
  if (!value) throw new Error('Order tracking is not configured');
  return value;
}
function signature(orderId: string, expires: string) {
  return createHmac('sha256', secret()).update(`storefront-order-tracking:v1:${orderId}:${expires}`).digest('hex');
}
export function createOrderTrackingToken(orderId: string) {
  const expires = String(Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS);
  return `${expires}.${signature(orderId, expires)}`;
}
export function isValidOrderTrackingToken(orderId: string, token: string | null) {
  if (!token || !/^\d{10}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, supplied] = token.split('.');
  const now = Math.floor(Date.now() / 1000);
  if (Number(expires) <= now || Number(expires) > now + MAX_AGE_SECONDS) return false;
  try {
    return timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(signature(orderId, expires), 'hex'));
  } catch { return false; }
}
export function orderTrackingUrl(orderId: string) {
  // Fragment credentials are not sent in navigation requests or Referer headers.
  return `https://example.com/track-order?orderId=${encodeURIComponent(orderId)}#token=${createOrderTrackingToken(orderId)}`;
}
