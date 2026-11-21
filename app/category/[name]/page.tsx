// app/category/[name]/page.tsx
import { getServerCategories } from "@/lib/serverCatalog";
import { getCachedStorefrontProducts } from "@/lib/cachedCatalog";
import { Product } from "@/app/types/Product";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { cleanSeoDescription, toCategorySlug } from "@/lib/seo";
import CategoryClient from "./CategoryClient";

export const revalidate = 900;

type Props = {
  params: Promise<{
    name: string;
  }>;
};

export async function generateStaticParams() {
  const categories = await getServerCategories();
  return categories
    .map((category) => String(category.name || "").trim())
    .filter(Boolean)
    .map((name) => ({ name: toCategorySlug(name) }));
}

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name: routeName } = await params;
  const category = await resolveCategory(routeName);

  if (!category) {
    return { title: "Category", robots: { index: false, follow: false } };
  }

  const name = String(category.name).trim();
  const canonicalPath = `/category/${toCategorySlug(name)}`;
  return {
    title: name,
    description: cleanSeoDescription(
      category.description,
      `Shop ${name} clothing and streetwear from BLING’D.`,
    ),
    alternates: { canonical: canonicalPath },
    openGraph: { title: `${name} | BLING’D`, url: canonicalPath },
  };
}

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
