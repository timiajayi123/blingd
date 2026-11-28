"use client";

import { ZoomIn, ShoppingCart, XCircle, Share2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useCartStore } from "@/app/Store/CartStore";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Product } from "@/app/types/Product";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useEffect, useState, memo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useCountdown } from "@/app/hooks/useCountdown";
import FavoritesButton from "./FavoritesButton";
import { formatCurrency } from "@/lib/utils";
import { getImageUrl } from "@/lib/getImageUrl";
import { toCategorySlug } from "@/lib/seo";

import { trackEvent } from "@/lib/analytics";

interface ProductItemProps {
  product: Product;
  variants?: Product[]; // Add variants prop
  isWishlistPage?: boolean;
  onRemove?: () => void;
  isDetailPage?: boolean;
  showLongDescription?: boolean;
  customizable?: boolean;
  comingSoon?: boolean;
  isInComingSoonSection?: boolean;
  hideComingSoonBadge?: boolean;
  // Show an "Out Now" badge (used for branded releases)
  showOutNowBadge?: boolean;
  // Render a compact, smaller card (used by mobile New Arrivals)
  compact?: boolean;
  // When true (mobile dense 2x2 grid), hide some UI and show compact CTA
  isDenseMobile?: boolean;
  hideFavoriteButton?: boolean;
  priority?: boolean;
} 



const ProductItem = memo(({
  product,
  variants = [], // Destructure variants
  isWishlistPage = false,
  onRemove,
  isDetailPage = false,
  isInComingSoonSection = false,
  hideComingSoonBadge = false,
  showOutNowBadge = false,
  compact = false,
  isDenseMobile = false,
  hideFavoriteButton = false,
  priority = false,
}: ProductItemProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { addToCart, currency } = useCartStore();
  const isCategoryPage = pathname?.startsWith("/category");
  const isStorefrontPage = pathname === "/store" || pathname?.startsWith("/storefront");
  const isRevoltPage = pathname?.includes("revolt");

  const textColor = isRevoltPage || isStorefrontPage ? "!text-white" : "!text-black";
  const subTextColor = isRevoltPage || isStorefrontPage ? "!text-white/70" : "!text-black/30";

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);


  const imagesArray = Array.isArray(product.images)
    ? product.images
    : product.images
    ? [product.images]
    : [];

  // keep component quiet (no debug logs)

  // Normalize values
  const isComingSoon = !!product.comingSoon;
  const isCustomizable = !!product.customizable;
  // Out Now indicator (set by parent when a branded product is released)
  const isOutNow = !!showOutNowBadge;

  // Determine release state
  const isPreOrder = !!product.preOrder;
  const isSoldOut = Number(product.stock ?? 0) <= 0 && !isPreOrder && !isComingSoon;
  const isReleasedFlag = !!product.released;
  const countdownEnabled = !!product.countdownEnabled;
  const releaseAt = product.releaseAt ?? null;

  // Use hook to track countdown
  const { expired, days, hours, minutes, seconds } = useCountdown(releaseAt);
  // Treat pre-order as separate — do not mark pre-order items as released so countdown still displays
  const isReleased = isReleasedFlag || (countdownEnabled && releaseAt && expired);

  // Helper to render a compact, human-friendly countdown string (always include seconds)
  const formatCountdown = () => {
    if (!releaseAt) return "";
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Short countdown for cramped mobile UI (omit seconds if long)
  const formatShortCountdown = () => {
    if (!releaseAt) return "";
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  // Small animated countdown component: animates on text change and shows a pulsing accent
  // Accepts optional `className` for text and `dotClass` for the pulse dot so callers can control colors
  const AnimatedCountdown = ({ text, className = "", dotClass = "" }: { text: string; className?: string; dotClass?: string }) => {
    const [pulseKey, setPulseKey] = useState(0);
    useEffect(() => {
      // bump key whenever text changes so motion re-animates
      setPulseKey((k) => k + 1);
    }, [text]);

    return (
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className={`w-2 h-2 rounded-full ${dotClass || "bg-black"} animate-pulse`} />
        <motion.span
          key={pulseKey}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`font-semibold ${className}`}
        >
          {text}
        </motion.span>
      </span>
    );
  }; 

  // Debug logs for non-coming-soon products (helps debug countdown / CTA behavior)
  useEffect(() => {
    if (isComingSoon) return; // skip noisy coming-soon items
    const showCountdown = !!(countdownEnabled && releaseAt && !isReleased && !expired);
    const releaseTs = releaseAt ? new Date(releaseAt).getTime() : null;
    const nowTs = Date.now();
    const reason = showCountdown ? 'visible' : (!countdownEnabled ? 'countdownDisabled' : !releaseAt ? 'noReleaseAt' : isReleased ? 'alreadyReleasedOrPreorder' : expired ? 'expired' : 'unknown');
    console.log('product-countdown-visible', {
      id: product.$id,
      name: product.name,
      showCountdown,
      reason,
      countdownEnabled,
      releaseAt,
      releaseTs,
      nowTs,
      timeUntilMs: releaseTs ? releaseTs - nowTs : null,
      expired,
      days,
      hours,
      minutes,
      seconds,
    });
  }, [product.$id, product.name, countdownEnabled, releaseAt, isReleased, expired, days, hours, minutes, seconds, isComingSoon]);

  useEffect(() => {
    if (isComingSoon) return;
    console.log('product-cta', { id: product.$id, preOrder: isPreOrder, releasedFlag: isReleasedFlag, isReleased, countdownEnabled, releaseAt });
  }, [product.$id, isPreOrder, isReleasedFlag, isReleased, countdownEnabled, releaseAt, isComingSoon]);

  // Hide coming-soon products in normal listings — allow only the Coming Soon section
  if (isComingSoon && !isInComingSoonSection && !isDetailPage && !isReleased) return null;

  useEffect(() => {
    // Determine max images among variants (or just the single product)
    const currentImages = Array.isArray(product.images) ? product.images : [product.images];
    const maxImages = variants.length > 0 
      ? Math.max(...variants.map(v => (Array.isArray(v.images) ? v.images.length : 1)))
      : currentImages.length;

    if (maxImages <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % maxImages);
    }, 3000);

    return () => clearInterval(interval);
  }, [variants, product.images]);

  const handleAddToCart = () => {
    if (product.sizes?.length && !selectedSize) {
      toast.error("Please select a size before adding to cart.");
      // Open the product details page if they try to quick-add without selecting a size
      router.push(`/product-details/${product.$id}`);
      return;
    }

    addToCart({
          $id: product.$id,
          cartItemId: `${product.$id}-${Date.now()}`,
          name: product.name,
          price: product.price,
          image: getImageUrl(imagesArray[0]),
          quantity: 1,
          selectedSize: selectedSize || null,
          freeDelivery: product.freeDelivery ?? false,
        });

        trackEvent("add_to_cart", {
          productId: product.$id,
          name: product.name,
          price: product.price,
          size: selectedSize || "N/A",
        });

        toast.success(
          <div className="flex items-center gap-3">
            {imagesArray[0] ? (
              <img
                src={getImageUrl(imagesArray[0])}
                alt={product.name}
                className="w-12 h-12 rounded-none object-cover border border-white/20"
              />
            ) : null}
            <div>
              <p className="font-black italic uppercase tracking-tighter">
                {selectedSize ? `${product.name} (${selectedSize})` : product.name}
              </p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Added to cart</p>
            </div>
          </div>
    );
  };

  const handleShopNow = () => {
    router.push(`/category/${toCategorySlug(product.category)}`);
  };

  const handlePreOrder = () => {
    if (product.sizes?.length && !selectedSize) {
          toast.error("Please select a size for pre-order.");
          return;
        }

        const cartItemId = `${product.$id}-preorder-${Date.now()}`;
        addToCart({
          $id: product.$id,
          cartItemId,
          name: product.name + (product.preOrderTier ? ` (Pre-order - ${product.preOrderTier})` : " (Pre-order)"),
          price: product.price,
          image: getImageUrl(imagesArray[0]),
          quantity: 1,
          selectedSize: selectedSize || null,
          color: product.colors?.[0] || null,
          freeDelivery: product.freeDelivery ?? false,
          preOrder: true,
          preOrderTier: product.preOrderTier ? String(product.preOrderTier) : undefined,
        });

        toast.success(
          <div className="flex items-center gap-3">
            {imagesArray[0] ? (
              <img
                src={getImageUrl(imagesArray[0])}
                alt={product.name}
                className="w-12 h-12 rounded-none object-cover border border-white/20"
              />
            ) : null}
            <div>
              <p className="font-black italic uppercase tracking-tighter">
                PRE-ORDER: {selectedSize ? `${product.name} (${selectedSize})` : product.name}
              </p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Added to pre-order</p>
            </div>
          </div>
        );
    setPreviewOpen(false);
  };

  const shareProduct = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/product-details/${product.$id}`;
    const text =
      product.shortDescription ||
      product.longDescription ||
      product.name;
    const shareData = {
      title: product.name,
      text,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(shareData);
        return;
      }
    } catch {
    }
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(url);
        toast.success("Product link copied to clipboard");
      } else {
        toast.success(url);
      }
    } catch {
      toast.success(url);
    }
  };

  const renderPriceAndStock = () => {
    // Hide price/stock when it's still a coming-soon item (and not released yet)
    if (!isReleased && isComingSoon) return null;

    return (
      <div className={`flex flex-col ${isDenseMobile ? 'gap-1' : 'gap-2'} mt-2`}>
        <div className="flex items-baseline gap-2">
          {!isDenseMobile && <span className={`text-[8px] font-mono ${subTextColor} uppercase tracking-[0.2em]`}>COST_INDEX:</span>}
          <span className={`${isDenseMobile ? '!text-[18vw] sm:!text-[15vw] font-black' : '!text-[22vw]'} font-black italic tracking-tighter ${textColor} drop-shadow-[0_4px_20px_rgba(0,0,0,1)]`}>{formatCurrency(product.price, currency)}</span>
        </div>
        
        {product.freeDelivery && (
          <div className="flex items-center gap-2 text-emerald-600">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
            <span className={`${isDenseMobile ? 'text-[6px]' : 'text-[8px]'} font-mono font-bold tracking-[0.2em] uppercase`}>LOGISTICS_FREE</span>
          </div>
        )}
        
        {!isDenseMobile && (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              product.stock > 0 ? "bg-emerald-500" : isPreOrder ? "bg-amber-500" : "bg-zinc-400"
            }`} />
            <span className={`text-[8px] font-mono font-bold tracking-[0.2em] uppercase ${
              product.stock > 0 ? "text-emerald-600" : isPreOrder ? "text-amber-600" : "text-zinc-500"
            }`}>
              {product.stock > 0 ? "AVAILABILITY_HIGH" : isPreOrder ? "PRE_ORDER_ONLY" : "ASSET_DEPLETED"}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (isDetailPage) {
    return (
      <div className="px-4 md:px-0 relative">
        <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

        {isOutNow && !hideComingSoonBadge ? (
          <span className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-green-300 text-[9px] sm:text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-sm inline-block whitespace-nowrap">
            Out Now
          </span>
        ) : isComingSoon && !hideComingSoonBadge ? (
          <span className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-yellow-300 text-[9px] sm:text-[11px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full inline-block overflow-hidden whitespace-nowrap truncate">
            Coming Soon
          </span>
        ) : null}
        {isCustomizable && (
          <span className="absolute top-8 left-2 bg-blue-300 text-xs px-2 py-1 rounded-full">
            Customizable
          </span>
        )}

        <div className="w-full h-96 flex items-center justify-center bg-white rounded-md overflow-hidden mb-4">
          {imagesArray[currentImageIndex] ? (
            <Image
              src={getImageUrl(imagesArray[currentImageIndex])}
              alt={product.name}
              width={600}
              height={600}
              className="max-h-full max-w-full object-contain transition-opacity duration-700 ease-in-out opacity-100"
            />
          ) : (
            <Image
              src="/placeholder.svg"
              alt={product.name}
              width={600}
              height={600}
              className="max-h-full max-w-full object-contain transition-opacity duration-700 ease-in-out opacity-100"
              unoptimized
            />
          )}
        </div>

        <p className="text-gray-700">{product.longDescription || "No description available."}</p>

        {product.sizes && product.sizes.length > 0 && (!isComingSoon || isReleased) && (
          <div className="mt-4">
            <label className="text-sm text-gray-600">Select Size:</label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              disabled={product.stock <= 0}
              className={`border rounded-md p-1 text-sm w-full mt-1 ${
                product.stock <= 0 ? "bg-white text-gray-400 cursor-not-allowed" : ""
              }`}
            >
              <option value="">-- Choose a size --</option>
              {product.sizes.map((size: string) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          disabled={(!isReleased && isComingSoon) || (product.sizes?.length && !selectedSize) || product.stock <= 0}
          className={`storefront-btn w-full mt-6 ${
            (!isReleased && isComingSoon) ? "opacity-50 grayscale" : ""
          }`}
        >
          {(!isReleased && isComingSoon)
            ? "COMING SOON"
            : product.customizable && selectedSize
            ? "CUSTOMIZE"
            : product.sizes?.length && !selectedSize
            ? "SELECT SIZE"
            : "ADD TO BLING’D"}
        </button>
      </div>
    );
  }

  // reduce default card height for regular products (not Out Now / Coming Soon)
  const baseCardClasses = compact
    ? "p-2"
    : "p-3 pb-4";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      whileHover={isStorefrontPage ? undefined : { y: -4 }}
      whileTap={isStorefrontPage ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.3 }} 
      className={`w-full h-full ${isStorefrontPage ? "" : "will-change-transform"}`}
    >
      <Card 
        onClick={() => router.push(`/product-details/${product.$id}`)}
        className={`relative cursor-pointer w-full h-full group ${
        isRevoltPage || isStorefrontPage 
          ? 'bg-transparent' 
          : 'bg-white'
      } border-none shadow-none ${baseCardClasses}`}>
      
      {/* Brutalist Stripe - Removed for total white/black look */}
      <div className={`absolute top-0 right-0 w-16 h-16 ${
        isRevoltPage || isStorefrontPage 
          ? 'bg-transparent' 
          : 'bg-white'
      } -rotate-45 translate-x-8 -translate-y-8 z-0`} />

      {/* Animated "Snake" Border - Only for branded "Out Now" products */}
       {isOutNow && (
         <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-xl">
           <svg className="w-full h-full" style={{ overflow: 'visible' }}>
             <motion.rect
               x="1"
               y="1"
               width="calc(100% - 2px)"
               height="calc(100% - 2px)"
               rx="12"
               fill="none"
               stroke={isStorefrontPage ? "white" : "black"}
               strokeWidth="2"
               strokeLinecap="round"
               initial={{ pathLength: 0.15, pathOffset: 0 }}
               animate={{ 
                 pathOffset: [0, 1],
               }}
               transition={{ 
                 duration: 4, 
                 repeat: Infinity, 
                 ease: "linear" 
               }}
             />
           </svg>
         </div>
       )}

      {isSoldOut ? (
        <span className="absolute top-2 left-2 z-20 rounded-full bg-black px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
          Sold Out
        </span>
      ) : isOutNow && !hideComingSoonBadge ? (
        <span className="absolute top-2 left-2 z-20 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm">
          Out Now
        </span>
      ) : isComingSoon && !hideComingSoonBadge ? (
        <span className="absolute top-2 left-2 z-20 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm">
          Coming Soon
        </span>
      ) : null}



      {/* Portal-based Side Drawer (Quick View) */}
      {typeof window !== "undefined" && previewOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-end isolate">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setPreviewOpen(false)} 
            />

            {/* Side Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[85%] md:w-[480px] h-full bg-white shadow-2xl flex flex-col z-10"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{product.name}</h2>
                <button 
                  onClick={() => setPreviewOpen(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-black hover:bg-white rounded-full transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8">
                
                {/* Image Gallery */}
                <div className="relative aspect-square bg-white rounded-2xl overflow-hidden group">
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                     {isOutNow && <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">Out Now</span>}
                     {isComingSoon && <span className="bg-amber-400 text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">Coming Soon</span>}
                  </div>

                  <img
                    src={getImageUrl(imagesArray[previewIndex % imagesArray.length])}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {imagesArray.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setPreviewIndex((p) => (p - 1 + imagesArray.length) % imagesArray.length); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">Previous</span>
                        ‹
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setPreviewIndex((p) => (p + 1) % imagesArray.length); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">Next</span>
                        ›
                      </button>
                    </>
                  )}
                  
                  {/* Thumbnails */}
                  {imagesArray.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
                      {imagesArray.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPreviewIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === (previewIndex % imagesArray.length) ? "bg-black w-4" : "bg-black/20 hover:bg-black/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-6">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-bold text-gray-900">₦{Number(product.price).toLocaleString()}</span>
                      {product.stock > 0 && !isComingSoon && <span className="text-sm text-green-600 font-medium">In Stock Now</span>}
                    </div>
                    {product.category && <span className="text-xs font-bold uppercase tracking-wider text-gray-400 border border-gray-200 px-2 py-1 rounded">{product.category}</span>}
                  </div>

                  <div className="prose prose-sm text-gray-600 leading-relaxed">
                    <p>{product.longDescription || product.shortDescription || "No description available."}</p>
                  </div>
                </div>

                {/* Color Selector - Added for variants */}
                {variants.length > 1 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900 uppercase tracking-widest">Available Colors</label>
                    <div className="flex flex-wrap gap-3">
                      {variants.map((v) => (
                        <button
                          key={v.$id}
                          onClick={() => router.push(`/product-details/${v.$id}`)}
                          className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110 border-black ring-2 ring-black ring-offset-2"
                          style={{ 
                            backgroundColor: Array.isArray(v.colors) ? v.colors[0]?.toLowerCase() : String(v.colors).toLowerCase() 
                          }}
                          title={Array.isArray(v.colors) ? v.colors[0] : String(v.colors)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selector */}
                {product.sizes && product.sizes.length > 0 && !isComingSoon && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">Select Size</label>
                      <span className="text-xs text-gray-400">{selectedSize ? "Selected: " + selectedSize : "Required"}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`py-2.5 text-sm font-medium rounded-lg border transition-all ${
                            selectedSize === size
                              ? "border-black bg-black text-white shadow-md transform scale-[1.02]"
                              : "border-gray-200 text-gray-700 hover:border-black/5 hover:bg-white"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer Actions */}
              <div className="p-6 border-t border-gray-100 bg-white space-y-3">
                 <button
                    onClick={() => {
                      if (product.customizable && selectedSize) {
                        router.push(`/custom/tshirt?productId=${product.$id}&size=${selectedSize}&color=${product.colors?.[0] || "black"}`);
                      } else if (!isComingSoon) {
                        handleAddToCart();
                      } else {
                        // For coming soon, maybe just close or do nothing (buttons handled below)
                      }
                    }}
                    disabled={(!isComingSoon && product.sizes?.length && !selectedSize) || (!isComingSoon && product.stock <= 0 && !product.preOrder)}
                    className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] ${
                      isComingSoon 
                        ? "bg-white text-gray-400 border border-gray-100 cursor-not-allowed" 
                        : (!product.sizes?.length || selectedSize) && (product.stock > 0 || product.preOrder)
                          ? "bg-black text-white hover:bg-neutral-800"
                          : "bg-white text-gray-400 border border-gray-100 cursor-not-allowed"
                    }`}
                  >
                    {isComingSoon ? "Coming Soon" : (
                      <>
                        <ShoppingCart size={20} />
                        {product.stock <= 0 
                          ? (product.preOrder ? "Pre-order Now" : "Out of Stock") 
                          : product.customizable ? "Customize Now" : "Add to Cart"}
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => router.push(`/product-details/${product.$id}`)}
                    className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-white transition-colors text-sm"
                  >
                    View Full Details
                  </button>
                  <button
                    onClick={shareProduct}
                    className="w-full py-3 rounded-xl border border-gray-100 text-gray-700 font-medium hover:bg-white transition-colors text-xs flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share product
                  </button>
              </div>

            </motion.div>
          </div>,
          document.body
        )
      }



      {isWishlistPage && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 text-white hover:text-gray-300"
        >
          ❌
        </Button>
      )}

      {!isStorefrontPage && (
        <CardHeader className={`flex-shrink-0 bg-transparent border-none relative ${isDenseMobile ? 'p-1.5' : 'p-4'} pr-10`}>
          {!hideFavoriteButton && <FavoritesButton productId={product.$id} />}
          <h3 className={`${isDenseMobile ? '!text-[18vw] sm:!text-[15vw] font-black' : '!text-[22vw] md:!text-9xl'} font-street ${textColor} tracking-[0.05em] italic leading-[0.75] pr-2 glitch-text-video drop-shadow-[0_4px_20px_rgba(0,0,0,1)]`} data-text={product.name.toLowerCase()} title={product.name}>
            {product.name.toLowerCase()}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`h-[1px] ${isDenseMobile ? 'w-4' : 'w-8'} ${isRevoltPage || isStorefrontPage ? 'bg-white md:bg-black/10' : 'bg-black/10'}`} />
            <span className={`${isDenseMobile ? '!text-sm' : '!text-base'} font-mono font-black tracking-[0.3em] uppercase ${subTextColor} whitespace-nowrap truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>
              {product.category || "UNIDENTIFIED"}
            </span>
          </div>
        </CardHeader>
      )}

      <CardContent className={`flex-1 p-0 flex flex-col bg-transparent ${isStorefrontPage ? "shop-product-images" : ""}`}>
        {!isComingSoon ? (
          <Link href={`/product-details/${product.$id}`} prefetch={true} className="flex-1">
            {/* Fix: Ensure only one image is visible and images do not overlap */}
            <motion.div 
                whileHover={isStorefrontPage ? undefined : { scale: 1.02 }}
                className={`relative w-full aspect-square flex items-center justify-center ${
                  isRevoltPage || isStorefrontPage 
                    ? 'bg-transparent' 
                    : 'bg-white'
                } overflow-hidden group/img`}
              >
              
              {/* Status Badges for Card View */}
              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 pointer-events-none">
                 {isOutNow && <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 shadow-sm uppercase tracking-widest italic">OUT_NOW</span>}
                 {isComingSoon && <span className="bg-amber-400 text-black text-[8px] font-black px-2 py-0.5 shadow-sm uppercase tracking-widest italic">PENDING_RELEASE</span>}
              </div>

              {/* Image Glitch Overlay (Subtle) - disabled on storefront page */}
              {pathname !== '/store' && (
                <div className="absolute inset-0 z-20 opacity-0 group-hover/img:opacity-10 pointer-events-none transition-opacity duration-300">
                  <div className="absolute inset-0 bg-primary mix-blend-overlay animate-pulse" />
                </div>
              )}

              {/* Only render one image at a time, absolutely positioned */}
              <div className="relative w-full h-full">
                {variants.length > 1 ? (
                  <div className="relative w-full h-full group">
                    {variants.map((variant, i) => {
                      // Logic for stacking products (e.g. same item, different colors)
                      // The first item (i=0) stays top-left, 
                      // and the second item (i=1) moves to the bottom-right.
                      // Separation increased so they don't overlap, ensuring a "totally white" background between them.
                      const isTwo = variants.length === 2;
                      const offsetMultiplier = isDenseMobile ? 0.4 : 1;
                      // Move them further apart to avoid any overlapping
                      const tx = isTwo ? (i === 0 ? -30 * offsetMultiplier : 40 * offsetMultiplier) : i * 12 * offsetMultiplier;
                      const ty = isTwo ? (i === 0 ? -30 * offsetMultiplier : 40 * offsetMultiplier) : i * 12 * offsetMultiplier;
                      // Slightly smaller scale to fit the separation within the container
                      const scale = isTwo ? (isDenseMobile ? 0.85 : 0.8) : 1;
                      
                      return (
                        <div
                          key={variant.$id}
                          className={`absolute inset-0 w-full h-full transition-all duration-500 ease-out ${isStorefrontPage ? "" : "group-hover:scale-110"}`}
                          style={{
                            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                            zIndex: i === 1 ? 20 : 10,
                          }}
                        >
                          {variant.images.map((img: string, imgIdx: number) => (
                            <Image
                              key={img || `v-${variant.$id}-${imgIdx}`}
                              src={getImageUrl(img)}
                              alt={variant.name}
                              fill
                              quality={100}
                              priority={priority && i === 0 && imgIdx === 0}
                              sizes="(max-width: 768px) 75vw, (max-width: 1200px) 33vw, 25vw"
                              className={`object-contain w-full h-full transition-opacity duration-700 ease-in-out absolute inset-0 ${
                                imgIdx === (currentImageIndex % variant.images.length) ? "opacity-100" : "opacity-0"
                              }`}
                              style={{ transform: 'scale(1.05)' }}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  imagesArray.map((img, i) => {
                    const key = img || `placeholder-${i}`;
                    return (
                      <Image
                        key={key}
                        src={getImageUrl(img)}
                        alt={product.name}
                        fill
                        quality={100}
                        priority={priority && i === 0}
                        sizes="(max-width: 768px) 75vw, (max-width: 1200px) 33vw, 25vw"
                        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-in-out ${
                          i === currentImageIndex ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ transform: 'scale(1.05)' }}
                      />
                    );
                  })
                )}
              </div>
              {/* Overlay Action Buttons (Desktop Only) */}
              {!isStorefrontPage && (
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 hidden md:flex">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPreviewIndex(currentImageIndex);
                      setPreviewOpen(true);
                    }}
                    className="p-3 bg-white/90 backdrop-blur-sm text-black hover:bg-black hover:text-white transition-all rounded-full shadow-xl"
                    title="Quick View"
                  >
                    <ZoomIn size={20} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      shareProduct();
                    }}
                    className="p-3 bg-white/90 backdrop-blur-sm text-black hover:bg-black hover:text-white transition-all rounded-full shadow-xl"
                    title="Share Asset"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          </Link>
        ) : (
          <div className={`relative w-full aspect-square flex items-center justify-center ${
            isRevoltPage || isStorefrontPage 
              ? 'bg-transparent' 
              : 'bg-white'
          } overflow-hidden cursor-not-allowed opacity-70 group/img`}>
            {/* Status Badges for Card View */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 pointer-events-none">
                <span className="bg-amber-400 text-black text-[8px] font-black px-2 py-0.5 shadow-sm uppercase tracking-widest italic">PENDING_RELEASE</span>
            </div>
            <div className="relative w-full h-full overflow-hidden">
              {variants.length > 1 ? (
                <div className="relative w-full h-full group">
                  {variants.map((variant, i) => {
                    // Logic for stacking products (e.g. same item, different colors)
                    // The first item (i=0) stays top-left, 
                    // and the second item (i=1) moves to the bottom-right.
                    // Separation increased so they don't overlap, ensuring a "totally white" background between them.
                    const isTwo = variants.length === 2;
                    const offsetMultiplier = isDenseMobile ? 0.6 : 1;
                    // Move them further apart to avoid any overlapping
                    const tx = isTwo ? (i === 0 ? -40 * offsetMultiplier : 50 * offsetMultiplier) : i * 15 * offsetMultiplier;
                    const ty = isTwo ? (i === 0 ? -40 * offsetMultiplier : 50 * offsetMultiplier) : i * 15 * offsetMultiplier;
                    // Slightly smaller scale to fit the separation within the container
                    const scale = isTwo ? (isDenseMobile ? 0.8 : 0.8) : 1;
                    
                    return (
                      <div
                        key={variant.$id}
                        className="absolute inset-0 w-full h-full transition-all duration-500 ease-out"
                        style={{
                          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                          zIndex: i === 1 ? 20 : 10,
                        }}
                      >
                        {variant.images.map((img: string, imgIdx: number) => (
                          <Image
                            key={img || `v-soon-${variant.$id}-${imgIdx}`}
                            src={getImageUrl(img)}
                            alt={variant.name}
                            fill
                            quality={100}
                            sizes="(max-width: 768px) 75vw, (max-width: 1200px) 33vw, 25vw"
                            className={`object-contain w-full h-full transition-opacity duration-700 ease-in-out absolute inset-0 ${
                              imgIdx === (currentImageIndex % variant.images.length) ? "opacity-100" : "opacity-0"
                            }`}
                            style={{ transform: 'scale(1.05)' }}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                imagesArray.map((img, i) => {
                  const key = img || `placeholder-${i}`;
                  return (
                    <Image
                      key={key}
                      src={getImageUrl(img)}
                      alt={product.name}
                      fill
                      quality={100}
                      sizes="(max-width: 768px) 75vw, (max-width: 1200px) 33vw, 25vw"
                      className={`object-contain transition-opacity duration-700 ease-in-out
                        absolute inset-0 w-full h-full
                        ${i === currentImageIndex ? "opacity-100 z-10" : "opacity-0 z-0"}
                      `}
                      style={{ position: "absolute", transform: 'scale(1.05)' }}
                    />
                  );
                })
              )}
            </div>
            {/* Compact translucent preview CTA for Coming Soon — smaller, lower, icon-only to reveal background */}
            <div className="absolute left-0 right-0 bottom-2 flex items-end justify-center pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setPreviewIndex(currentImageIndex);
                  setPreviewOpen(true);
                }}
                className="pointer-events-auto bg-white/10 backdrop-blur-sm border border-white/6 text-indigo-600 w-9 h-9 rounded-full flex items-center justify-center shadow-none hover:bg-white/14 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                title="Preview"
                aria-label="Open image preview"
              >
                <ZoomIn className="w-4 h-4" />
                <span className="sr-only">Preview</span>
              </button>
            </div>
          </div>
        )}

        {/* Variant Swatches - Moved here to be directly under the image */}
        {variants.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3 mb-1 px-2">
            {variants.map((v) => (
              <button
                key={v.$id}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  router.push(`/product-details/${v.$id}`);
                }}
                className={`w-4 h-4 rounded-full border ${isStorefrontPage ? 'border-white/20 ring-white' : 'border-black/20 ring-black'} transition-all hover:scale-125 ring-2 ring-offset-1 ${
                  v.$id === product.$id ? (isStorefrontPage ? 'ring-white' : 'ring-black') : 'ring-transparent opacity-60'
                }`}
                style={{ 
                  backgroundColor: Array.isArray(v.colors) ? v.colors[0]?.toLowerCase() : String(v.colors).toLowerCase() 
                }}
                title={Array.isArray(v.colors) ? v.colors[0] : String(v.colors)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className={`flex flex-col gap-2 justify-between items-start w-full mt-auto ${isDenseMobile ? 'pt-1 px-2 pb-2' : 'pt-2 px-4 pb-4'} bg-transparent border-none`}>
        {isStorefrontPage ? (
          <div className="flex w-full flex-col items-start space-y-1 px-1 pt-3 text-left">
            <h3 className="shop-product-name">
              {product.name}
            </h3>
            <p className="pt-1">
              <span className="shop-price">{formatCurrency(product.price, currency)}</span>
            </p>
          </div>
        ) : (
          <>
            {isCategoryPage && renderPriceAndStock()}
            {!isCategoryPage && !isComingSoon && renderPriceAndStock()}

            {isComingSoon ? (
              countdownEnabled && releaseAt && !isReleased ? (
                isPreOrder ? (
                  <button
                    onClick={handlePreOrder}
                    className={`w-full relative z-20 bg-black text-white font-medium rounded-lg shadow-sm flex items-center justify-center ${isDenseMobile ? 'h-8 text-[10px]' : 'h-10 text-sm'} hover:bg-neutral-900 transition-colors`}
                  >
                    <span className="flex items-center justify-center gap-2 w-full">
                      <span className="truncate">{product.preOrderTier ? `Pre-order` : "Pre-order"}</span>
                      {!isDenseMobile && (
                        <span className="text-xs text-white/70">
                          <span className="hidden sm:inline">· In <AnimatedCountdown text={formatCountdown()} className="text-white" dotClass="bg-white/60" /></span>
                          <span className="sm:hidden">· <AnimatedCountdown text={formatShortCountdown()} className="text-white" dotClass="bg-white/60" /></span>
                        </span>
                      )}
                    </span>
                  </button>
                ) : (
                  <button
                    disabled
                    className={`w-full relative z-20 bg-white text-gray-500 font-medium rounded-lg flex items-center justify-center border border-gray-100 ${isDenseMobile ? 'h-8 text-[10px]' : 'h-10 text-sm'} cursor-not-allowed`}
                  >
                    {isDenseMobile ? 'SOON' : `Releases in ${days}d ${hours}h`}
                  </button>
                )
              ) : isPreOrder ? (
                <button
                  onClick={handlePreOrder}
                  className={`w-full bg-black text-white font-medium rounded-lg shadow-sm flex items-center justify-center ${isDenseMobile ? 'h-8 text-[10px]' : 'h-10 text-sm'} hover:bg-neutral-900 transition-colors`}
                >
                  {product.preOrderTier ? `Pre-order — ${product.preOrderTier}` : "Pre-order"}
                </button>
              ) : (
                <button
                  disabled
                  className={`w-full relative z-20 bg-white text-gray-400 font-medium rounded-lg flex items-center justify-center border border-gray-100 ${isDenseMobile ? 'h-8 text-[10px]' : 'h-10 text-sm'} cursor-not-allowed`}
                >
                  Coming Soon
                </button>
              )
            ) : (countdownEnabled && releaseAt && !isReleased) ? (
                <div className={`w-full ${isDenseMobile ? 'h-8 px-1' : 'h-10 px-2'} bg-black text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 text-[10px] cursor-not-allowed`}>
                  <span className="opacity-70 text-[8px] uppercase tracking-wider whitespace-nowrap">{isDenseMobile ? '' : 'Releases in'}</span>
                  <AnimatedCountdown text={isDenseMobile ? formatShortCountdown() : formatCountdown()} className="font-mono" dotClass="bg-white" />
                </div>
            ) : isCategoryPage ? (
              <>
                {product.sizes && product.sizes.length > 0 && (
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className={`border border-gray-200 rounded-lg ${isDenseMobile ? 'text-[10px] px-2 py-1' : 'text-sm px-3 py-2'} bg-white w-full focus:ring-1 focus:ring-black focus:border-black focus:outline-none transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">{isDenseMobile ? 'SIZE' : 'Select Size'}</option>
                    {product.sizes.map((size: string) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => {
                    if (product.customizable && selectedSize) {
                      router.push(
                        `/custom/tshirt?productId=${product.$id}&size=${selectedSize}&color=${
                          product.colors?.[0] || "black"
                        }`
                      );
                    } else if (product.preOrder) {
                      handlePreOrder();
                    } else {
                      handleAddToCart();
                    }
                  }}
                  disabled={(product.sizes?.length && !selectedSize) || (product.stock <= 0 && !product.preOrder)}
                  className={`group relative w-full ${isDenseMobile ? 'h-10 text-[10px]' : 'h-12 text-sm'} flex items-center justify-center overflow-hidden transition-all uppercase font-black italic tracking-tighter ${
                    (product.sizes?.length && !selectedSize) || (product.stock <= 0 && !product.preOrder)
                      ? "bg-white text-zinc-400 border border-gray-100 cursor-not-allowed"
                      : "bg-black text-white hover:bg-neutral-800 hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none"
                  }`}
                >
                  <span className={`absolute left-0 top-0 bottom-0 flex items-center justify-center pl-4 transition-all duration-300 ease-out ${
                    (product.sizes?.length && !selectedSize) || (product.stock <= 0 && !product.preOrder) || isDenseMobile ? "hidden" : "opacity-0 -translate-x-full group-hover:translate-x-0 group-hover:opacity-100"
                  }`}>
                    <ShoppingCart size={14} />
                  </span>
                  <span className="flex items-center justify-center gap-2 transition-all duration-300 ease-out group-hover:translate-x-2">
                    {product.stock <= 0 ? (product.preOrder ? "INITIATE_PRE_ORDER" : "STOCK_DEPLETED") : "ADD_TO_CART"}
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={isPreOrder ? () => router.push(`/product-details/${product.$id}`) : handleShopNow}
                className={`group relative w-full ${isDenseMobile ? 'h-10 text-[10px]' : 'h-12 text-sm'} bg-black text-white font-black italic tracking-tighter uppercase flex items-center justify-center overflow-hidden hover:bg-neutral-800 hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none transition-all`}
              >
                <span className={`absolute left-0 top-0 bottom-0 flex items-center justify-center pl-4 transition-all duration-300 ease-out ${isDenseMobile ? 'hidden' : 'opacity-0 -translate-x-full group-hover:translate-x-0 group-hover:opacity-100'}`}>
                  <ShoppingCart size={14} />
                </span>
                <span className="flex items-center justify-center gap-2 transition-all duration-300 ease-out group-hover:translate-x-2">
                  {isPreOrder ? "INITIATE_PRE_ORDER" : "ACQUIRE_ASSET"}
                </span>
              </button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  </motion.div>
  );
});

export default ProductItem;
