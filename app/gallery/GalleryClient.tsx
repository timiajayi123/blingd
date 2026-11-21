"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import Image from "next/image";
import { getImageUrl } from "@/lib/getImageUrl";
import { useState, useEffect } from "react";
import OptimizedVideo from "@/components/ui/OptimizedVideo";

type GalleryItem = {
  id: string;
  title: string;
  image: string;
  images: string[];
  type: string;
  videoUrl?: string;
};

export default function GalleryClient({ initialContent }: { initialContent: GalleryItem[] }) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const openLightbox = (item: GalleryItem) => {
    console.log("📸 Opening Lightbox for item:", {
      id: item.id,
      title: item.title,
      hasVideo: !!item.videoUrl,
      videoUrl: item.videoUrl,
      imageCount: item.images.length
    });
    setSelectedItem(item);
    setCurrentImageIndex(0);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setSelectedItem(null);
    document.body.style.overflow = "auto";
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedItem) return;
    setCurrentImageIndex((prev) => (prev + 1) % selectedItem.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedItem) return;
    setCurrentImageIndex((prev) => (prev - 1 + selectedItem.images.length) % selectedItem.images.length);
  };

  return (
    <div className="w-full">
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-min">
        {initialContent.map((item, i) => {
          // Calculate grid positioning for the "1 big left, 2 small right" pattern
          // We apply this pattern in blocks of 3 items
          const itemIndexInBlock = i % 3;
          
          let gridClass = "";
          if (itemIndexInBlock === 0) {
            // Big item: Spans 2 rows and 1 column on mobile, 2 rows and 2 columns on desktop
            gridClass = "col-span-1 row-span-2 md:col-span-2 md:row-span-2 aspect-[3/4] md:aspect-square";
          } else {
            // Small items: 1x1
            gridClass = "col-span-1 row-span-1 aspect-square";
          }

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative group cursor-pointer overflow-hidden border border-white/5 shadow-sm hover:shadow-2xl transition-all duration-500 ${gridClass}`}
              onClick={() => openLightbox(item)}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              {/* Snake Border Animation */}
              <div className="absolute inset-0 pointer-events-none z-30">
                <svg className="w-full h-full">
                  <motion.rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="100 400"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -500 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </svg>
              </div>

              {/* Thumbnail */}
              <div className="relative w-full h-full bg-zinc-100">
                {item.videoUrl && !isMobile && hoveredItemId === item.id ? (
                  <OptimizedVideo
                    src={item.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    desktopOnly={true}
                    fallbackImage={getImageUrl(item.image)}
                  />
                ) : (
                  <Image
                    src={getImageUrl(item.image)}
                    alt={item.title}
                    fill
                    className="object-cover md:grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  />
                )}
              
              {/* Type Badge */}
              <div className="absolute top-4 right-4 z-10">
                {item.videoUrl ? (
                  <div className="p-2 bg-black text-white rounded-full">
                    <Play size={14} fill="currentColor" />
                  </div>
                ) : item.images.length > 1 ? (
                  <div className="px-3 py-1 bg-white text-black text-[8px] font-black uppercase tracking-widest border border-black/10">
                    {item.images.length} PHOTOS
                  </div>
                ) : (
                  <div className="p-2 bg-white/80 text-black rounded-full backdrop-blur-sm">
                    <Camera size={14} />
                  </div>
                )}
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.5em] border-b border-white pb-1">
                  VIEW_ASSET
                </span>
              </div>
            </div>
          </motion.div>
        )})}
      </div>

      {initialContent.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-20">
          <div className="w-16 h-px bg-white" />
          <p className="text-xs font-mono uppercase tracking-[0.5em] text-white">ARCHIVE_EMPTY</p>
          <div className="w-16 h-px bg-white" />
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
            onClick={closeLightbox}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
                  {selectedItem.title}
                </span>
                {selectedItem.images.length > 1 && (
                  <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">
                    IMAGE {currentImageIndex + 1} OF {selectedItem.images.length}
                  </span>
                )}
              </div>
              <button className="p-2 text-white hover:scale-110 transition-transform">
                <X size={24} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative flex items-center justify-center p-4 md:p-12 overflow-hidden">
              {selectedItem.videoUrl ? (
                <div className="w-full max-w-5xl aspect-video bg-black shadow-2xl">
                  <OptimizedVideo
                    src={selectedItem.videoUrl}
                    className="w-full h-full object-contain"
                    desktopOnly={false}
                    autoPlay={true}
                    preload="auto"
                    controls={true}
                  />
                </div>
              ) : (
                <div className="relative w-full h-full max-w-6xl">
                  <Image
                    src={getImageUrl(selectedItem.images[currentImageIndex])}
                    alt={selectedItem.title}
                    fill
                    className="object-contain"
                    priority
                  />
                  
                  {/* Navigation */}
                  {selectedItem.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-4 text-white/20 hover:text-white transition-colors"
                      >
                        <ChevronLeft size={48} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-white/20 hover:text-white transition-colors"
                      >
                        <ChevronRight size={48} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Lightbox Footer */}
            <div className="p-8 flex justify-center border-t border-white/5">
              <button 
                onClick={closeLightbox}
                className="px-12 py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.5em] hover:bg-zinc-200 transition-all"
              >
                CLOSE_ARCHIVE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
