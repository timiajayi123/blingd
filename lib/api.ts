import { Product } from "@/app/types/Product";
import { Client, Databases, Query, Storage, Account, ID } from "appwrite";
import { filterProductsByLiveDrops } from "@/lib/dropAvailability";
import { getImageUrl } from "@/lib/getImageUrl";
import { getOriginalVideoUrl } from "@/lib/videoDelivery";

// ==========================
// 🔹 Appwrite Client
// ==========================
const PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT || "unconfigured_source_project";
const ENDPOINT = (
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://fra.cloud.appwrite.io/v1"
).replace(/\/v1$/, "");

const client = new Client()
  .setEndpoint(ENDPOINT + "/v1")
  .setProject(PROJECT_ID);

// Do not make health-check requests merely by importing the storefront SDK.

// ==========================
// 🔹 Exports
// ==========================
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// ✅ Generic Retry Helper for Client-Side Appwrite Calls
export async function retryAppwrite<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isNetworkError =
      err.code === "EAI_AGAIN" ||
      err.message?.includes("fetch failed") ||
      err.message?.includes("getaddrinfo") ||
      err.message?.includes("ECONNRESET") ||
      err.message?.includes("ETIMEDOUT") ||
      (err.name === "TypeError" && err.message === "Failed to fetch"); // common browser network error

    if (retries > 0 && isNetworkError) {
      console.warn(
        `[api] Network error, retrying in ${delay}ms... (${retries} retries left)`,
        err.message,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryAppwrite(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

// ==========================
// 🔹 IDs
// ==========================
export const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "unconfigured_source_database";
export const ORDERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID || "storefront_orders";
export const BANNERS_COLLECTION_ID = "storefront_banners";
export const SIDEADS_COLLECTION_ID = "sideads";
export const BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "storefront_media";
export const CATEGORIES_COLLECTION_ID = "storefront_categories";
export const REVIEWS_COLLECTION_ID = "reviews";
export const PRODUCTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID || "storefront_products";
export const SETTINGS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID ||
  "storefront_settings";
export const DROPS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DROPS_COLLECTION_ID || "storefront_drops";

// ==========================
// 🔹 Orders
// ==========================
export async function getOrders() {
  try {
    const res = await retryAppwrite(() =>
      databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [
        Query.orderDesc("$createdAt"),
      ]),
    );
    return res.documents;
  } catch (error) {
    console.error("❌ Failed to fetch orders:", error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  try {
    return await retryAppwrite(() =>
      databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION_ID, orderId, {
        status: newStatus,
      }),
    );
  } catch (error) {
    console.error("❌ Failed to update status:", error);
    return null;
  }
}

// ==========================
// 🔹 File Helpers
// ==========================
const sanitizeImageString = (s: string) => {
  try {
    const u = new URL(s);
    // Remove admin-only mode param which requires auth
    u.searchParams.delete("mode");
    return u.toString();
  } catch (err) {
    return s;
  }
};

// Return a public view URL for a stored file (avoid SDK-admin redirects)
export const getFileUrl = (fileId: string) => {
  if (!fileId || typeof fileId !== "string") return "";

  // 1. Full cleanup: strip backticks, quotes, and whitespace
  let cleanId = fileId.replace(/[`'"]/g, "").trim();

  // 2. If it's already a full URL (including potential backticks/quotes removed above)
  if (/^https?:\/\//i.test(cleanId)) {
    return getImageUrl(cleanId.replace(/[\?&]mode=admin/, ""));
  }

  // 3. If it's a relative Appwrite path (starts with /v1)
  if (cleanId.startsWith("/v1")) {
    const endpointBase = ENDPOINT.replace(/\/v1$/, "");
    let url = `${endpointBase}${cleanId}`;
    url = url.replace(/[\?&]mode=admin/, "");
    if (!url.includes("project=")) {
      url += (url.includes("?") ? "&" : "?") + `project=${PROJECT_ID}`;
    }
    return url;
  }

  // 4. If it's just a file ID, build the URL using our internal proxy
  const url = `/api/image/${cleanId}`;
  console.log(`🖼️ Final Generated Image URL for [${cleanId}]:`, url);
  return url;
};

// ==========================
// 🔹 Banners
// ==========================
export async function getBanners() {
  try {
    const res = await retryAppwrite(() =>
      databases.listDocuments(DATABASE_ID, BANNERS_COLLECTION_ID),
    );
    console.log(
      `🛠️ Successfully fetched [${res.documents.length}] banner documents.`,
    );

    return mapBannerDocuments(res.documents);
  } catch (err) {
    console.error("Failed to fetch banners from Appwrite.", err);
    return [];
  }
}

export function mapBannerDocuments(documents: any[]) {
  return documents.map((doc: any) => {
    // 1. Collect and aggressively clean all potential image sources
    const cleanString = (s: any) =>
      typeof s === "string" ? s.replace(/[`'"]/g, "").trim() : "";

    let sources =
      Array.isArray(doc.fileIds) && doc.fileIds.length > 0
        ? doc.fileIds.map(cleanString)
        : doc.fileId
          ? [cleanString(doc.fileId)]
          : doc.image
            ? [cleanString(doc.image)]
            : [];

    // 2. Special Case: User puts the URL in the 'link' field instead of fileId
    const cleanLink = cleanString(doc.link);
    let linkIsSeparateSource = false;

    if (cleanLink.includes("/storage/buckets/")) {
      // Try to extract a clean file ID from the URL if it's an Appwrite URL
      const match = cleanLink.match(/\/files\/([^\/\?]+)/);
      const linkFileId = match ? match[1] : cleanLink;

      // If sources already has a different ID, then the link is a separate asset (likely a video)
      if (sources.length > 0 && !sources.includes(linkFileId)) {
        linkIsSeparateSource = true;
      }

      if (sources.length === 0) {
        sources = [linkFileId];
      }
    }

    const images = sources
      .filter(Boolean)
      .map((src: string) => getFileUrl(src));
    const image = images[0] || "";
    const rawType = (doc.type ?? doc.TYPE ?? "").toLowerCase();

    // Determine if it's a video based on type or file extension
    const isVideoType = rawType === "video" || rawType === "motion";

    // Ensure videoUrl is a full URL if it's a file ID
    // Check multiple possible field names for video (videoUrl, video, VIDEO, video_url)
    let videoUrl =
      doc.videoUrl || doc.video || doc.VIDEO || doc.video_url || "";

    // If videoUrl is empty but the 'link' field contains an Appwrite file URL,
    // check if it's a video.
    const isAppwriteMedia =
      cleanLink.includes("/storage/buckets/") && cleanLink.includes("/files/");
    const hasImageExtension = /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(
      cleanLink,
    );
    const hasVideoExtension = /\.(mp4|webm|ogg|mov|m4v)$/i.test(cleanLink);

    if (!videoUrl && isAppwriteMedia) {
      // We treat it as a video if:
      // 1. It has an explicit video extension
      // 2. OR it's marked as a video/motion type
      // 3. OR it's a separate source from the thumbnail AND doesn't have an image extension
      if (
        hasVideoExtension ||
        isVideoType ||
        (linkIsSeparateSource && !hasImageExtension)
      ) {
        console.log(
          `🎥 Detected video source in 'link' field for [${doc.title || doc.$id}]`,
        );
        videoUrl = cleanLink;
      }
    }

    if (
      videoUrl &&
      !videoUrl.includes("://") &&
      !videoUrl.startsWith("data:")
    ) {
      console.log(`🎥 Converting video file ID [${videoUrl}] to full URL...`);
      videoUrl = getFileUrl(videoUrl);
    }

    // Final URL cleanup: ensure no mode=admin remains in videoUrl
    if (videoUrl) {
      videoUrl = getOriginalVideoUrl(videoUrl.replace(/[\?&]mode=admin/, ""));
    }

    // Final Conflict Resolution:
    // If videoUrl is the same as the primary image, ONLY keep it as a video if
    // it's explicitly confirmed via type or extension. Otherwise, it's heart-brokenly an image.
    if (videoUrl === image && !hasVideoExtension && !isVideoType) {
      videoUrl = "";
    }

    const type =
      rawType === "photodump" || rawType === "album" || rawType === "gallery"
        ? "photoDump"
        : "single";

    const bannerData = {
      id: doc.$id,
      title: doc.title || "Banner",
      link: cleanLink,
      image,
      images,
      type,
      videoUrl,
    };

    console.log(`✅ Final Banner Data for [${doc.$id}]:`, {
      title: bannerData.title,
      type: bannerData.type,
      hasImage: !!bannerData.image,
      hasVideo: !!bannerData.videoUrl,
      videoUrl: bannerData.videoUrl,
    });

    return bannerData;
  });
}

// ==========================
// 🔹 Side Ads
// ==========================
export async function getSideAds() {
  try {
    const res = await retryAppwrite(() =>
      databases.listDocuments(DATABASE_ID, SIDEADS_COLLECTION_ID),
    );
    return res.documents.map((doc: any) => ({
      id: doc.$id,
      title: doc.title,
      link: doc.link,
      position: doc.position,
      image: getFileUrl(doc.fileId),
    }));
  } catch (err) {
    console.error("❌ Error fetching side ads:", err);
    return [];
  }
}
export async function getCategories() {
  try {
    const res = await retryAppwrite(() =>
      databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION_ID, [
        Query.orderAsc("order"),
      ]),
    );

    return res.documents;
  } catch (error) {
    console.error("❌ Failed to fetch categories:", error);
    return [];
  }
}

export async function getProductReviews(productId: string) {
  try {
    const res = await retryAppwrite(() =>
      databases.listDocuments(DATABASE_ID, REVIEWS_COLLECTION_ID, [
        Query.equal("productId", productId),
        Query.orderDesc("$createdAt"),
      ]),
    );
    return res.documents.map((doc: any) => ({
      id: doc.$id,
      productId: doc.productId,
      rating: doc.rating,
      comment: doc.comment,
      name: doc.name,
      createdAt: doc.$createdAt,
    }));
  } catch (error) {
    console.error("❌ Failed to fetch reviews:", error);
    return [];
  }
}

export async function createProductReview(input: {
  productId: string;
  rating: number;
  comment: string;
  name?: string;
}) {
  try {
    const payload: any = {
      productId: input.productId,
      rating: input.rating,
      comment: input.comment,
    };
    if (input.name) payload.name = input.name;
    const doc = await retryAppwrite(() =>
      databases.createDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        ID.unique(),
        payload,
      ),
    );
    return {
      id: doc.$id,
      productId: doc.productId,
      rating: doc.rating,
      comment: doc.comment,
      name: doc.name,
      createdAt: doc.$createdAt,
    };
  } catch (error) {
    console.error("❌ Failed to create review:", error);
    throw error;
  }
}

export async function getAllProducts(
  options: { includeInactiveDrops?: boolean } = {},
): Promise<Product[]> {
  try {
    let allProducts: Product[] = [];
    let offset = 0;
    const limit = 100; // fetch up to 100 per request

    while (true) {
      const response = await retryAppwrite(() =>
        databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
          Query.limit(limit),
          Query.offset(offset),
        ]),
      );

      if (!response || response.documents.length === 0) break;

      const parseBool = (v: any) =>
        typeof v === "string" ? v.toLowerCase() === "true" : Boolean(v);

      const normalizeImages = (imgField: any) => {
        if (!imgField) return [] as string[];

        let arr: any[] = [];
        if (Array.isArray(imgField)) {
          arr = imgField;
        } else if (typeof imgField === "string") {
          const trimmed = imgField.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              arr = JSON.parse(trimmed);
            } catch (e) {
              arr = [trimmed];
            }
          } else {
            arr = [trimmed];
          }
        } else {
          arr = [imgField];
        }

        return arr.filter(Boolean).map((item: any) => {
          if (typeof item !== "string") return String(item);
          // If it's already a URL, sanitize it; else treat as Appwrite file id and produce URL
          if (/^https?:\/\//i.test(item)) return sanitizeImageString(item);
          return getFileUrl(item);
        });
      };

      const normalizeStringList = (value: unknown) => {
        if (Array.isArray(value)) return value.map(String).filter(Boolean);
        if (typeof value === "string")
          return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        return [] as string[];
      };

      const products = response.documents.map((doc: any) => {
        // Parse price correctly - handle both string and number, and if it's stored in kobo (100 kobo = 1 NGN)
        let rawPrice = doc.price ?? doc.Price ?? 0;
        let parsedPrice = Number(rawPrice);

        // If price is over a reasonable threshold (like 100,000 NGN which is very expensive for clothing), assume it's in kobo and divide by 100
        if (parsedPrice > 100000) {
          parsedPrice = parsedPrice / 100;
        }

        return {
          $id: doc.$id,
          $createdAt: doc.$createdAt,
          $updatedAt: doc.$updatedAt,
          name: doc.name || doc.Name || "Unnamed Product",
          price: parsedPrice,
          longDescription: doc.long_description ?? "",
          shortDescription: doc.short_description ?? "",
          images: normalizeImages(
            doc.images || doc.Images || doc.image || doc.Image,
          ),
          category: doc.category ?? "",
          colors: normalizeStringList(doc.colors ?? doc.Colors),
          stock: doc.stock ?? 0,
          sizes: doc.sizes ?? [],
          freeDelivery: parseBool(doc.freeDelivery),
          customizable: parseBool(doc.customizable),
          comingSoon: parseBool(doc.comingSoon),
          // Ensure we pass through the stored gender value (may be 'male'/'female'/'unisex' or variants)
          gender: doc.gender ?? undefined,
          releaseAt: doc.releaseAt ?? undefined,
          countdownEnabled: parseBool(doc.countdownEnabled),
          // Appwrite historically used the typo'd 'relased' field — support both `relased` and the correct `released`
          released: parseBool(doc.relased ?? doc.released),
          preOrder:
            doc.preOrder === true ||
            doc.preorder === true ||
            parseBool(doc.preOrder), // ✅ Handle boolean true, string "true", and lowercase field
          preOrderTier: doc.preOrderTier ?? doc.preorderTier ?? undefined,
          dropId: doc.dropId || "project_0",
          dropOrder:
            typeof doc.dropOrder === "number" ? doc.dropOrder : undefined,
          // Debugging help: log if a product is marked released so we can verify Out Now detection (server-side only)
          // NOTE: remove or silence in production when not needed
        };
      });

      allProducts = [...allProducts, ...products];

      if (response.documents.length < limit) break; // no more docs
      offset += limit;
    }

    if (!options.includeInactiveDrops) {
      const drops = await retryAppwrite(() =>
        databases.listDocuments(DATABASE_ID, DROPS_COLLECTION_ID, [
          Query.limit(100),
        ]),
      );
      allProducts = filterProductsByLiveDrops(
        allProducts,
        drops.documents as any,
      );
    }

    return allProducts;
  } catch (error) {
    console.error("❌ Failed to fetch products:", error);
    return [];
  }
}

// ==========================
// 🔹 Site Settings
// ==========================
export const SETTINGS_DOC_ID = "global_settings";

export async function getSiteSettings() {
  console.log("📡 [VERCEL LOG] Fetching site settings via Server API...");
  try {
    // Try to fetch via our proxy API route to avoid CORS issues
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get",
        collection: "settings",
        id: SETTINGS_DOC_ID,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn("⚠️ Settings document not found. Defaulting to UNLOCKED.");
        return {
          isLocked: false,
          unlockAt: null,
          lockPassword: "shealteredherego",
        };
      }
      throw new Error(`Server responded with ${response.status}`);
    }

    const res = await response.json();
    console.log("✨ [VERCEL LOG] Settings fetched successfully via Server API");

    // Ensure isLocked is a boolean
    const isLocked =
      typeof res.isLocked === "string"
        ? res.isLocked === "true"
        : Boolean(res.isLocked);

    return {
      ...res,
      isLocked,
    };
  } catch (error: any) {
    console.warn(
      "⚠️ [VERCEL LOG] getSiteSettings failed, falling back to direct client call:",
      error.message,
    );

    // Fallback to direct call if the API route fails
    try {
      const res = await retryAppwrite(() =>
        databases.getDocument(
          DATABASE_ID,
          SETTINGS_COLLECTION_ID,
          SETTINGS_DOC_ID,
        ),
      );

      const isLocked =
        typeof res.isLocked === "string"
          ? res.isLocked === "true"
          : Boolean(res.isLocked);

      return { ...res, isLocked };
    } catch (directErr: any) {
      console.error("❌ [VERCEL LOG] All settings fetch methods failed.");
      return {
        isLocked: false,
        unlockAt: null,
        lockPassword: "shealteredherego",
      };
    }
  }
}

export async function updateSiteSettings(data: {
  isLocked?: boolean;
  unlockAt?: string | null;
  lockPassword?: string;
}) {
  console.log("📂 [VERCEL LOG] Target Collection:", SETTINGS_COLLECTION_ID);
  console.log("🆔 [VERCEL LOG] Target Document:", SETTINGS_DOC_ID);
  console.log("📊 [VERCEL LOG] Database ID:", DATABASE_ID);

  try {
    // Try to update first
    console.log("📡 [VERCEL LOG] Attempting updateDocument...");
    const updateRes = await retryAppwrite(() =>
      databases.updateDocument(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        SETTINGS_DOC_ID,
        data,
      ),
    );
    return updateRes;
  } catch (error: any) {
    console.warn("⚠️ [VERCEL LOG] Update failed. Error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
      stack: error.stack,
    });

    // If update fails because document doesn't exist (404), try to create it
    if (error.code === 404) {
      try {
        console.log(
          "📝 [VERCEL LOG] Document not found. Attempting to create 'global_settings'...",
        );
        const createRes = await retryAppwrite(() =>
          databases.createDocument(
            DATABASE_ID,
            SETTINGS_COLLECTION_ID,
            SETTINGS_DOC_ID,
            {
              isLocked: data.isLocked ?? false,
              unlockAt: data.unlockAt ?? null,
              lockPassword: data.lockPassword ?? "shealteredherego",
            },
          ),
        );
        return createRes;
      } catch (createErr: any) {
        console.error("❌ [VERCEL LOG] Failed to create settings document:", {
          message: createErr.message,
          code: createErr.code,
          type: createErr.type,
        });
        throw createErr;
      }
    }
    console.error("❌ [VERCEL LOG] Failed to update settings:", error);
    throw error;
  }
}
