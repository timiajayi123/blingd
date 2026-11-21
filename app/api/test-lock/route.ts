import { NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
import { Config } from '@/lib/appwriteConfig';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    console.log('🔍 Testing site lock settings...');
    console.log('Config:', {
      endpoint: Config.endpoint,
      projectId: Config.projectId,
      databaseId: Config.databaseId,
    });

    const client = new Client()
      .setEndpoint(Config.endpoint)
      .setProject(Config.projectId)
      .setKey(process.env.APPWRITE_API_KEY || '');

    const databases = new Databases(client);
    const settings = await databases.getDocument(
      Config.databaseId,
      'storefront_settings',
      'global_settings'
    );


    const isLocked = typeof settings.isLocked === 'string'
      ? settings.isLocked === 'true'
      : Boolean(settings.isLocked);

    return NextResponse.json({
      success: true,
      unlockAt: settings.unlockAt || null,
      isLocked,
    });
  } catch (error) {
    console.error('❌ Test lock check failed:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
