"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import VisorLoader from "@/components/ui/VisorLoader";
import { AnimatePresence } from "framer-motion";

type GlobalLoaderContextType = {
  loading: boolean;
  setLoading: (value: boolean) => void;
};

const GlobalLoaderContext = createContext<GlobalLoaderContextType | undefined>(
  undefined
);

export function GlobalLoaderProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageReady, setPageReady] = useState(false);

  const completeLoader = useCallback(() => {
    document.documentElement.classList.add("site-ready");
    window.dispatchEvent(new Event("site-ready"));
    setInitialLoading(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("site-ready");
    const markReady = () => setPageReady(true);
    if (document.readyState === "complete") {
      markReady();
    } else {
      window.addEventListener("load", markReady, { once: true });
      return () => window.removeEventListener("load", markReady);
    }
  }, []);

  // `load` means the document is ready to reveal. This is only a guarded
  // release in case a browser interrupts an animation callback; normal flows
  // still leave through VisorLoader's completed fill and fade sequence.
  useEffect(() => {
    if (!pageReady || !initialLoading) return;
    const fallback = window.setTimeout(completeLoader, 2200);
    return () => window.clearTimeout(fallback);
  }, [completeLoader, initialLoading, pageReady]);

  const showLoader = initialLoading || loading;

  return (
    <GlobalLoaderContext.Provider value={{ loading, setLoading }}>
      <AnimatePresence>
        {showLoader && (
          <VisorLoader
            key={initialLoading ? "initial-visor-loader" : "route-visor-loader"}
            ready={pageReady}
            onComplete={completeLoader}
          />
        )}
      </AnimatePresence>
      {children}
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = useContext(GlobalLoaderContext);
  if (!context) {
    throw new Error("useGlobalLoader must be used within GlobalLoaderProvider");
  }
  return context;
}
