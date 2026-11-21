import { NextRequest, NextResponse } from 'next/server';
import { getSiteLockSettings } from '@/lib/siteLockSettings';
import { isValidSiteLockToken, SITE_LOCK_COOKIE } from '@/lib/siteLockAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const unlocked = (authorized = false) => NextResponse.json(
  { isLocked: false, unlockAt: null, authorized },
  { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
);

function isLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1' || normalized.endsWith('.localhost');
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production' || isLocalHostname(request.nextUrl.hostname)) {
    return unlocked(true);
  }

  try {
    const settings = await getSiteLockSettings();

    const configuredLocked = typeof settings.isLocked === 'string'
      ? settings.isLocked === 'true'
      : Boolean(settings.isLocked);
    const unlockAt = settings.unlockAt || null;
    const unlockTime = unlockAt ? new Date(unlockAt).getTime() : null;
    const timerExpired = unlockTime !== null && Number.isFinite(unlockTime) && Date.now() >= unlockTime;

    if (!configuredLocked || timerExpired) return unlocked(false);

    const password = String(settings.lockPassword || 'shealteredherego');
    const authorized = isValidSiteLockToken(request.cookies.get(SITE_LOCK_COOKIE)?.value, password);
    if (authorized) return unlocked(true);

    return NextResponse.json(
      { isLocked: true, unlockAt, authorized: false },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  } catch (error: any) {
    if (error?.code !== 404) console.error('Site lock check failed:', error);
    return unlocked(false);
  }
}
