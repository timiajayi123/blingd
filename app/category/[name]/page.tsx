// app/category/[name]/page.tsx
import { getServerCategories } from "@/lib/serverCatalog";
import { getCachedStorefrontProducts } from "@/lib/cachedCatalog";
import { Product } from "@/app/types/Product";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { toCategorySlug } from "@/lib/seo";
import CategoryClient from "./CategoryClient";

// Categories depend on the live storefront catalog. Rendering them at request
// time prevents deployment builds from failing when the external catalog is
// unavailable or when its credentials are intentionally deployment-only.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    name: string;
  }>;
};

const resolveCategory = cache(async (routeName: string) => {
  const decodedName = decodeURIComponent(routeName).trim();
  const requestedSlug = toCategorySlug(decodedName);
  const categories = await getServerCategories();

  return (
    categories.find((category) => {
      const name = String(category.name || "").trim();
      return (
        name.toLowerCase() === decodedName.toLowerCase() ||
        toCategorySlug(name) === requestedSlug
      );
    }) || null
  );
});

export default async function CategoryPage({ params }: Props) {
  const { name: routeName } = await params;
  const categoryDocument = await resolveCategory(routeName);
  if (!categoryDocument) notFound();

  const category = String(categoryDocument.name).trim();
  const canonicalSlug = toCategorySlug(category);
  if (routeName !== canonicalSlug) {
    permanentRedirect(`/category/${canonicalSlug}`);
  }

  const products: Product[] = (await getCachedStorefrontProducts()).filter(
    (product) =>
      String(product.category || "")
        .trim()
        .toLowerCase() === category.toLowerCase(),
  );

  if (!products || products.length === 0) {
    notFound();
  }

  return (
    <div className="bg-white text-black min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-6">
        <CategoryClient products={products} category={category} />
      </div>
    </div>
  );
}
