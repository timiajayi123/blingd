
"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { getPublicMediaUrl } from "@/lib/publicMedia";

const StorefrontLogoLoader = ({ onComplete }: { onComplete?: () => void }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4000); // 4 seconds total duration
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleInteraction = () => {
    if (audioRef.current && !audioEnabled) {
      audioRef.current.play().then(() => {
        setAudioEnabled(true);
      }).catch(err => console.log("Audio play failed:", err));
    }
  };

  if (!isMounted) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black cursor-pointer overflow-hidden"
      onClick={handleInteraction}
    >
      {/* Rising Fire Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              scale: 0, 
              y: "110%", 
              x: (Math.random() * 100) + "%" 
            }}
            animate={{ 
              opacity: [0, 0.6, 0.3, 0], 
              scale: [0, Math.random() * 1.5 + 0.5, 0],
              y: "-10%",
              x: (Math.random() * 100) + "%",
            }}
            transition={{ 
              duration: 3 + Math.random() * 4, 
              repeat: Infinity, 
              delay: Math.random() * 5,
              ease: "easeOut"
            }}
            className="absolute w-1.5 h-1.5 bg-white rounded-full blur-[1px] shadow-[0_0_12px_rgba(255,255,255,0.8)]"
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: "brightness(0) blur(10px)" }}
          animate={{ 
            opacity: [0, 1, 1], 
            scale: [0.9, 1, 1.05],
            filter: ["brightness(0) blur(10px)", "brightness(1.8) blur(0px)", "brightness(1.2) blur(0px)"]
          }}
          exit={{ 
            opacity: 0, 
            scale: 1.2, 
            filter: "brightness(3) blur(20px)",
            transition: { duration: 1, ease: "easeIn" }
          }}
          transition={{ 
            duration: 4, 
            times: [0, 0.4, 1],
            ease: "easeOut" 
          }}
          className="relative w-64 h-64 md:w-[480px] md:h-[480px]"
        >
          {/* Main Base Logo */}
          <Image
            src={getPublicMediaUrl("/placeholder.svg")}
            alt="BLING’D"
            fill
            className="object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            priority
          />

          {/* Animated "Fire" Tribal Part - Layer 1 */}
          <motion.div
            animate={{ 
              opacity: [0.4, 0.8, 0.4],
              scaleY: [1, 1.08, 1],
              skewX: [-1, 2, -1],
              filter: ["brightness(1) contrast(1.2)", "brightness(2) contrast(1.5)", "brightness(1) contrast(1.2)"]
            }}
            transition={{ 
              duration: 0.15, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            style={{ 
              maskImage: 'linear-gradient(to top, white, transparent 60%)',
              WebkitMaskImage: 'linear-gradient(to top, white, transparent 60%)'
            }}
            className="absolute inset-0 z-10 pointer-events-none"
          >
            <Image
              src={getPublicMediaUrl("/placeholder.svg")}
              alt=""
              fill
              className="object-contain"
            />
          </motion.div>

          {/* Animated "Fire" Tribal Part - Layer 2 (Faster/Subtle) */}
          <motion.div
            animate={{ 
              opacity: [0.2, 0.5, 0.2],
              scaleX: [1, 1.05, 1],
              y: [0, -2, 0],
            }}
            transition={{ 
              duration: 0.1, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            style={{ 
              maskImage: 'linear-gradient(to top, white, transparent 40%)',
              WebkitMaskImage: 'linear-gradient(to top, white, transparent 40%)',
              filter: 'blur(4px) brightness(2)'
            }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <Image
              src={getPublicMediaUrl("/placeholder.svg")}
              alt=""
              fill
              className="object-contain"
            />
          </motion.div>
        </motion.div>

        {/* Minimal Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{ delay: 1, duration: 1.5 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-40 h-[1px] bg-white/5 relative overflow-hidden rounded-full">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 3, ease: [0.65, 0, 0.35, 1], repeat: Infinity }}
              className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />
          </div>
          <p className="text-[9px] font-mono tracking-[0.6em] text-white/30 uppercase">
            Initialising_Consciousness
          </p>
        </motion.div>
      </div>

      {!audioEnabled && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          className="absolute bottom-12 text-[7px] font-mono tracking-widest text-white/40 uppercase"
        >
          Click to enable audio
        </motion.p>
      )}

      <audio ref={audioRef} src="/placeholder.svg" loop />
    </motion.div>
  );
};

export default StorefrontLogoLoader;
