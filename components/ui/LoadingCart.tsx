"use client";

import { motion } from "framer-motion";

export const CartLoader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-[9999]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center"
      >
        <div className="relative flex items-center justify-center w-32 h-32 mb-12">
            {/* Industrial Square Frame */}
            <motion.div
                className="absolute w-full h-full border-4 border-primary rounded-none"
                animate={{ rotate: 90 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "anticipate" }}
            />
            
            {/* Pulsing Core */}
             <motion.div
                className="absolute w-2/3 h-2/3 bg-primary/20 rounded-none"
                animate={{ scale: [0.9, 1.1, 0.9], rotate: [0, -90, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

          {/* Center Text */}
          <motion.div
            className="text-primary font-black text-4xl italic tracking-tighter z-10"
            animate={{ skewX: [-10, 10, -10] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
          >
            AE
          </motion.div>
        </div>
        
        <div className="space-y-4 text-center">
          <motion.h2 
            animate={{ letterSpacing: ["0.2em", "0.5em", "0.2em"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-4xl font-black text-white uppercase italic tracking-tighter"
          >
            BLING’D
          </motion.h2>
          <motion.div 
            className="h-1 w-24 bg-primary mx-auto"
            animate={{ width: ["0px", "100px", "0px"] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.p 
            className="text-[10px] font-black tracking-[0.8em] text-primary uppercase"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            LOADING DISRUPTION
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};
