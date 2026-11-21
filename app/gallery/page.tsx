import { getServerBanners } from "@/lib/serverBanners";
import { Metadata } from "next";

import GalleryClient from "./GalleryClient";
import GalleryBackground from "@/components/gallery/GalleryBackground";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Visual archive of the BLING’D universe.",
  alternates: { canonical: "/gallery" },
  openGraph: { url: "/gallery" },
};

export default async function GalleryPage() {
  try {
    const banners = await getServerBanners();
    
    // We treat all banners as our gallery content to ensure the archive is always populated
    // Users can still manage this via the banners collection
    const galleryContent = banners;
    
    // Pick images for the grid background
    const bgItems = banners.length > 0 
      ? [
          banners[0],
          banners[Math.min(1, banners.length - 1)],
          banners[Math.min(2, banners.length - 1)]
        ]
      : [];

    return (
      <div className="bg-black min-h-screen pt-20 pb-24 relative flex flex-col items-center">
        {/* Background Image Grid Overlay - Fixed to viewport to prevent stretching */}
        <GalleryBackground bgItems={bgItems} />

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="flex flex-col items-center mb-16 md:mb-24 space-y-4 md:space-y-6">
            <h1 className="text-2xl md:text-6xl font-street text-white italic tracking-[0.1em] md:tracking-[0.2em] lowercase leading-none glitch-text" data-text="visual archive">
              visual archive
            </h1>
            <div className="flex items-center gap-4 md:gap-6">
              <div className="h-px w-12 md:w-16 bg-white/20" />
              <span className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-[0.4em] md:tracking-[0.6em]">storefront_gallery_v1.0</span>
              <div className="h-px w-12 md:w-16 bg-white/20" />
            </div>
          </div>
          
          <GalleryClient initialContent={galleryContent} />
        </div>
      </div>
    );
  } catch (err) {
    console.error("Failed to load gallery:", err);
    return (
      <div className="bg-black min-h-screen flex items-center justify-center p-6 text-white font-mono uppercase tracking-widest">
        System Error: Failed to retrieve visual assets.
      </div>
    );
  }
}
