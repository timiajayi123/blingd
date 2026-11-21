
import { Client, Databases, Query } from "node-appwrite";
import { Product } from "@/app/types/Product";
import { getFileUrl } from "@/lib/api";
import { Config } from "@/lib/appwriteConfig";
import { filterProductsByLiveDrops } from "@/lib/dropAvailability";
import { ensureArray } from "@/lib/mapAppwriteProduct";

// Re-initialize a server-side database instance here to avoid exporting non-functions from server actions
const client = new Client()
  .setEndpoint(Config.endpoint || "https://fra.cloud.appwrite.io/v1")
  .setProject(Config.projectId || "unconfigured_source_project");

if (process.env.APPWRITE_API_KEY) {
  client.setKey(process.env.APPWRITE_API_KEY);
}
const database = new Databases(client);

export async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    let allProducts: Product[] = [];
    let offset = 0;
    const limit = 100; // fetch up to 100 per request
    const normalizedCategory = category.toLowerCase().trim();

    while (true) {
      const response = await database.listDocuments(
        Config.databaseId!,
        Config.productsCollectionId!,
        [
          Query.limit(limit),
          Query.offset(offset),
        ]
      );

      if (!response || response.documents.length === 0) break;

      const normalizeImages = (imgField: any) => {
        if (!imgField) return [] as string[];
        const arr = Array.isArray(imgField) ? imgField : [imgField];
        return arr
          .filter(Boolean)
          .map((item: any) => {
            if (typeof item !== "string") return String(item);
            if (/^https?:\/\//i.test(item)) return item;
            return getFileUrl(item);
          });
      };

      const products = response.documents.map((doc: any) => {
        const parseBool = (v: any) =>
          typeof v === "string" ? v.toLowerCase() === "true" : Boolean(v);
        
        // Parse price correctly
        const rawPrice = doc.price ?? doc.Price ?? 0;
        let parsedPrice = Number(rawPrice);
        
        // If price is over a reasonable threshold (like 100,000 NGN which is very expensive for clothing), assume it's in kobo and divide by 100
        if (parsedPrice > 100000) {
          parsedPrice = parsedPrice / 100;
        }

        return {
          $id: doc.$id,
          name: doc.Name || doc.name || "Unnamed Product",
          price: parsedPrice,
          longDescription: doc.long_description ?? "",
          shortDescription: doc.short_description ?? "",
          images: normalizeImages(doc.images || doc.Images),
          category: doc.category ?? "",
          colors: ensureArray(doc.colors ?? doc.Colors ?? []),
          stock: doc.stock ?? 0,
          sizes: doc.sizes ?? [],
          freeDelivery: doc.freeDelivery ?? false,
          customizable: doc.customizable ?? false,
          comingSoon: parseBool(doc.comingSoon),
          preOrder:
            doc.preOrder === true ||
            doc.preorder === true ||
            parseBool(doc.preOrder),
          preOrderTier: doc.preOrderTier ?? doc.preorderTier ?? undefined,
          dropId: doc.dropId || 'project_0',
          $createdAt: doc.$createdAt,
        } as Product;
      });

      // Filter case-insensitively
      const filteredProducts = products.filter((product) => 
        (product.category || "").toLowerCase().trim() === normalizedCategory
      );

      allProducts = [...allProducts, ...filteredProducts];

      if (response.documents.length < limit) break;
      offset += limit;
    }

    const drops = await database.listDocuments(
      Config.databaseId!,
      Config.dropsCollectionId!,
      [Query.limit(100)]
    );
    return filterProductsByLiveDrops(allProducts, drops.documents as any);
  } catch (error) {
    return [];
  }
}
