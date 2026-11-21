"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { getSideAds } from "@/lib/api";

type SideBannerProps = {
  position?: "left" | "right"; // optional for Swiper
  image?: string; // optional for single image
  link?: string;  // optional for single image
};

const SideBanner = ({ position, image, link }: SideBannerProps) => {
  const [ads, setAds] = useState<any[]>([]);

  useEffect(() => {
    // Only fetch if no image is provided (i.e., Swiper mode)
    if (!image && position) {
      const loadAds = async () => {
        try {
          const res = await getSideAds();
          // only keep ads for this position
          setAds(res.filter((ad: any) => ad.position === position));
        } catch (error) {
          console.error("❌ Failed to load side ads:", error);
        }
      };
      loadAds();
    }
  }, [position, image]);

  // Single image mode (passed via props)
  if (image) {
    return (
      <motion.a
        href={link ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.45 }}
        className="relative block w-[320px] h-[480px] rounded-2xl overflow-hidden clean-shadow hover:shadow-xl transition-shadow duration-300 bg-white group"
      >
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

        <motion.img
          src={image}
          alt="Side Banner"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full h-auto object-contain"
        />
      </motion.a>
    );
  }

  // Swiper vertical ads mode
  if (ads.length === 0) {
    return (
      <div className="w-[320px] h-[480px] flex items-center justify-center bg-gray-50 rounded-2xl clean-shadow relative">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative w-[320px] h-[480px] rounded-2xl overflow-hidden clean-shadow hover:shadow-xl transition-shadow duration-300 bg-white flex items-center group">
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

      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 2500, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        direction="vertical"
        className="w-full h-full"
      >
        {ads.map((ad, index) => (
          <SwiperSlide key={ad.id || index} className="relative">
            <a href={ad.link || "#"} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
              <motion.img
                src={ad.image}
                alt={ad.title || `Ad ${index}`}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                whileHover={{ scale: 1.04 }}
                className="w-full h-auto object-contain"
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default SideBanner;
