"use client";

import { useEffect, useState } from "react";
import ProductItem from "@/app/myReusableComponents/ProductItem";
import GenderSelect from "@/app/myReusableComponents/GenderSelect";
import { LayoutGrid, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalLoader } from "@/components/providers/GlobalLoaderProvider";

type Product = any;

export default function ComingSoonClient({ products }: { products: Product[] }) {
  const { setLoading } = useGlobalLoader();
  const [list, setList] = useState<Product[]>([]);
  const [gender, setGender] = useState<'all'|'male'|'female'|'unisex'>('all');
  const [layout, setLayout] = useState<'grid-1' | 'grid-2'>('grid-2');

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      // simple normalizer mapping for expected fields
      const mapped = products.map((p: any) => ({
        $id: p.$id,
        $createdAt: p.$createdAt ?? new Date().toISOString(),
        name: p.name ?? p.Name ?? "Unnamed Product",
        price: p.price ?? p.Price ?? 0,
        longDescription: p.longDescription ?? p.Long_Description ?? "",
        shortDescription: p.shortDescription ?? p.Short_Description ?? "",
        images: p.images ?? p.Images ?? [],
        stock: p.stock ?? p.Stock ?? 0,
        category: p.category ?? p.Category ?? "",
        colors: p.colors ?? p.Colors ?? [],
        sizes: p.sizes ?? p.Sizes ?? [],
        freeDelivery: p.freeDelivery ?? p.FreeDelivery ?? false,
        comingSoon: true,
        gender: (p.gender || p.Gender || 'unisex').toString().toLowerCase(),
      }));

      setList(mapped);
      setLoading(false);
    }, 250);

    return () => clearTimeout(t);
  }, [products, setLoading]);

  const visible = list.filter((p) => (gender === 'all' ? true : (p.gender ?? 'unisex') === gender));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Coming Soon</h1>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Filter</span>
            <GenderSelect value={gender} onChange={(v) => setGender(v)} id="coming-soon-filter" />
          </div>

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
      </div>

      {visible.length === 0 ? (
        <p className="text-gray-600">No items match the selected filter.</p>
      ) : (
        <motion.div 
          layout
          className={`grid gap-4 md:gap-6 ${
            layout === 'grid-2' 
              ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          <AnimatePresence mode="popLayout">
            {visible.map((p) => (
              <motion.div 
                layout
                key={p.$id} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative"
              >
                <ProductItem 
                  product={p} 
                  isDenseMobile={layout === 'grid-2'}
                  compact={layout === 'grid-2'}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
