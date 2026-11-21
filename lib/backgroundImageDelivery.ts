const IMAGEKIT_HOST = "ik.imagekit.io";
const BACKGROUND_WIDTH = 2000;

/**
 * ImageKit blocks direct delivery of source images above 25 megapixels.
 * A bounded delivery transform keeps the background sharp on large screens
 * while allowing those originals to render successfully.
 */
export function getBackgroundImageUrl(value: string) {
  if (!value) return value;

  try {
    const url = new URL(value, "https://example.com");
    if (url.hostname.toLowerCase() !== IMAGEKIT_HOST) return value;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return value;

    const account = segments.shift()!;
    const sourcePath = segments.filter((segment) => !segment.startsWith("tr:"));
    url.pathname = `/${account}/tr:w-${BACKGROUND_WIDTH},f-auto/${sourcePath.join("/")}`;
    url.searchParams.delete("tr");
    return url.toString();
  } catch {
    return value;
  }
}
