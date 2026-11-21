
"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getPublicMediaUrl } from "@/lib/publicMedia";

const StorefrontLoadingScreen = ({ onComplete, whiteBackground = false, transparentBackground = false }: { onComplete?: () => void, whiteBackground?: boolean, transparentBackground?: boolean }) => {
  const fullText = "BLING’D";
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<"opening" | "typing" | "waiting" | "deleting">("opening");

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === "opening") {
      timer = setTimeout(() => setPhase("typing"), 200);
    } else if (phase === "typing") {
      if (displayText.length < fullText.length) {
        timer = setTimeout(() => {
          setDisplayText(fullText.slice(0, displayText.length + 1));
        }, 30);
      } else {
        timer = setTimeout(() => setPhase("waiting"), 300);
      }
    } else if (phase === "waiting") {
      timer = setTimeout(() => setPhase("deleting"), 150);
    } else if (phase === "deleting") {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 30);
      } else {
        timer = setTimeout(() => {
          if (onComplete) onComplete();
        }, 100);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, phase, onComplete, fullText]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed inset-0 flex items-center justify-center z-[9999] overflow-hidden ${transparentBackground ? 'bg-transparent' : whiteBackground ? 'bg-white' : 'bg-black/10 backdrop-blur-[2px]'}`} 
    >
      <div className="flex flex-col items-center gap-8 px-8 md:px-16 overflow-visible">
          <div className="flex items-center overflow-visible w-full justify-center">
            <div className="flex items-center flex-nowrap overflow-visible pr-2 md:pr-8 min-w-[1ch]">
              <motion.img
                src={getPublicMediaUrl("/placeholder.svg")}
                alt="Loading..."
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: [0.5, 1, 0.5], 
                  scale: [0.95, 1.05, 0.95] 
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-64 h-64 md:w-96 md:h-96 object-contain"
              />
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StorefrontLoadingScreen;
