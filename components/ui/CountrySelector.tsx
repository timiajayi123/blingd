"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe2, X } from "lucide-react";
import { useCartStore } from "@/app/Store/CartStore";
import { usePathname } from "next/navigation";

const countries = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN", ready: true },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    currency: "USD",
    ready: true,
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    ready: true,
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    ready: true,
  },
] as const;

export default function CountrySelector() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isAdminPath =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const { destinationCountry, setDestinationCountry, setCurrency } =
    useCartStore();

  useEffect(() => {
    if (isAdminPath) {
      setOpen(false);
      return;
    }
    const promptedThisSession = window.sessionStorage.getItem(
      "storefront-destination-prompted",
    );
    if (promptedThisSession) return;
    const timeout = window.setTimeout(() => {
      window.sessionStorage.setItem(
        "storefront-destination-prompted",
        "true",
      );
      setOpen(true);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [isAdminPath]);

  const selected =
    countries.find((country) => country.code === destinationCountry) ||
    countries[0];

  const selectCountry = (country: (typeof countries)[number]) => {
    setDestinationCountry(country.code);
    setCurrency(country.currency);
    window.localStorage.setItem("storefront-destination-confirmed", "true");
    window.sessionStorage.setItem("storefront-destination-prompted", "true");
    setOpen(false);
  };

  if (isAdminPath || pathname === "/") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-40 flex min-h-12 items-center gap-2 rounded-full border border-white/30 bg-black/80 px-4 py-3 text-white shadow-2xl backdrop-blur-xl transition hover:bg-black sm:bottom-7 sm:right-7"
        aria-label={`Delivery country: ${selected.name}. Change country`}
      >
        <Globe2 size={17} />
        <span className="text-sm" aria-hidden="true">
          {selected.flag}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em]">
          {selected.code}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="presentation"
          >
            <motion.section
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="country-selector-title"
              className="relative w-full max-w-md rounded-[2rem] bg-white p-6 text-black shadow-2xl sm:p-8"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-black"
                aria-label="Close country selector"
              >
                <X size={18} />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                Shipping destination
              </p>
              <h2
                id="country-selector-title"
                className="mt-2 pr-10 text-2xl font-black tracking-tight text-black"
              >
                Where are we delivering?
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                This sets your display currency and the shipping options shown
                at checkout.
              </p>

              <div className="mt-6 space-y-3">
                {countries.map((country) => {
                  const active = country.code === destinationCountry;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => selectCountry(country)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-black bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">
                          {country.flag}
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-black">
                            {country.name}
                          </span>
                          <span
                            className={`mt-1 block text-[10px] font-bold uppercase tracking-widest ${country.ready ? "text-emerald-600" : "text-amber-600"}`}
                          >
                            {country.ready
                              ? "Checkout available"
                              : "Shipping rate being added"}
                          </span>
                        </span>
                      </span>
                      {active && (
                        <Check size={18} className="shrink-0 text-black" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
