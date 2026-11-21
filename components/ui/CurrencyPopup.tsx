"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCartStore } from "@/app/Store/CartStore";

const currencies = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira (NGN)" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP)" },
  { code: "USD", symbol: "$", label: "US Dollar (USD)" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar (CAD)" },
];

const countryByCurrency: Record<string, string> = {
  NGN: "NG",
  USD: "US",
  GBP: "GB",
  CAD: "CA",
};

export default function CurrencyPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [callback, setCallback] = useState<(() => void) | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const {
    currency,
    destinationCountry,
    setCurrency,
    setDestinationCountry,
  } = useCartStore();

  useEffect(() => {
    const matchingCountry = countryByCurrency[currency];
    if (matchingCountry && matchingCountry !== destinationCountry) {
      setDestinationCountry(matchingCountry);
    }
  }, [currency, destinationCountry, setDestinationCountry]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ force?: boolean; callback?: () => void }>).detail;
      const suppressed = localStorage.getItem("suppress-currency-popup") === "true";
      const forceOpen = detail?.force === true;
      const destinationConfirmed =
        localStorage.getItem("storefront-destination-confirmed") === "true";
      if (!forceOpen && !destinationConfirmed) return;
      if (!suppressed || forceOpen) {
        setIsOpen(true);
        setSelectedCode(currency);
        setCallback(() => detail?.callback || null);
      } else {
        // If suppressed, just run the callback immediately
        if (detail?.callback) {
          detail.callback();
        }
      }
    };
    window.addEventListener("open-currency-selector", handleOpen);
    return () => window.removeEventListener("open-currency-selector", handleOpen);
  }, [currency]);

  const handleCurrencyClick = (code: string) => {
    confirmCurrency(code);
  };

  const confirmCurrency = (code: string) => {
    localStorage.setItem("user-currency", code);
    if (dontShowAgain) localStorage.setItem("suppress-currency-popup", "true");
    setCurrency(code);
    const matchingCountry = countryByCurrency[code];
    if (matchingCountry) setDestinationCountry(matchingCountry);
    setIsOpen(false);
    setSelectedCode(null);
    if (callback) {
      callback();
      setCallback(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white/60 backdrop-blur-2xl w-full max-w-sm rounded-3xl overflow-hidden relative p-8 border border-white/30 shadow-2xl"
        >
          <button 
            onClick={() => { setIsOpen(false); setCallback(null); }}
            className="absolute top-4 right-4 p-2 text-black/40 hover:text-black transition-colors"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-8">
             <h2 className="text-xl font-mono font-black uppercase tracking-[0.2em] mb-2 text-black">Select Currency</h2>
             <p className="text-[10px] font-mono text-black/60 uppercase tracking-widest">Currency also sets your delivery country</p>
          </div>

          <div className="flex flex-col gap-3">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => handleCurrencyClick(curr.code)}
                className={`group flex items-center justify-between p-4 bg-white/40 border transition-all rounded-xl ${
                  selectedCode === curr.code 
                    ? "border-black bg-white/60 shadow-lg scale-[1.02]" 
                    : "border-white/50 hover:bg-white/60 hover:border-black/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 flex items-center justify-center rounded-full font-mono font-black transition-colors ${
                    selectedCode === curr.code ? "bg-black text-white" : "bg-black/10 text-black"
                  }`}>
                    {curr.symbol}
                  </span>
                  <span className="text-xs font-mono font-black uppercase tracking-widest text-black">{curr.code}</span>
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-widest transition-all ${
                  selectedCode === curr.code 
                    ? "text-black font-black" 
                    : "text-black/60 group-hover:text-black font-bold"
                }`}>
                  {selectedCode === curr.code ? "SELECTED" : curr.label}
                </span>
              </button>
            ))}
          </div>

          {/* Don't show again checkbox */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <input 
              type="checkbox" 
              id="dontShow" 
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-black/20 text-black focus:ring-black cursor-pointer bg-white/40"
            />
            <label htmlFor="dontShow" className="text-[10px] font-mono text-black/80 uppercase tracking-widest cursor-pointer select-none font-black">
              Don&apos;t show this again
            </label>
          </div>

          <div className="mt-8 pt-6 border-t border-black/10 text-center">
             <p className="text-[8px] font-mono text-black/40 uppercase tracking-[0.4em] font-black">SYSTEM_VERSION_4.0.2</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
