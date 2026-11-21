"use client";

import { useEffect, useState } from "react";
import ProductItem from "@/app/myReusableComponents/ProductItem";
import HorizontalPagedGrid from "../components/HorizontalPagedGrid";
import { useGlobalLoader } from "@/components/providers/GlobalLoaderProvider";

type Product = any;

const mapProducts = (products: Product[]) =>
  products.map((p: Product) => ({
    $id: p.$id,
    $createdAt: p.$createdAt ?? new Date().toISOString(),
    name: p.name ?? p.Name ?? "Unnamed Product",
    price: p.price ?? p.Price ?? 0,
    longDescription: p.longDescription ?? p.Long_Description ?? "",
    shortDescription: p.shortDescription ?? p.Short_Description ?? "",
    images: Array.isArray(p.images) ? p.images : p.images ? [p.images] : [],
    stock: p.stock ?? p.Stock ?? 0,
    category: p.category ?? p.Category ?? "",
    colors: p.colors ?? p.Colors ?? [],
    sizes: p.sizes ?? p.Sizes ?? [],
    freeDelivery: p.freeDelivery ?? p.FreeDelivery ?? false,
  }));

export default function NewArrivalsClient({ products }: { products: Product[] }) {
  const { setLoading } = useGlobalLoader();
  const [list, setList] = useState<Product[]>(() => mapProducts(products));

  useEffect(() => {
    setList(mapProducts(products));
    setLoading(false);
  }, [products, setLoading]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Arrivals</h1>
      {/* Mobile: show paged (2 cols x 2 rows pages). Desktop: keep grid. */}
      <div>
        <div className="hidden sm:block">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {list.map((p) => (
              <div key={p.$id} className="relative">
                <ProductItem product={p} />
              </div>
            ))}
          </div>
        </div>

        <div className="block sm:hidden">
          <HorizontalPagedGrid
            items={list}
            cols={'auto'}
            itemWidth={170}
            rows={2}
            interval={3500}
            showDots={true}
            renderItem={(p) => (
              <div className="relative">
                <ProductItem product={p} />
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
