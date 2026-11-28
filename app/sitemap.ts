import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

export const revalidate = 86400;

/** Keep this route readable even when Appwrite is slow or unavailable. */
export default function sitemap(): MetadataRoute.Sitemap {
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

  return staticPages.map(({ path, ...route }) => ({
    url: `${SITE_URL}${path}`,
    ...route,
  }));
}
