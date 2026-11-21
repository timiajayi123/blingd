import { getCachedStorefrontProducts } from "@/lib/cachedCatalog";
import ComingSoonClient from "./ComingSoonClient";

export const revalidate = 900;

export default async function ComingSoonPage() {
  try {
    const all = await getCachedStorefrontProducts();
    const coming = all.filter((p: any) => !!p.comingSoon);

    return (
      <div className="container mx-auto p-6">
        <ComingSoonClient products={coming} />
      </div>
    );
  } catch (err) {
    console.error("Failed to load coming soon page:", err);
    return <div className="p-6">Failed to load Coming Soon products.</div>;
  }
}
