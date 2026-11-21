import { cache } from "react";
import { notFound } from "next/navigation";
import { mapAppwriteProduct } from "@/lib/mapAppwriteProduct";
import ProductDetailClient from "./ProductDetailClient";
import { getCachedStorefrontProducts } from "@/lib/cachedCatalog";

export const revalidate = 900;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const products = await getCachedStorefrontProducts();
  return products.map((product) => ({ id: product.$id }));
}

const loadProduct = cache(async (id: string) => {
  const products = await getCachedStorefrontProducts();
  return products.find((product) => product.$id === id) || null;
});

export default async function ProductDetailsPage({ params }: Props) {
  const { id } = await params;
  const rawProduct = await loadProduct(id);
  if (!rawProduct) notFound();

  const product = mapAppwriteProduct(rawProduct);
  return (
    <ProductDetailClient productId={id} initialProduct={product} />
  );
}
