"use client";

import { useEffect, useState } from "react";
import ProductItem from "@/app/myReusableComponents/ProductItem";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Square } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ensureArray } from "@/lib/mapAppwriteProduct";

type Product = any;

const mapProducts = (products: Product[]) =>
  products.map((p: Product) => ({
    $id: p.$id,
    $createdAt: p.$createdAt ?? new Date().toISOString(),
    name: p.name || p.Name || "Unnamed Product",
    price: p.price ?? p.Price ?? 0,
    longDescription: p.longDescription || p.Long_Description || "",
    shortDescription: p.shortDescription || p.Short_Description || "",
    images: ensureArray(p.images || p.Images || []),
    stock: Number(p.stock ?? p.Stock ?? 0),
    dropId: p.dropId || "project_0",
    dropOrder: typeof p.dropOrder === "number" ? p.dropOrder : undefined,
    category: (p.category || p.Category || "").trim(),
    colors: ensureArray(p.colors || p.Colors || []),
    sizes: ensureArray(p.sizes || p.Sizes || p.size || p.Size || []),
    freeDelivery: p.freeDelivery || p.FreeDelivery || false,
    preOrder: !!p.preOrder,
  }));

function ShopWordmark() {
  return (
    <Link href="/" className="flex w-full translate-y-2 justify-center px-6 pb-5 pt-6 sm:pb-6 sm:pt-7" aria-label="Return home">
      <h1 className="shop-script-wordmark">Bling&apos;d</h1>
    </Link>
  );
}

export default function StorefrontShopClient({
  products,
  categories,
}: {
  products: Product[];
  categories: any[];
}) {
  const [mappedProducts, setMappedProducts] = useState<Product[]>(() => mapProducts(products));
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(() => mapProducts(products));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [layout, setLayout] = useState<'grid-1' | 'grid-2'>('grid-2');
  const [showCounter, setShowCounter] = useState(false);
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    // Dismiss the loading toast when this component mounts
    toast.dismiss("navigate-to-shop");
    
    // Show welcome toast only on first visit of this session
    const hasShownWelcome = sessionStorage.getItem("hasShownStorefrontWelcome");
    if (!hasShownWelcome) {
      toast.success("Welcome to BLING’D!", {
        position: "bottom-center"
      });
      sessionStorage.setItem("hasShownStorefrontWelcome", "true");
    }
  }, []);

  // Listen for search events from global header
  useEffect(() => {
    const handleSearch = () => {
      setShowCounter(true);
      const timer = setTimeout(() => setShowCounter(false), 3000);
      return () => clearTimeout(timer);
    };
    window.addEventListener('product-search-trigger', handleSearch);
    return () => window.removeEventListener('product-search-trigger', handleSearch);
  }, []);

  // Keep the server-rendered catalogue in sync if the page receives new data.
  useEffect(() => {
    setMappedProducts(mapProducts(products));
  }, [products]);

  // Filter products and apply our grouping/sorting logic
  useEffect(() => {
    let productsToProcess = mappedProducts;
    
    // Filter by category if activeCategory is set
    if (activeCategory) {
      productsToProcess = mappedProducts.filter(
        (p) => p.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }
    
    // Step 1: Keep each explicitly ordered drop together, regardless of category.
    // This makes the sequence saved from Drops the exact shop sequence.
    const orderedDrops = new Map<string, Product[]>();
    const unorderedProducts: Product[] = [];

    productsToProcess.forEach((product) => {
      if (product.dropOrder !== undefined) {
        const dropProducts = orderedDrops.get(product.dropId) || [];
        dropProducts.push(product);
        orderedDrops.set(product.dropId, dropProducts);
      } else {
        unorderedProducts.push(product);
      }
    });

    const orderedDropProducts = [...orderedDrops.values()].flatMap((dropProducts) => dropProducts.sort((a, b) => (
      (a.dropOrder ?? Number.MAX_SAFE_INTEGER) - (b.dropOrder ?? Number.MAX_SAFE_INTEGER)
      || a.name.localeCompare(b.name)
    )));

    // Step 2: Keep the existing category ordering for products without a Drop order.
    const groupedByCategory: Record<string, Product[]> = {};
    
    unorderedProducts.forEach(product => {
      const cat = product.category.toLowerCase();
      if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
      groupedByCategory[cat].push(product);
    });
    
    // Products without a saved drop order retain the existing alphabetical fallback.
    Object.keys(groupedByCategory).forEach(cat => {
      groupedByCategory[cat].sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
        return 0;
      });
    });
    
    // Step 3: Sort categories in the order they come from the categories prop (which uses the database order)
    // First, create a map of category name to index from the categories prop for quick lookup
    const categoryOrderMap = new Map<string, number>();
    categories.forEach((cat, index) => {
      categoryOrderMap.set(cat.name.toLowerCase(), index);
    });
    
    const sortedCategoryKeys = Object.keys(groupedByCategory).sort((a, b) => {
      // Use the order from the categories prop first; if not found, sort alphabetically
      const orderA = categoryOrderMap.get(a) ?? Infinity;
      const orderB = categoryOrderMap.get(b) ?? Infinity;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b);
    });
    
    // Step 4: Ordered drop products come first in their saved sequence; legacy products follow their category order.
    const finalProducts: Product[] = [...orderedDropProducts];
    sortedCategoryKeys.forEach(cat => {
      finalProducts.push(...groupedByCategory[cat]);
    });
    
    setFilteredProducts(finalProducts);
  }, [mappedProducts, activeCategory, categories]);

  const handleCategoryClick = (categoryName: string | null) => {
    setActiveCategory(categoryName);
    setIsOpen(false);
    setShowCounter(true);
    setTimeout(() => setShowCounter(false), 3000);
  };

  if (mappedProducts.length === 0) {
    return (
      <div className="shop-page relative z-10 min-h-[100dvh] bg-black text-white">
        <div className="relative flex flex-col items-center text-center">
          <ShopWordmark />
          <div className="relative mt-2 flex w-full flex-col items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="group relative z-30 flex touch-manipulation flex-col items-center justify-center gap-2 p-8 transition-transform active:scale-95"
              aria-label={isOpen ? "Close Menu" : "Open Menu"}
            >
              <motion.div animate={isOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }} className="h-0.5 w-12 bg-white transition-all group-hover:w-16" />
              <motion.div animate={isOpen ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }} className="h-0.5 w-12 bg-white transition-all group-hover:w-16" />
              <motion.div animate={isOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }} className="h-0.5 w-12 bg-white transition-all group-hover:w-16" />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative z-20 mt-4 w-full max-w-xs overflow-hidden rounded-2xl bg-transparent p-[3px] shadow-sm"
                >
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-[-80%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_290deg,rgba(0,0,0,0.15)_310deg,#000_342deg,transparent_360deg)]"
                    />
                    <div className="absolute inset-[2px] rounded-[14px] bg-white/95" />
                    <div className="absolute inset-0 animate-[radarPulse_2.6s_ease-out_infinite] rounded-2xl border border-black/25" />
                    <div className="absolute inset-3 animate-[radarPulse_2.6s_ease-out_0.8s_infinite] rounded-xl border border-black/15" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-2 rounded-[13px] px-4 py-6">
                    {categories.map((cat) => (
                      <button
                        key={cat.$id}
                        onClick={() => handleCategoryClick(cat.name)}
                        className={`block w-full px-2 py-2 text-left text-[10px] font-mono font-black uppercase tracking-[0.1em] transition-all duration-300 hover:translate-x-2 ${
                          activeCategory?.toLowerCase() === cat.name.toLowerCase() ? "text-black" : "text-black/70"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                    <button
                      onClick={() => handleCategoryClick(null)}
                      className={`block w-full px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.3em] ${
                        !activeCategory ? "text-black" : "text-black/70"
                      }`}
                    >
                      View All
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {isDevelopment && (
            <div className="mx-auto mt-12 w-full max-w-sm px-5 text-left">
              <div className="aspect-square bg-zinc-950 p-8">
                <img src="/placeholder.svg" alt="Test product" className="h-full w-full object-contain" />
              </div>
              <p className="shop-product-name mt-5">NIGHTFRAME TEE</p>
              <p className="mt-2"><span className="shop-price-prefix">FROM</span><span className="shop-price"> ₦28,000</span></p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/35">Local style preview only</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentDisplayProducts = filteredProducts;

  return (
    <div className="shop-page relative z-10 min-h-[100dvh] space-y-4 bg-black text-white">

      {/* Force hide global overlays for a totally white look */}
      <style jsx global>{`
        .noise-overlay, .scanlines {
          display: none !important;
        }
      `}</style>
      {/* Banner & Centered Nav Button */}
      <div className="relative mb-2 mt-0 flex flex-col items-center pb-0 text-center">
        <ShopWordmark />
        
        <div className="relative mt-2 flex flex-col items-center w-full">
          <button 
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            className="p-8 flex flex-col items-center justify-center gap-2 group relative z-30 active:scale-95 transition-transform touch-manipulation"
            aria-label={isOpen ? "Close Menu" : "Open Menu"}
          >
            <motion.div 
              animate={isOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              className="h-0.5 w-12 bg-white transition-all group-hover:w-16"
            />
            <motion.div 
              animate={isOpen ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
              className="h-0.5 w-12 bg-white transition-all group-hover:w-16"
            />
            <motion.div 
              animate={isOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              className="h-0.5 w-12 bg-white transition-all group-hover:w-16"
            />
          </button>

          {/* Inline Dropdown Categories */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative z-20 mt-4 w-full max-w-xs overflow-hidden rounded-2xl bg-transparent p-[3px] shadow-sm"
              >
                {/* Radar border animation */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-80%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_290deg,rgba(0,0,0,0.15)_310deg,#000_342deg,transparent_360deg)]"
                  />
                  <div className="absolute inset-[2px] rounded-[14px] bg-white/95" />
                  <div className="absolute inset-0 animate-[radarPulse_2.6s_ease-out_infinite] rounded-2xl border border-black/25" />
                  <div className="absolute inset-3 animate-[radarPulse_2.6s_ease-out_0.8s_infinite] rounded-xl border border-black/15" />
                </div>

                <div className="relative z-10 flex flex-col gap-2 rounded-[13px] px-4 py-6">
                  {categories.map((cat, i) => (
                    <motion.div
                      key={cat.$id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <button
                        onClick={() => handleCategoryClick(cat.name)}
                        className={`block w-full text-left text-[10px] md:text-xs font-mono font-black uppercase tracking-[0.1em] hover:translate-x-2 transition-all duration-300 py-2 px-2 active:scale-95 ${
                          activeCategory?.toLowerCase() === cat.name.toLowerCase() ? "text-black" : "text-black/70"
                        }`}
                      >
                        {cat.name}
                      </button>
                    </motion.div>
                  ))}
                  <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: categories.length * 0.05 }}
                      className="pt-2"
                    >
                      <button
                        onClick={() => handleCategoryClick(null)}
                        className={`block w-full text-left text-[10px] font-black uppercase tracking-[0.3em] py-2 px-2 active:scale-95 ${
                          !activeCategory ? "text-black" : "text-black/70"
                        }`}
                      >
                        View All
                      </button>
                    </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showCounter && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 text-[9px] font-mono tracking-[0.5em] text-white/65 uppercase font-bold italic"
            >
              {currentDisplayProducts.length} {activeCategory ? activeCategory.toUpperCase() : "ASSETS"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shop controls */}
      <div className="flex justify-end items-center mb-4 px-2">
        {/* Layout Toggle */}
        <div className="inline-flex rounded-lg border border-white/25 bg-transparent p-1 md:hidden">
          <button 
            onClick={() => setLayout('grid-2')}
            className={`p-2 rounded-md transition-all ${layout === 'grid-2' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
            aria-label="2x2 Grid"
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setLayout('grid-1')}
            className={`p-2 rounded-md transition-all ${layout === 'grid-1' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
            aria-label="1x1 Grid"
          >
            <Square size={18} />
          </button>
        </div>
      </div>

      <div
        className={`grid gap-x-4 gap-y-12 sm:gap-x-8 sm:gap-y-20 ${
          layout === 'grid-2' 
            ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
      >
        <AnimatePresence mode="popLayout">
          {currentDisplayProducts.map((product) => (
            <motion.div 
              key={product.$id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative h-full"
            >
              <ProductItem 
                product={product} 
                variants={[product]}
                isDenseMobile={layout === 'grid-2'}
                compact={layout === 'grid-2'}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
