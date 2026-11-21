"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ProductItem from "@/app/myReusableComponents/ProductItem";

type ProductProps = any;

export default function ProductsModal({
  open,
  title,
  products,
  onClose,
  brandedCategories,
}: {
  open: boolean;
  title?: string;
  products: ProductProps[];
  onClose: () => void;
  brandedCategories?: string[];
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus
    setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const comingCount = products.filter((p) => Boolean((p as any).comingSoon)).length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-60 w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            {comingCount === products.length && comingCount > 0 ? (
              <p className="mt-1">
                <span className="inline-flex items-center gap-2 bg-white border border-black/5 px-2 py-1 rounded-full text-xs text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-black inline-block opacity-80" />
                  Showing {comingCount} Coming Soon item{comingCount > 1 ? 's' : ''}
                </span>
              </p>
            ) : comingCount > 0 ? (
              <p className="mt-1">
                <span className="inline-flex items-center gap-2 bg-white border border-black/5 px-2 py-1 rounded-full text-xs text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-black inline-block opacity-80" />
                  Showing {products.length} items — {comingCount} coming soon
                </span>
              </p>
            ) : (
              <p className="mt-1">
                <span className="inline-flex items-center gap-2 bg-white border border-black/5 px-2 py-1 rounded-full text-xs text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-black inline-block opacity-80" />
                  Showing {products.length} items
                </span>
              </p>
            )} 
          </div>

          <div className="flex items-center gap-2">
            <button ref={closeBtnRef} onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="py-6 text-center text-gray-600">No products to show.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p: any) => (
              <div key={p.$id} className="relative">
                {/* Pass isInComingSoonSection when the product is a coming soon item so it renders inside the modal */}
                <ProductItem product={p} isInComingSoonSection={Boolean(p.comingSoon)} hideComingSoonBadge={comingCount === products.length} showOutNowBadge={Boolean(brandedCategories && brandedCategories.includes(((p.category || '') as string).trim().toLowerCase()) && p.released && !p.comingSoon)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
