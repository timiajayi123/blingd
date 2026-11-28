"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HomeCarousel({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const imageCount = images.length;

  useEffect(() => {
    if (imageCount < 2) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % imageCount), 5500);
    return () => window.clearInterval(timer);
  }, [imageCount]);

  if (!imageCount) return null;

  const select = (index: number) => setActiveIndex((index + imageCount) % imageCount);

  return (
    <div className="absolute inset-0 z-0 bg-black" aria-label="Homepage campaign images">
      {images.map((image, index) => (
        <img
          key={image}
          src={image}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-black/35" />
      {imageCount > 1 && <>
        <button type="button" onClick={() => select(activeIndex - 1)} aria-label="Previous image" className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur transition hover:bg-black/45 sm:left-7"><ChevronLeft size={20} /></button>
        <button type="button" onClick={() => select(activeIndex + 1)} aria-label="Next image" className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur transition hover:bg-black/45 sm:right-7"><ChevronRight size={20} /></button>
        <div className="absolute inset-x-0 bottom-8 flex justify-center gap-2" aria-label="Carousel navigation">
          {images.map((image, index) => <button key={image} type="button" onClick={() => select(index)} aria-label={`Show image ${index + 1}`} aria-current={index === activeIndex} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-8 bg-white" : "w-1.5 bg-white/55 hover:bg-white"}`} />)}
        </div>
      </>}
    </div>
  );
}
