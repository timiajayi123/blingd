import { getImageUrl } from "./getImageUrl";

// Helper to ensure we always get an array of strings
export const ensureArray = (val: any): string[] => {
  if (!val) return [];

  // Already an array? Filter for strings.
  if (Array.isArray(val)) {
    return val
      .filter((item) => typeof item === "string" || typeof item === "number")
      .map(String);
  }

  if (typeof val === "string") {
    const trimmed = val.trim();

    // 1. Try JSON parse first (for ["A", "B"])
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch (e) {
        // JSON parse failed, try manual cleanup
      }

      // Manual parsing for malformed arrays like ['A', 'B'] or [A, B]
      // Remove brackets
      const content = trimmed.slice(1, -1);
      return content
        .split(",")
        .map((s) => s.trim())
        .map((s) => s.replace(/^['"]|['"]$/g, "")) // Remove surrounding quotes if present
        .filter(Boolean);
    }

    // 2. Comma separated string (e.g. "S, M, L")
    return trimmed.includes(",")
      ? trimmed
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [trimmed];
  }

  return [];
};

export const mapAppwriteProduct = (item: any) => {
  const rawSizes = item.sizes || item.Sizes || item.size || item.Size || [];
  const name = item.name || item.Name || "UNNAMED_ASSET";
  // Parse price to number, make sure we handle string/number
  const rawPrice = item.price ?? item.Price ?? 0;
  let price = Number(rawPrice);

  // If price is over a reasonable threshold (like 100,000 NGN which is very expensive for clothing), assume it's in kobo and divide by 100
  if (price > 100000) {
    price = price / 100;
  }

  const longDesc =
    item.long_description ||
    item.Long_Description ||
    item.longDescription ||
    item.description ||
    "";
  const shortDesc =
    item.short_description ||
    item.Short_Description ||
    item.shortDescription ||
    "";
  const stock = Number(item.stock ?? item.Stock ?? 0);
  const category = item.category || item.Category || "";

  const rawImages = ensureArray(item.images || item.Images || []);
  const images = rawImages.map((imgId) => getImageUrl(imgId)).filter(Boolean);

  return {
    $id: item.$id,
    name: name,
    Name: name,
    price: price,
    Price: price,
    longDescription: longDesc,
    Long_Description: longDesc,
    shortDescription: shortDesc,
    Short_Description: shortDesc,
    images: images.length > 0 ? images : ["/placeholder.svg"],
    stock: stock,
    category: category,
    freeDelivery: item.freeDelivery ?? item.FreeDelivery ?? false,
    preOrder: item.preOrder ?? item.preorder ?? item.PreOrder ?? false,
    sizes: ensureArray(rawSizes),
    colors: ensureArray(item.colors || item.Colors || []),
    countdownEnabled: item.countdownEnabled ?? false,
    releaseAt: item.releaseAt || null,
    position: item.position ?? 0,
    dropId: item.dropId || "project_0",
    $createdAt: item.$createdAt,
  };
};
