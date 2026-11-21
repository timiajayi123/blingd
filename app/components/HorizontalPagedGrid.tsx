"use client";

import React, { useEffect, useState, useRef, memo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

type Props = {
  items: any[];
  cols?: number | 'auto';
  rows?: number;
  interval?: number;
  itemWidth?: number; // pixel width of an item (used when cols='auto')
  showDots?: boolean;
  autoAdvance?: boolean; // allow enabling auto-advance on non-mobile screens
  renderItem?: (p: any, idx: number) => React.ReactNode;
};

const HorizontalPagedGrid = memo(({ items, cols = 2, rows = 2, interval = 3000, itemWidth = 170, showDots = true, autoAdvance = false, renderItem }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [computedCols, setComputedCols] = useState<number>(typeof cols === 'number' ? Math.max(1, cols) : 2);

  // Recompute columns when in 'auto' mode based on container width and itemWidth
  useEffect(() => {
    if (cols !== 'auto') return;
    const el = containerRef.current;
    
    let ticking = false;
    const recompute = () => {
       if (!el || ticking) return;
       
       ticking = true;
       window.requestAnimationFrame(() => {
         const calc = Math.max(1, Math.floor(el.clientWidth / itemWidth));
         if (calc !== computedCols) {
           setComputedCols(calc);
         }
         ticking = false;
       });
    };

    // Initial check
    recompute();
    const id = setTimeout(recompute, 200);

    const ro = new ResizeObserver(recompute);
    if (el) ro.observe(el);
    window.addEventListener('resize', recompute);
    return () => {
      clearTimeout(id);
      ro.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [cols, itemWidth, computedCols]);

  const colsToUse = cols === 'auto' ? Math.max(1, computedCols) : Math.max(1, cols);
  const pageSize = Math.max(1, colsToUse) * Math.max(1, rows);
  
  // Create pages
  const pages: any[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }

  // Determine if autoplay should be enabled
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  useEffect(() => {
    const checkAutoplay = () => {
      // Enable autoplay if explicitly requested OR if on mobile/tablet (touch devices)
      const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
      setShouldAutoplay(!!autoAdvance || isSmallScreen);
    };

    checkAutoplay();
    window.addEventListener('resize', checkAutoplay);
    return () => window.removeEventListener('resize', checkAutoplay);
  }, [autoAdvance]);

  if (!items || items.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={16}
        slidesPerView={1}
        pagination={showDots && pages.length > 1 ? { clickable: true } : false}
        autoplay={shouldAutoplay && interval > 0 ? {
          delay: interval,
          disableOnInteraction: false,
        } : false}
        loop={pages.length > 1}
        className="pb-12" // Add padding for pagination dots
      >
        {pages.map((page, i) => (
          <SwiperSlide key={i} className="h-auto">
             <div className="w-full px-1">
                <div 
                  className="grid gap-4" 
                  style={{ 
                    gridTemplateColumns: `repeat(${colsToUse}, minmax(0, 1fr))`,
                    // If items are fewer than pageSize, they will just fill the available slots
                  }}
                >
                  {page.map((p, idx) => (
                    <div key={(p && p.$id) || idx} className="h-full">
                      {renderItem ? renderItem(p, idx) : null}
                    </div>
                  ))}
                </div>
             </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom styles for swiper pagination to match previous look if needed */}
      <style jsx global>{`
        .swiper-pagination-bullet {
          background: #d1d5db;
          opacity: 1;
          width: 24px;
          height: 6px;
          border-radius: 9999px;
          transition: all 0.3s;
          margin-top: 10px;
        }
        .swiper-pagination-bullet-active {
          background: #1f2937;
          width: 32px;
        }
        .swiper-horizontal > .swiper-pagination-bullets, .swiper-pagination-bullets.swiper-pagination-horizontal {
          bottom: 0px;
        }
      `}</style>
    </div>
  );
});

export default HorizontalPagedGrid;
