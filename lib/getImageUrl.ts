export const getImageUrl = (fileId: string) => {
  if (!fileId) return '/placeholder.svg';

  const value = String(fileId).replace(/[`'"]/g, '').trim();
  if (!value) return '/placeholder.svg';

  // Appwrite view URLs can fail in the browser when the bucket is private. Route
  // them through our server proxy, exactly like products that store only a file ID.
  const appwriteFileMatch = value.match(/\/storage\/buckets\/[^/]+\/files\/([^/?]+)\/(?:view|preview|download)/i);
  if (appwriteFileMatch?.[1]) return `/api/image/${encodeURIComponent(appwriteFileMatch[1])}`;

  if (value.startsWith('http') || value.startsWith('/') || value.startsWith('data:')) return value;

  return `/api/image/${encodeURIComponent(value)}`;
};
