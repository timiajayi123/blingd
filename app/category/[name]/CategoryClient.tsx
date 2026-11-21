"use client";

import { useEffect, useState } from "react";
import ProductItem from "@/app/myReusableComponents/ProductItem";
import { Product } from "@/app/types/Product";
import { CheckCircle, LayoutGrid, Square } from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalLoader } from "@/components/providers/GlobalLoaderProvider";

type Props = {
  products: any[]; // raw Appwrite data
  category: string;
};

const mapProducts = (products: any[]): Product[] => {
  const ensureArray = (field: any) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === "string") {
      const trimmed = field.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return [trimmed];
        }
      }
      return [trimmed];
    }
    return [field];
  };

  return products.map((p: any) => {
    const rawPrice = p.price ?? p.Price ?? 0;
    const parsedPrice = Number(rawPrice) > 100000 ? Number(rawPrice) / 100 : Number(rawPrice);
    return {
      $id: p.$id,
      $createdAt: p.$createdAt ?? new Date().toISOString(),
      name: p.name ?? p.Name ?? "Unnamed Product",
      price: parsedPrice,
      longDescription: p.longDescription ?? p.Long_Description ?? "",
      shortDescription: p.shortDescription ?? p.Short_Description ?? "",
      images: ensureArray(p.images ?? p.Images),
      stock: p.stock ?? p.Stock ?? 0,
      category: p.category ?? p.Category ?? "",
      colors: ensureArray(p.colors ?? p.Colors),
      sizes: ensureArray(p.sizes ?? p.Sizes),
      freeDelivery: p.freeDelivery ?? p.FreeDelivery ?? false,
      preOrder: p.preOrder ?? p.preorder ?? false,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
};

export default function CategoryClient({ products, category }: Props) {
  const { setLoading } = useGlobalLoader();
  const [mappedProducts, setMappedProducts] = useState<Product[]>(() => mapProducts(products));
  const [layout, setLayout] = useState<'grid-1' | 'grid-2'>('grid-2');

  useEffect(() => {
    setMappedProducts(mapProducts(products));
    setLoading(false);
  }, [products, setLoading]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold capitalize">{category} Products</h1>
        
        {/* Layout Toggle - Mobile Only */}
        <div className="flex md:hidden justify-end px-2">
          <div className="inline-flex bg-black/5 p-1 rounded-lg border border-black/5">
            <button 
              onClick={() => setLayout('grid-2')}
              className={`p-2 rounded-md transition-all ${layout === 'grid-2' ? 'bg-black text-white shadow-md' : 'text-black/40 hover:text-black'}`}
              aria-label="2x2 Grid"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setLayout('grid-1')}
              className={`p-2 rounded-md transition-all ${layout === 'grid-1' ? 'bg-black text-white shadow-md' : 'text-black/40 hover:text-black'}`}
              aria-label="1x1 Grid"
            >
              <Square size={18} />
            </button>
          </div>
        </div>
      </div>

      <motion.div 
        layout
        className={`grid gap-4 md:gap-6 ${
          layout === 'grid-2' 
            ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        }`}
      >
        <AnimatePresence mode="popLayout">
          {mappedProducts.map((product) => (
            <motion.div 
              layout
              key={product.$id} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group"
            >
              <ProductItem 
                product={product} 
                isDenseMobile={layout === 'grid-2'}
                compact={layout === 'grid-2'}
              />
              
              {/* ✅ Refurbished Free Delivery Badge */}
              {product.freeDelivery && (
                <div className={`absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm text-white ${layout === 'grid-2' ? 'text-[6px] px-1.5 py-0.5' : 'text-[10px] px-2.5 py-1'} font-bold rounded-full shadow-sm border border-emerald-400/50 pointer-events-none`}>
                  <CheckCircle className={`${layout === 'grid-2' ? 'w-2 h-2' : 'w-3 h-3'}`} />
                  <span>Free Delivery</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
