import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
import { Config } from '@/lib/appwriteConfig';
import { createSiteLockToken, passwordsMatch, SITE_LOCK_COOKIE, SITE_LOCK_SESSION_SECONDS } from '@/lib/siteLockAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { password = '' } = await request.json();
    const client = new Client()
      .setEndpoint(Config.endpoint)
      .setProject(Config.projectId)
      .setKey(process.env.APPWRITE_API_KEY || '');
    const databases = new Databases(client);
    const settings: any = await databases.getDocument(
      Config.databaseId,
      Config.settingsCollectionId,
      'global_settings'
    );
    const expectedPassword = String(settings.lockPassword || 'shealteredherego');

    if (!passwordsMatch(String(password), expectedPassword)) {
      return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
    }

    const token = createSiteLockToken(expectedPassword);
    if (!token) {
      return NextResponse.json({ error: 'Site lock session is not configured' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SITE_LOCK_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SITE_LOCK_SESSION_SECONDS,
    });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Site lock unlock failed:', error);
    return NextResponse.json({ error: 'Could not verify passcode' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SITE_LOCK_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
