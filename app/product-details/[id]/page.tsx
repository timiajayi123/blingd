import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { mapAppwriteProduct } from "@/lib/mapAppwriteProduct";
import { cleanSeoDescription } from "@/lib/seo";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const rawProduct = await loadProduct(id);

  if (!rawProduct) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  const product = mapAppwriteProduct(rawProduct);
  const canonicalPath = `/product-details/${encodeURIComponent(id)}`;
  const description = cleanSeoDescription(
    product.Short_Description || product.Long_Description,
    `Shop ${product.Name} from BLING’D.`,
  );
  const image = product.images.find((item: string) =>
    /^https?:\/\//i.test(item),
  );

  return {
    title: product.Name,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${product.Name} | BLING’D`,
      description,
      url: canonicalPath,
      type: "website",
      ...(image ? { images: [{ url: image, alt: product.Name }] } : {}),
    },
  };
}

export default async function ProductDetailsPage({ params }: Props) {
  const { id } = await params;
  const rawProduct = await loadProduct(id);
  if (!rawProduct) notFound();

  const product = mapAppwriteProduct(rawProduct);
  const productUrl = `https://example.com/product-details/${encodeURIComponent(id)}`;
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.Name,
    description: cleanSeoDescription(
      product.Short_Description || product.Long_Description,
      `Shop ${product.Name} from BLING’D.`,
    ),
    image: product.images.filter((item: string) => /^https?:\/\//i.test(item)),
    sku: product.$id,
    url: productUrl,
    brand: { "@type": "Brand", name: "BLING’D" },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "NGN",
      price: product.Price,
      availability:
        Number(product.stock) > 0 || product.preOrder
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productStructuredData),
        }}
      />
      <ProductDetailClient productId={id} initialProduct={product} />
    </>
  );
}
