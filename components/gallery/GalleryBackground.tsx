"use client";

import OptimizedVideo from "@/components/ui/OptimizedVideo";
import Image from "next/image";
import { getImageUrl } from "@/lib/getImageUrl";
import { getPublicMediaUrl } from "@/lib/publicMedia";

type GalleryBackgroundProps = {
  bgItems: any[];
};

export default function GalleryBackground({ bgItems }: GalleryBackgroundProps) {
  return (
    <div className="fixed inset-0 z-0 grid grid-cols-[1.2fr_1fr] md:grid-cols-[1.5fr_1fr] gap-1 md:gap-[2px] pointer-events-none">
      {/* Left Column: Big Rectangular Image */}
      <div className="relative h-full w-full overflow-hidden">
        {bgItems[0]?.videoUrl ? (
          <OptimizedVideo
            src={bgItems[0].videoUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-30 md:opacity-20 md:grayscale transition-all duration-1000"
            desktopOnly={true}
            fallbackImage={getImageUrl(bgItems[0]?.image || getPublicMediaUrl("/placeholder.svg"))}
          />
        ) : (
          <Image 
            src={getImageUrl(bgItems[0]?.image || getPublicMediaUrl("/placeholder.svg"))}
            alt="" 
            fill 
            className="object-cover opacity-30 md:opacity-20 md:grayscale transition-all duration-1000"
            priority
          />
        )}
      </div>

      {/* Right Column: Two Squares vertically split */}
      <div className="grid grid-rows-2 gap-1 md:gap-[2px] h-full w-full overflow-hidden">
        <div className="relative h-full w-full overflow-hidden">
            {bgItems[1]?.videoUrl ? (
              <OptimizedVideo
                src={bgItems[1].videoUrl}
                className="absolute inset-0 w-full h-full object-cover opacity-30 md:opacity-20 md:grayscale transition-all duration-1000"
                desktopOnly={true}
                fallbackImage={getImageUrl(bgItems[1]?.image || getPublicMediaUrl("/placeholder.svg"))}
              />
            ) : (
              <Image 
                src={getImageUrl(bgItems[1]?.image || getPublicMediaUrl("/placeholder.svg"))}
                alt="" 
                fill 
                className="object-cover opacity-30 md:opacity-20 md:grayscale transition-all duration-1000"
              />
            )}
        </div>
        <div className="relative h-full w-full overflow-hidden">
            {bgItems[2]?.videoUrl ? (
              <OptimizedVideo
                src={bgItems[2].videoUrl}
                className="absolute inset-0 w-full h-full object-cover opacity-30 md:opacity-20 md:grayscale transition-all duration-1000"
                desktopOnly={true}
                fallbackImage={getImageUrl(bgItems[2]?.image || getPublicMediaUrl("/placeholder.svg"))}
              />
            ) : (
              <Image 
                src={getImageUrl(bgItems[2]?.image || getPublicMediaUrl("/placeholder.svg"))}
                alt="" 
                fill 
                className="object-cover opacity-30 md:opacity-20 md:grayscale transition-all duration-1000"
              />
            )}
        </div>
      </div>

      {/* Overlays for depth and readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJmZ3ZyeGZ6Z3ZyeGZ6Z3ZyeGZ6Z3ZyeGZ6Z3ZyeGZ6Z3ZyeGZ6Z3ZyeGZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/oEI9uWUicKgZSMmAdq/giphy.gif')] bg-cover bg-center opacity-5 mix-blend-overlay" />
    </div>
  );
}
