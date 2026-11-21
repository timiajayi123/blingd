"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import OptimizedVideo from "@/components/ui/OptimizedVideo";

export default function HomeHero({
  backgroundType,
  videoUrl,
  posterUrl,
  imageUrl,
}: {
  backgroundType: "video" | "image";
  videoUrl: string;
  posterUrl?: string;
  imageUrl?: string;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsNavigating(false);
  }, []);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const muted = !videoRef.current.muted;
    videoRef.current.muted = muted;
    videoRef.current.volume = muted ? 0 : 1;
    setIsMuted(muted);
  };

  return (
    <div className="bg-black text-white selection:bg-white selection:text-black">
      <section className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {backgroundType === "image" && imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover object-center" />
          ) : (
            <OptimizedVideo
              ref={videoRef}
              src={videoUrl}
              poster={posterUrl}
              fallbackImage={posterUrl}
              className="h-full w-full object-cover object-center"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              priority
            />
          )}
        </div>
        <div className="absolute inset-0 bg-black/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-end gap-8 px-4 pb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center gap-4"
          >
            <Link
              href="/store"
              prefetch
              className="group relative inline-flex items-center gap-6 overflow-hidden rounded-full border border-white/20 bg-black/40 px-10 py-5 text-xs font-black uppercase tracking-[0.3em] text-white shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-500 hover:scale-110 hover:border-white/50 hover:bg-black/60 md:text-sm"
              onClick={(event) => {
                if (isNavigating) {
                  event.preventDefault();
                  return;
                }
                setIsNavigating(true);
                toast.loading("Entering The Other Side...", {
                  position: "bottom-center",
                  duration: Infinity,
                  id: "navigate-to-shop",
                });
              }}
            >
              <span className="relative z-10">ENTER THE OTHER SIDE</span>
              <div className="relative z-10 -mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-all duration-500 ease-out group-hover:translate-x-2 group-hover:rotate-45">
                <ArrowRight size={16} />
              </div>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            </Link>

            {backgroundType === "video" && <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? "Unmute video" : "Mute video"}
                  className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/20 p-3 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-md transition-all duration-300 hover:bg-white/30"
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-white opacity-80">
                  {isMuted ? "CLICK TO UNMUTE" : "AUDIO ON"}
                </span>
              </motion.div>
            </AnimatePresence>}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
