import {
  getCachedStorefrontCategories,
  getCachedStorefrontProducts,
} from "@/lib/cachedCatalog";
import StorefrontShopClient from "@/app/storefront/StorefrontShopClient";
import { Metadata } from "next";
import { getStorefrontMedia } from "@/lib/storefrontMedia";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Shop BLING’D streetwear, clothing, and accessories. Explore current drops and new pieces from Lagos, Nigeria.",
  alternates: { canonical: "/store" },
  openGraph: { url: "/store" },
};

export const revalidate = 900;

export default async function StorefrontShopPage() {
  try {
    const [products, categories, media] = await Promise.all([
      getCachedStorefrontProducts(),
      getCachedStorefrontCategories(),
      getStorefrontMedia(),
    ]);

    // Filter out coming soon products for the main shop
    const activeProducts = products.filter((p: any) => !p.comingSoon);

    return (
      <div className="min-h-screen bg-white pb-12 text-black">
        <div className="container mx-auto px-4">
          <StorefrontShopClient
            products={activeProducts}
            categories={categories}
            backgroundType={media.shopBackgroundType}
            backgroundVideoUrl={media.shopVideoUrl}
            backgroundPosterUrl={media.shopPosterUrl}
            backgroundImageUrl={media.shopImageUrl}
          />
        </div>
      </div>
    );
  } catch (err) {
    console.error("Failed to load BLING’D shop:", err);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 font-mono uppercase tracking-widest text-black">
        System Error: Failed to acquire assets.
      </div>
    );
  }
}
