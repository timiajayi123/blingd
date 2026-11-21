'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-50" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase italic leading-none">
              BLING’D
            </h1>
            <div className="max-w-2xl mx-auto space-y-6">
              <p className="text-lg md:text-xl text-zinc-400 font-medium leading-relaxed tracking-wide">
                HIGH-END STREETWEAR PUSHING THE BOUNDARIES OF CONTEMPORARY FASHION. BOLD. UNAPOLOGETIC. DIFFERENT.
              </p>
              <div className="w-12 h-[1px] bg-zinc-800 mx-auto" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 border-y border-zinc-900">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">THE IDENTITY</h2>
              <p className="text-zinc-500 leading-relaxed text-lg">
                BLING’D IS MORE THAN A BRAND. IT IS A MANIFESTATION OF THE SELF THAT DARES TO STEP OUTSIDE THE NORM. 
              </p>
              <p className="text-zinc-500 leading-relaxed text-lg">
                BASED IN LAGOS, WE CRAFT PIECES THAT BRIDGE THE GAP BETWEEN ARCHITECTURAL DESIGN AND URBAN NECESSITY.
              </p>
            </motion.div>
            
            <div className="relative aspect-square bg-zinc-900/50 rounded-2xl flex items-center justify-center overflow-hidden group">
               <div className="text-center space-y-2">
                 <p className="text-6xl font-black italic tracking-tighter opacity-20 group-hover:opacity-100 transition-opacity duration-700">EST. 2024</p>
                 <p className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">NIGERIA_OFFICIAL</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Banner */}
      <section className="py-40 relative overflow-hidden bg-white text-black">
        <div className="container mx-auto px-6 text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[10px] font-mono font-black uppercase tracking-[0.5em] mb-8">THE_MISSION</h2>
            <p className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-[1.1] max-w-4xl mx-auto">
              "TO EMPOWER THE INDIVIDUAL THROUGH UNCOMPROMISING AESTHETICS AND SUPERIOR CRAFTSMANSHIP."
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 text-center bg-black">
        <div className="container mx-auto px-6 space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase">JOIN THE MOVEMENT</h2>
            <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">ACCESS_GRANTED</p>
          </div>
          
          <Link 
            href="/store" 
            className="inline-flex items-center gap-4 bg-white text-black px-12 py-6 rounded-full font-black uppercase italic tracking-tighter hover:scale-105 transition-all duration-300 shadow-2xl shadow-white/5 group"
          >
            Enter Shop
            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
