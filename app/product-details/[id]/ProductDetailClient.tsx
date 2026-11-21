'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Share2, ArrowLeft, ShoppingBag, Truck, Plus, Minus, Shield } from "lucide-react";
import { useCartStore } from '@/app/Store/CartStore';
import { getProduct, getProductsByCategory, getCategory } from '@/app/action/appwrite';
import { mapAppwriteProduct } from '@/lib/mapAppwriteProduct';
import { Product as SharedProduct } from '@/app/types/Product';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/getImageUrl';
import { motion, AnimatePresence } from "framer-motion";
import Link from 'next/link';
import StorefrontLoadingScreen from '@/components/ui/StorefrontLoadingScreen';

interface ProductDetailProps {
  productId: string;
  initialProduct: LocalProduct;
}

type LocalProduct = {
  $id: string;
  Name: string;
  Price: number;
  Long_Description: string;
  Short_Description: string;
  images: string[];
  stock?: number;
  category?: string;
  freeDelivery?: boolean;
  preOrder?: boolean;
  sizes?: string[];
  colors?: string[];
  countdownEnabled?: boolean;
  releaseAt?: string | null;
};

const getColorHex = (colorName: string): string => {
  const colors: Record<string, string> = {
    'black': '#000000',
    'white': '#ffffff',
    'red': '#ff0000',
    'blue': '#0000ff',
    'green': '#00ff00',
    'yellow': '#ffff00',
    'grey': '#808080',
    'gray': '#808080',
    'navy': '#000080',
    'cream': '#f5f5dc',
    'beige': '#f5f5dc',
    'brown': '#a52a2a',
    'orange': '#ffa500',
    'purple': '#800080',
    'pink': '#ffc0cb',
  };
  return colors[colorName.toLowerCase().trim()] || '#e5e5e5';
};

const ProductDetail = ({ productId, initialProduct }: ProductDetailProps) => {
  const id = productId;
  const router = useRouter();
  const { addToCart, currency, cart } = useCartStore();

  const [product, setProduct] = useState<LocalProduct | null>(initialProduct);
  const [variants, setVariants] = useState<SharedProduct[]>([]);
  const [similarProducts, setSimilarProducts] = useState<SharedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>(initialProduct.images[0] || '/placeholder.svg');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'shipping'>('details');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [category, setCategory] = useState<any | null>(null);

  const [activeVariantId, setActiveVariantId] = useState<string>(id);

  useEffect(() => {
    const fetchProduct = async () => {
      const isInitialProduct = initialProduct.$id === activeVariantId;
      try {
        if (!isInitialProduct) setLoading(true);

        let mapped: LocalProduct;
        if (isInitialProduct) {
          mapped = initialProduct;
        } else {
          const data = await getProduct(activeVariantId);
          if (!data) {
            router.push('/store');
            return;
          }
          mapped = mapAppwriteProduct(data);
        }

        setProduct(mapped);
        setSelectedImage(mapped.images[0] || '/placeholder.svg');
        setCurrentImageIndex(0); // Reset image index on variant change
        setAutoScrollEnabled(true); // Reset auto-scroll to true

        if (mapped.category) {
          console.log('🔍 [ProductDetails] Fetching category for:', mapped.category);
          const [categoryProducts, categoryData] = await Promise.all([
            getProductsByCategory(mapped.category),
            getCategory(mapped.category),
          ]);
          
          console.log('🔍 [ProductDetails] Category data received:', categoryData);
          console.log('🔍 [ProductDetails] Size guide:', categoryData?.sizeGuide);
          setCategory(categoryData);

          if (categoryProducts) {
            const currentName = (mapped.Name || "").trim().toUpperCase();
            // Extract the base name (everything before the first " - ")
            const baseName = currentName.split(' - ')[0];

            const mappedVariants = categoryProducts
              .filter((p: any) => {
                const pName = (p.Name || p.name || "").trim().toUpperCase();
                return pName.startsWith(baseName);
              })
              .map((p: any) => mapAppwriteProduct(p)) as unknown as SharedProduct[];
            setVariants(mappedVariants);

            const mappedSimilar = categoryProducts
              .filter((p: any) => {
                const pName = (p.Name || p.name || "").trim().toUpperCase();
                return !pName.startsWith(baseName);
              })
              .map((p: any) => mapAppwriteProduct(p)) as unknown as SharedProduct[];
            setSimilarProducts(mappedSimilar);
          }
        }
      } catch (error) {
        console.error(error);
        router.push('/store');
      } finally {
        if (!isInitialProduct) setLoading(false);
      }
    };
    if (activeVariantId) fetchProduct();
  }, [activeVariantId, initialProduct, router]);

  // Auto-scroll images effect
  useEffect(() => {
    if (!product || product.images.length <= 1 || !autoScrollEnabled) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }, 3000); // 3 seconds per slide
    
    return () => clearInterval(interval);
  }, [product, autoScrollEnabled]);

  const handleAddToCart = () => {
    if (!product) return;
    if (Number(product.stock ?? 0) <= 0 && !product.preOrder) {
      toast.error('This product is sold out');
      return;
    }
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    addToCart({
      $id: product.$id,
      cartItemId: `${product.$id}-${Date.now()}`,
      name: selectedSize ? `${product.Name} - ${selectedSize}` : product.Name,
      price: product.Price,
      image: selectedImage,
      quantity: qty,
      freeDelivery: product.freeDelivery ?? false,
      selectedSize: selectedSize || null,
    });
    toast.success('Added to bag');
  };

  if (loading) {
    return <StorefrontLoadingScreen whiteBackground={true} />;
  }

  if (!product) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 max-w-xs text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 leading-relaxed">
            System Error: Asset not found or connection failed.
          </p>
          <button 
            onClick={() => router.push('/store')}
            className="text-[10px] font-bold uppercase tracking-widest border-b border-black pb-1 hover:opacity-50 transition-opacity"
          >
            Return to Shop
          </button>
        </div>
      </div>
    );
  }

  const isSoldOut = Number(product.stock ?? 0) <= 0 && !product.preOrder;

  return (
    <div className="bg-white text-black min-h-screen font-sans selection:bg-black selection:text-white">
      {/* Refined Minimalist Header */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-8 flex justify-between items-center bg-transparent border-b border-transparent">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 p-2 text-black/60 hover:text-black transition-all group"
        >
          <ArrowLeft size={18} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back</span>
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="text-[11px] font-bold tracking-[0.2em] uppercase text-black">
            {product.Name}
          </h1>
        </div>

        <Link 
          href="/cart"
          className="relative p-2 text-black/60 hover:text-black transition-colors"
        >
          <ShoppingBag size={20} strokeWidth={1.5} />
          {cart.length > 0 && (
            <span className="absolute top-0 right-0 bg-black text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {cart.length}
            </span>
          )}
        </Link>
      </nav>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Section: Image Gallery */}
        <div className="w-full lg:w-3/5 bg-white flex flex-col pt-24 lg:pt-0">
          <div className="h-[50dvh] sm:h-[60dvh] lg:h-[100dvh] lg:sticky top-0 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full h-full p-6 sm:p-8 lg:p-12 cursor-pointer"
                onClick={() => {
                  if (product.images.length > 1) {
                    setAutoScrollEnabled(false);
                    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
                  }
                }}
              >
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[currentImageIndex]}
                    alt={product.Name}
                    fill
                    className="object-contain p-2 sm:p-4"
                    priority
                    quality={100}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 font-mono text-[10px] uppercase tracking-widest">
                    IMAGE_NOT_AVAILABLE
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Minimalist Image Indicators - Desktop Only */}
            {product.images.length > 1 && (
              <div className="hidden lg:flex absolute bottom-8 gap-4 z-10">
                {product.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAutoScrollEnabled(false);
                      setCurrentImageIndex(idx);
                    }}
                    className={`h-3 w-3 rounded-full transition-all duration-200 ${
                      currentImageIndex === idx ? 'bg-black scale-125' : 'bg-black/20 hover:bg-black/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail Box - Mobile Only */}
          {product.images.length > 1 && (
            <div className="lg:hidden px-4 pb-4">
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAutoScrollEnabled(false);
                      setCurrentImageIndex(idx);
                    }}
                    className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden transition-all ${
                      currentImageIndex === idx 
                        ? 'opacity-100 border-2 border-black' 
                        : 'opacity-50 hover:opacity-75 border-2 border-transparent'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.Name} ${idx + 1}`}
                      fill
                      className="object-cover"
                      quality={100}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Product Details */}
        <div className="w-full lg:w-2/5 p-6 sm:p-8 lg:p-20 flex flex-col pt-12 lg:pt-32 bg-white pb-32 lg:pb-20">
          <div className="max-w-md mx-auto w-full space-y-8 sm:space-y-12">
            
            {/* Essential Info */}
            <header className="space-y-3 sm:space-y-6 text-left">
              <div className="space-y-1 sm:space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
                  <h1 className="text-3xl sm:text-3xl lg:text-5xl font-black tracking-tighter uppercase leading-[0.9] text-black italic">
                    {product.Name}
                  </h1>
                  <p className="text-xl sm:text-xl lg:text-2xl font-semibold tracking-wider text-black font-slashed-zero">
                    {formatCurrency(product.Price, currency)}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-zinc-500">
                Tax excluded. <span className="font-semibold text-black">Shipping</span> calculated at checkout.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {isSoldOut && (
                  <div className="inline-flex items-center rounded-full bg-black px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white">
                    Sold Out
                  </div>
                )}
                
                {product.preOrder && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] rounded-full">
                    <Shield size={10} /> Pre-Order
                  </div>
                )}
              </div>
            </header>

            {/* Minimalist Selection Controls */}
            <div className="space-y-8 sm:space-y-12 bg-zinc-50/50 p-6 sm:p-0 rounded-[2rem] sm:bg-transparent">
              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-4 sm:space-y-6 w-full">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-black/20">Size</label>
                    {selectedSize && (
                      <motion.span 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-500"
                      >
                        Selected: {selectedSize}
                      </motion.span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          disabled={isSoldOut}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[72px] w-[72px] h-12 flex items-center justify-center rounded-full text-sm font-medium transition-all border ${
                            isSoldOut
                              ? 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300'
                              : selectedSize === size
                              ? 'bg-black border-black text-white'
                              : 'bg-white border-zinc-200 text-black hover:border-zinc-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                </div>
              )}

              {/* Color/Variant Selection */}
              {variants.length > 1 && (
                <div className="space-y-4 flex flex-col items-center lg:items-start w-full">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Colors</span>
                  <div className="flex justify-center lg:justify-start gap-3">
                    {variants.map((v) => {
                      const colorName = v.colors?.[0] || v.name?.split(' - ')[1] || "";
                      const hex = getColorHex(colorName);
                      return (
                        <button
                          key={v.$id}
                          onClick={() => {
                            setActiveVariantId(v.$id);
                            window.history.pushState(null, '', `/product-details/${v.$id}`);
                          }}
                          className={`w-8 h-8 rounded-full border transition-all p-0.5 ${v.$id === activeVariantId ? 'border-black scale-110' : 'border-zinc-100 hover:border-black'}`}
                          title={colorName}
                        >
                          <div className="w-full h-full rounded-full" style={{ backgroundColor: hex }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity & Add to Cart (Desktop version) */}
              <div className="hidden lg:block space-y-4 w-full">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center justify-center border border-zinc-100 px-2 h-14 rounded-2xl bg-[#f5f5f5]">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-12 h-10 flex items-center justify-center hover:opacity-40 transition-opacity"><Minus size={14} /></button>
                    <span className="w-12 text-center text-sm font-bold">{qty}</span>
                    <button onClick={() => setQty(q => q + 1)} className="w-12 h-10 flex items-center justify-center hover:opacity-40 transition-opacity"><Plus size={14} /></button>
                  </div>
                  <button 
                    onClick={handleAddToCart}
                    disabled={isSoldOut || Boolean(product.sizes && product.sizes.length > 0 && !selectedSize)}
                    className={`flex-1 h-14 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 shadow-xl ${
                      isSoldOut
                        ? "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-400 shadow-none"
                        : product.sizes && product.sizes.length > 0 && !selectedSize
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none border border-zinc-200"
                        : "bg-black text-white hover:bg-zinc-800 shadow-black/5"
                    }`}
                  >
                    <ShoppingBag size={18} />
                    {isSoldOut ? "Sold Out" : product.sizes && product.sizes.length > 0 && !selectedSize ? "Select Size" : "Add to Vault"}
                  </button>
                </div>
              </div>
            </div>

            {/* Information Tabs */}
            <div className="space-y-6 pt-12 border-t border-zinc-100">
              <div className="flex gap-8 border-b border-zinc-50 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'details' ? 'opacity-100' : 'opacity-20 hover:opacity-100'}`}
                >
                  Details
                  {activeTab === 'details' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                </button>
                <button 
                  onClick={() => setActiveTab('shipping')}
                  className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'shipping' ? 'opacity-100' : 'opacity-20 hover:opacity-100'}`}
                >
                  Shipping
                  {activeTab === 'shipping' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                </button>
              </div>
              
              <div className="min-h-[100px] space-y-6">
                {activeTab === 'details' ? (
                  <>
                    <p className="text-sm leading-relaxed text-zinc-500 font-medium">
                      {product.Long_Description || product.Short_Description}
                    </p>

                    {category?.sizeGuide && (
                      <div className="border-t border-zinc-100 pt-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Size Guide</h3>
                        <div className="relative aspect-[4/3] bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100">
                          <Image
                            src={getImageUrl(category.sizeGuide)}
                            alt="Size Guide"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Truck size={16} className="mt-0.5 opacity-30" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Worldwide Logistics</p>
                        <p className="text-xs text-zinc-500">Standard delivery within 5-9 working days. Express options available.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {similarProducts.length > 0 && (
              <section className="space-y-8 pt-12 border-t border-zinc-100">
                <div className="flex justify-between items-baseline px-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">You may also like</h3>
                  <Link href="/store" className="text-[10px] font-bold uppercase tracking-widest hover:opacity-50 transition-opacity underline decoration-zinc-200 underline-offset-4">Discover More</Link>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  {similarProducts.slice(0, 2).map((p) => (
                    <Link key={p.$id} href={`/product-details/${p.$id}`} className="group space-y-3">
                      <div className="aspect-[3/4] relative bg-white overflow-hidden rounded-xl">
                        <Image src={getImageUrl(p.images[0])} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                      <div className="space-y-1 px-1">
                        <p className="text-[10px] font-bold uppercase truncate tracking-tight">{p.name}</p>
                        <p className="text-[10px] font-medium tracking-wide opacity-40 font-slashed-zero">{formatCurrency(p.price, currency)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Footer Actions */}
            <footer className="pt-12 pb-12 flex justify-between items-center border-t border-zinc-100">
               <button onClick={() => { if (navigator.share) navigator.share({ url: window.location.href }); }} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity">
                 <Share2 size={14} strokeWidth={1.5} /> Share
               </button>
               <span className="text-[8px] font-bold opacity-10 tracking-[0.5em] uppercase">BLING’D / Official</span>
            </footer>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] p-4 bg-white/80 backdrop-blur-xl border-t border-zinc-100">
        <div className="flex gap-3 max-w-md mx-auto">
          <div className="flex items-center justify-center border border-zinc-100 px-1 h-12 rounded-xl bg-[#f5f5f5]">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:opacity-40 transition-opacity"><Minus size={12} /></button>
            <span className="w-8 text-center text-xs font-bold">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 flex items-center justify-center hover:opacity-40 transition-opacity"><Plus size={12} /></button>
          </div>
          <button 
            onClick={handleAddToCart}
            disabled={isSoldOut || Boolean(product.sizes && product.sizes.length > 0 && !selectedSize)}
            className={`flex-1 h-12 rounded-xl font-bold text-[10px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
              isSoldOut
                ? "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-400 shadow-none"
                : product.sizes && product.sizes.length > 0 && !selectedSize
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200 shadow-none"
                : "bg-black text-white active:scale-95 shadow-black/10"
            }`}
          >
            <ShoppingBag size={16} />
            {isSoldOut ? "Sold Out" : product.sizes && product.sizes.length > 0 && !selectedSize ? "Select Size" : "Add to Vault"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
