const VIDEO_EXTENSION = /\.(?:mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i;

export function isVideoUrl(value: string) {
  return VIDEO_EXTENSION.test(value);
}

/**
 * ImageKit automatically optimizes video requests, even when no explicit
 * transformation is present. orig-true serves the stored original and avoids
 * generating a processed video variant (and the associated VPU usage).
 */
export function getOriginalVideoUrl(value: string) {
  if (!value || !isVideoUrl(value)) return value;

  try {
    const url = new URL(value, "https://example.com");
    if (url.hostname.toLowerCase() !== "ik.imagekit.io") return value;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return value;

    const account = segments.shift()!;
    const withoutTransforms = segments.filter((segment) => !segment.startsWith("tr:"));
    url.pathname = `/${account}/tr:orig-true/${withoutTransforms.join("/")}`;
    url.searchParams.delete("tr");
    return url.toString();
  } catch {
    return value;
  }
}
