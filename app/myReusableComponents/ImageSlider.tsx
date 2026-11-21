"use client";
import React, { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { getBanners } from "@/lib/api"; // ✅ your Appwrite API function
import { motion, AnimatePresence } from "framer-motion";

const ImageSlider = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesReady, setImagesReady] = useState(false);

  const preloadImages = (urls: string[]) =>
    Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
          })
      )
    );

  useEffect(() => {
    let mounted = true;
    const loadBanners = async () => {
      try {
        const res = await getBanners();
        const rows = res || [];
        if (!mounted) return;
        setBanners(rows);
        if (typeof window !== 'undefined') console.log('banners-loaded', { count: rows.length, rows });
        const urls = rows
          .flatMap((r: any) =>
            Array.isArray(r.images) && r.images.length > 0 ? r.images : [r.image]
          )
          .filter(Boolean);
        if (urls.length > 0) {
          await preloadImages(urls);
        }
        if (!mounted) return;
        setImagesReady(true);
      } catch (err) {
        console.error("❌ Failed to load banners:", err);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    loadBanners();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full rounded-2xl overflow-hidden clean-shadow hover:shadow-xl transition-shadow duration-300 relative group">
      {/* Animated "Snake" Border - Only visible on mobile per request */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-2xl lg:hidden">
        <svg className="w-full h-full" style={{ overflow: 'visible' }}>
          <motion.rect
            x="1"
            y="1"
            width="calc(100% - 2px)"
            height="calc(100% - 2px)"
            rx="16"
            fill="none"
            stroke="black"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0.15, pathOffset: 0 }}
            animate={{ 
              pathOffset: [0, 1],
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
        </svg>
      </div>

      <div className="w-full h-auto min-h-[200px] md:h-[560px]">
        <AnimatePresence>
          {(!imagesReady || loading) && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="w-full h-[240px] md:h-full bg-gray-50 flex items-center justify-center"
            >
              <div className="w-full h-full bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 animate-loading-bar" />
            </motion.div>
          )}

          {imagesReady && banners.length > 0 && (
            <motion.div
              key="carousel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full"
            >
              <Carousel
                opts={{ loop: true }} // ✅ keeps looping
                plugins={[
                  Autoplay({
                    delay: 3000,
                    stopOnInteraction: false, // ✅ keeps autoplaying
                  }),
                ]}
                className="w-full h-full"
              >
                <CarouselContent>
                  {banners.map((banner, index) => (
                    <CarouselItem
                      key={banner.id || index}
                      className="w-full h-full"
                    >
                      <a href={banner.link || "#"} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative overflow-hidden bg-white">
                        {banner.type === "photoDump" &&
                        Array.isArray(banner.images) &&
                        banner.images.length > 0 ? (
                          <div className="w-full h-[360px] md:h-[560px] grid grid-cols-2 grid-rows-2 gap-1 bg-black">
                            {banner.images.slice(0, 4).map((src: string, i: number) => {
                              if (!src) return null;
                              return (
                                <motion.img
                                  key={i}
                                  src={src}
                                  alt={banner.title || `Slide ${index + 1}`}
                                  initial={{ opacity: 0, scale: 1.03 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.8 }}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    console.error(`❌ Carousel Item Image failed to load:`, {
                                      src: target.src,
                                      bannerId: banner.id,
                                      title: banner.title
                                    });
                                  }}
                                />
                              );
                            })}
                          </div>
                        ) : banner.image ? (
                          <motion.img
                            src={banner.image}
                            alt={banner.title || `Slide ${index + 1}`}
                            initial={{ opacity: 0, scale: 1.03 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            className="w-full h-auto min-h-[200px] max-h-[400px] md:max-h-none md:h-full object-contain md:object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.error(`❌ Banner Image failed to load:`, {
                                src: target.src,
                                bannerId: banner.id,
                                title: banner.title
                              });
                            }}
                          />
                        ) : null}
                      </a>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ImageSlider;
