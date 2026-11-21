import {
  getCachedStorefrontCategories,
  getCachedStorefrontProducts,
} from "@/lib/cachedCatalog";
import NewArrivalsClient from "./NewArrivalsClient";

export const revalidate = 900;

export default async function NewArrivalsPage() {
  try {
    const [all, cats] = await Promise.all([
      getCachedStorefrontProducts(),
      getCachedStorefrontCategories(),
    ]);
    const brandedSet = new Set(
      (cats || [])
        .filter((c: any) => !!(c.isBranded || c.branded || c.is_branded))
        .map((c: any) => ((c.name || "") as string).trim().toLowerCase()),
    );

    const newest = all
      .filter((p: any) => {
        if (!p.$createdAt) return false;
        const created = new Date(p.$createdAt);
        return (
          (new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <=
          30
        ); // last 30 days
      })
      .filter((p: any) => !p.comingSoon)
      .filter(
        (p: any) =>
          !brandedSet.has(((p.category || "") as string).trim().toLowerCase()),
      );

    return (
      <div className="bg-white text-black min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-6">
          <NewArrivalsClient products={newest} />
        </div>
      </div>
    );
  } catch (err) {
    console.error("Failed to load new arrivals:", err);
    return (
      <div className="p-6 bg-white min-h-screen pt-24">
        Failed to load New Arrivals.
      </div>
    );
  }
}
