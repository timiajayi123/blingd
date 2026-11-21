import manifest from "@/lib/imagekit-manifest.json";
import { getOriginalVideoUrl } from "@/lib/videoDelivery";

const imageKitManifest = manifest as Record<string, string>;

export function getPublicMediaUrl(path: string) {
  return getOriginalVideoUrl(imageKitManifest[path] || path);
}
