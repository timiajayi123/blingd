"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/app/Store/CartStore";
import { LogoSVG } from "@/components/ui/LogoSVG";
import { ShoppingCart, PackageSearch } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getPublicMediaUrl } from "@/lib/publicMedia";
import { toCategorySlug } from "@/lib/seo";

const Header = () => {
  const pathname = usePathname();
  const { cart } = useCartStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const isStorefrontPage =
    pathname === "/store" ||
    pathname === "/revolt";
  const isGalleryPage = pathname === "/gallery";
  const isHomePage = pathname === "/";
  const isCartPage = pathname === "/cart";
  const isCheckoutPage = pathname === "/checkout";
  const isProductDetailsPage = pathname?.startsWith("/product-details");
  const isAdminPage = pathname?.startsWith("/admin");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/catalog/categories");
        if (!response.ok) throw new Error("Categories unavailable");
        setCategories(await response.json());
      } catch (error) {
        console.error("Failed to load navigation categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const isLightPage =
    pathname === "/store" ||
    pathname === "/new-arrivals" ||
    pathname === "/wishlist" ||
    pathname?.startsWith("/category") ||
    isProductDetailsPage;

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerTextColor =
    (scrolled && !isStorefrontPage && !isLightPage) || !isLightPage
      ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      : "text-black";
  const headerIconColor =
    (scrolled && !isStorefrontPage && !isLightPage) || !isLightPage
      ? "white"
      : "black";

  // Framer Motion variants for the hamburger to X animation
  const topBarVariants = {
    closed: { rotate: 0, y: 0 },
    opened: { rotate: 45, y: 8 },
  };
  const middleBarVariants = {
    closed: { opacity: 1, x: 0 },
    opened: { opacity: 0, x: 20 },
  };
  const bottomBarVariants = {
    closed: { rotate: 0, y: 0 },
    opened: { rotate: -45, y: -8 },
  };

  if (isHomePage || isStorefrontPage || isGalleryPage || isProductDetailsPage || isAdminPage) return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-4 md:px-12 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        scrolled && !isStorefrontPage && !isLightPage
          ? "py-3 md:py-4 bg-transparent border-b border-transparent shadow-none"
          : isStorefrontPage || isLightPage
            ? "py-2 bg-transparent border-b border-transparent"
            : "py-6 md:py-10 bg-transparent border-b border-transparent"
      }`}
    >
      {/* Search Bar / Logo */}
      <div className="flex items-center gap-4">
        {!isStorefrontPage && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <Link href="/" className="flex items-center gap-2 group relative">
              <div className="flex items-center justify-center group-hover:translate-x-1 group-hover:translate-y-1 transition-all duration-300">
                <img
                  src={getPublicMediaUrl("/placeholder.svg")}
                  alt="BLING’D"
                  style={{
                    width: scrolled ? "40px" : "64px",
                    height: "auto",
                    filter:
                      headerIconColor === "white"
                        ? "brightness(0) invert(1)"
                        : "none",
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="sr-only">BLING’D</span>
              </div>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex gap-12 items-center text-[10px] font-black uppercase tracking-[0.2em] relative">
        {/* Order Tracking */}
        <Link
          href="/track-order"
          className={`relative transition-all p-3 backdrop-blur-md border border-black group ${
            (scrolled && !isStorefrontPage) || !isLightPage
              ? "text-white bg-black/40 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
              : "text-black bg-white/40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
          }`}
          title="Track Order"
        >
          <PackageSearch className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="sr-only">Orders</span>
        </Link>

        {/* Cart */}
        <Link
          href={isCartPage ? "/store" : "/cart"}
          className={`relative transition-all p-3 backdrop-blur-md border border-black ${
            (scrolled && !isStorefrontPage) || !isLightPage
              ? "text-white bg-black/40 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
              : "text-black bg-white/40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          {cart.length > 0 && (
            <span
              className="absolute -top-3 -right-3 bg-black text-white text-[10px]
                         font-black w-6 h-6 flex items-center justify-center shadow-lg border-2 border-black"
            >
              {cart.length}
            </span>
          )}
        </Link>
      </nav>

      {/* Mobile Actions */}
      <div className="flex md:hidden items-center gap-4">
        <Link
          href="/track-order"
          className={`relative p-2 transition-colors ${headerTextColor}`}
          title="Track Order"
        >
          <PackageSearch className="w-6 h-6" />
          <span className="sr-only">Orders</span>
        </Link>

        <Link
          href={isCartPage ? "/store" : "/cart"}
          className={`relative p-2 transition-colors ${headerTextColor}`}
        >
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full">
              {cart.length}
            </span>
          )}
        </Link>

        {/* Animated Hamburger Button */}
        {!isStorefrontPage && !isHomePage && !isCartPage && !isCheckoutPage && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 relative z-[60] flex flex-col items-center justify-center gap-1.5 w-10 h-10 transition-colors ${headerTextColor}`}
            aria-label="Toggle Menu"
          >
            <motion.span
              variants={topBarVariants}
              animate={mobileMenuOpen ? "opened" : "closed"}
              className="w-8 h-0.5 bg-current block"
            />
            <motion.span
              variants={middleBarVariants}
              animate={mobileMenuOpen ? "opened" : "closed"}
              className="w-8 h-0.5 bg-current block"
            />
            <motion.span
              variants={bottomBarVariants}
              animate={mobileMenuOpen ? "opened" : "closed"}
              className="w-8 h-0.5 bg-current block"
            />
          </button>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && !isCartPage && !isCheckoutPage && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-8 md:hidden overflow-y-auto"
          >
            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none opacity-5 overflow-hidden">
              <span className="absolute -bottom-20 -left-20 text-[60vw] font-black italic uppercase leading-none text-white select-none">
                AE
              </span>
            </div>

            {/* Close Button for when header button is not available */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-10 right-4 p-4 z-[60] flex flex-col items-center justify-center gap-1.5 w-10 h-10 text-white"
            >
              <div className="w-8 h-0.5 bg-white rotate-45 translate-y-[4px]" />
              <div className="w-8 h-0.5 bg-white -rotate-45 -translate-y-[4px]" />
            </button>

            {/* Categories List */}
            <div className="flex flex-col items-center gap-4 w-full relative z-10 py-20">
              <p className="text-[10px] font-black text-primary tracking-[0.5em] uppercase mb-8 opacity-40">
                SELECT_CATEGORY
              </p>

              {categories.map((cat, i) => (
                <motion.div
                  key={cat.$id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 + 0.2 }}
                  className="w-full text-center"
                >
                  <Link
                    href={`/category/${toCategorySlug(cat.name)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="group relative inline-block w-full py-2"
                  >
                    <span className="text-2xl md:text-3xl font-black italic uppercase tracking-widest text-white group-hover:text-primary transition-all duration-300 inline-block transform group-hover:scale-110">
                      {cat.name}
                    </span>
                    <motion.span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-primary group-hover:w-20 transition-all duration-300" />
                  </Link>
                </motion.div>
              ))}

              {/* Static Links if needed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categories.length * 0.05 + 0.3 }}
                className="flex flex-col items-center gap-6 mt-12 pt-8 border-t border-white/10 w-full"
              >
                <Link
                  href="/store"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-black tracking-[0.3em] text-white/40 hover:text-white transition-colors uppercase"
                >
                  View All Assets
                </Link>
              </motion.div>
            </div>

            <div className="mt-auto w-full relative z-10 pb-4">
              <div className="flex flex-col gap-6 items-center">
                <LogoSVG size={48} color="rgba(255,255,255,0.2)" />
                <p className="text-[8px] text-zinc-500 uppercase tracking-[0.5em]">
                  SYSTEM_VERSION_4.0.2
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
