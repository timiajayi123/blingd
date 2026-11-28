import { unstable_cache } from "next/cache";
import { Config } from "@/lib/appwriteConfig";
import { serverDatabase } from "@/lib/serverAppwrite";
import { getPublicMediaUrl } from "@/lib/publicMedia";
import { getOriginalVideoUrl } from "@/lib/videoDelivery";
import { getBackgroundImageUrl } from "@/lib/backgroundImageDelivery";

export type StorefrontMedia = {
  homeBackgroundType: "video" | "image";
  homeVideoUrl: string;
  homeVideoFileId: string;
  homePosterUrl: string;
  homeImageUrl: string;
  shopBackgroundType: "video" | "image";
  shopVideoUrl: string;
  shopVideoFileId: string;
  shopPosterUrl: string;
  shopImageUrl: string;
  cartBackgroundUrl: string;
  shopHeaderUrl: string;
};

export const DEFAULT_STOREFRONT_MEDIA: StorefrontMedia = {
  homeBackgroundType: "video",
  homeVideoUrl: getPublicMediaUrl("/placeholder.svg"),
  homeVideoFileId: "",
  homePosterUrl: "",
  homeImageUrl: "",
  shopBackgroundType: "video",
  shopVideoUrl: getPublicMediaUrl(""),
  shopVideoFileId: "",
  shopPosterUrl: "",
  shopImageUrl: "",
  cartBackgroundUrl: getPublicMediaUrl("/placeholder.svg"),
  shopHeaderUrl: getPublicMediaUrl("/placeholder.svg"),
};

const BACKGROUND_IMAGE_STATE_PREFIX = "storefront-background-image:";

function readBackgroundImageState(value: unknown) {
  if (typeof value !== "string" || !value.startsWith(BACKGROUND_IMAGE_STATE_PREFIX)) {
    return { backgroundType: "video" as const, imageUrl: "", cartImageUrl: "", headerImageUrl: "", posterUrl: cleanUrl(value) };
  }

  try {
    const data = JSON.parse(value.slice(BACKGROUND_IMAGE_STATE_PREFIX.length));
    return {
      backgroundType: data?.backgroundType === "image" ? "image" as const : "video" as const,
      imageUrl: getBackgroundImageUrl(cleanUrl(data?.imageUrl)),
      cartImageUrl: getBackgroundImageUrl(cleanUrl(data?.cartImageUrl)),
      headerImageUrl: getBackgroundImageUrl(cleanUrl(data?.headerImageUrl)),
      posterUrl: "",
    };
  } catch {
    return { backgroundType: "video" as const, imageUrl: "", cartImageUrl: "", headerImageUrl: "", posterUrl: "" };
  }
}

function cleanUrl(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[`'\"]/g, "").trim();
  if (!cleaned) return fallback;
  if (cleaned.startsWith("/") || /^https:\/\//i.test(cleaned)) return getOriginalVideoUrl(cleaned);
  return fallback;
}

const readStorefrontMedia = async (): Promise<StorefrontMedia> => {
  try {
    const settings = await serverDatabase.getDocument(
      Config.databaseId,
      Config.settingsCollectionId,
      "global_settings"
    );

    const homeImageState = readBackgroundImageState(settings.homePosterUrl);
    const shopImageState = readBackgroundImageState(settings.shopPosterUrl);

    return {
      homeBackgroundType: homeImageState.backgroundType,
      homeVideoUrl: cleanUrl(
        settings.homeVideoUrl,
        DEFAULT_STOREFRONT_MEDIA.homeVideoUrl
      ),
      homeVideoFileId: cleanUrl(settings.homeVideoFileId),
      homePosterUrl: homeImageState.posterUrl,
      homeImageUrl: homeImageState.imageUrl,
      shopBackgroundType: shopImageState.backgroundType,
      shopVideoUrl: cleanUrl(
        settings.shopVideoUrl,
        DEFAULT_STOREFRONT_MEDIA.shopVideoUrl
      ),
      shopVideoFileId: cleanUrl(settings.shopVideoFileId),
      shopPosterUrl: shopImageState.posterUrl,
      shopImageUrl: shopImageState.imageUrl,
      cartBackgroundUrl: homeImageState.cartImageUrl || DEFAULT_STOREFRONT_MEDIA.cartBackgroundUrl,
      shopHeaderUrl: shopImageState.headerImageUrl || DEFAULT_STOREFRONT_MEDIA.shopHeaderUrl,
    };
  } catch (error) {
    console.error("Storefront media lookup failed; using local fallbacks:", error);
    return DEFAULT_STOREFRONT_MEDIA;
  }
};

export const getStorefrontMedia = unstable_cache(
  readStorefrontMedia,
  ["storefront-storefront-media"],
  { revalidate: 15 * 60, tags: ["storefront-media"] }
);
