import { unstable_cache } from 'next/cache';
import { Config } from '@/lib/appwriteConfig';
import { serverDatabase } from '@/lib/serverAppwrite';

// Cache settings only; authorization and timer expiry stay per request.
export const getSiteLockSettings = unstable_cache(
  () => serverDatabase.getDocument(Config.databaseId, Config.settingsCollectionId, 'global_settings'),
  ['site-lock-settings'],
  { revalidate: 15, tags: ['storefront-media'] },
);
