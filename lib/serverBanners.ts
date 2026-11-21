import { unstable_cache } from 'next/cache';
import { serverDatabase } from '@/lib/serverAppwrite';
import { DATABASE_ID, BANNERS_COLLECTION_ID, mapBannerDocuments } from '@/lib/api';
import { Query } from 'node-appwrite';

// Only the public presentation fields from the mapper leave the server.
export const getServerBanners = unstable_cache(async () => {
  const result = await serverDatabase.listDocuments(DATABASE_ID, BANNERS_COLLECTION_ID, [Query.limit(100)]);
  return mapBannerDocuments(result.documents);
}, ['gallery-banners'], { revalidate: 15 * 60, tags: ['storefront-media'] });
