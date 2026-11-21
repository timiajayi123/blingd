import { MetadataRoute } from "next";
import { toCategorySlug } from "@/lib/seo";
import { SITE_URL } from "@/lib/siteConfig";
import {
  getPublicCatalogProducts,
  getServerCategories,
  type CatalogCategoryDocument,
  type CatalogProductDocument,
} from "@/lib/serverCatalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Static routes
  const staticPages = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/store", changeFrequency: "daily", priority: 0.9 },
    { path: "/new-arrivals", changeFrequency: "daily", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/gallery", changeFrequency: "weekly", priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "/track-order", changeFrequency: "monthly", priority: 0.6 },
    { path: "/coming-soon", changeFrequency: "daily", priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/delivery-policy", changeFrequency: "yearly", priority: 0.4 },
    { path: "/refund-policy", changeFrequency: "yearly", priority: 0.4 },
  ] as const;

  const staticRoutes: MetadataRoute.Sitemap = staticPages.map(({ path, ...route }) => ({
    url: `${baseUrl}${path}`,
    ...route,
  }));

  let products: CatalogProductDocument[] = [];
  let categories: CatalogCategoryDocument[] = [];
  try {
    [products, categories] = await Promise.all([
      getPublicCatalogProducts(),
      getServerCategories(),
    ]);
  } catch (error) {
    console.error("Sitemap storefront fetch failed", error);
  }

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((product) => Boolean(product.$id && (product.name || product.Name)))
    .map((product) => {
      const modifiedAt = product.$updatedAt || product.$createdAt;
      return {
        url: `${baseUrl}/product-details/${encodeURIComponent(product.$id)}`,
        ...(modifiedAt ? { lastModified: new Date(modifiedAt) } : {}),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });

  const liveCategoryNames = new Set(
    products
      .map((product) => product.category?.trim().toLowerCase())
      .filter(Boolean)
  );

  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((category) => {
      const name = String(category.name || "").trim();
      return name && liveCategoryNames.has(name.toLowerCase()) && toCategorySlug(name);
    })
    .map((category) => {
      const name = String(category.name).trim();
      return {
        url: `${baseUrl}/category/${toCategorySlug(name)}`,
        ...(category.$updatedAt ? { lastModified: new Date(category.$updatedAt) } : {}),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

  const routes = [...staticRoutes, ...productRoutes, ...categoryRoutes];
  return Array.from(new Map(routes.map((route) => [route.url, route])).values());
}
