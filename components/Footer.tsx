"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/store" },
  { label: "Cart", href: "/cart" },
];

const informationLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Shipping Rules", href: "/delivery-policy" },
];

export default function Footer() {
  const pathname = usePathname();

  // The Shop has its own fixed, full-viewport treatment.
  if (pathname === "/store") return null;

  return (
    <footer className="relative isolate overflow-hidden bg-black text-white">
      <div aria-hidden="true" className="footer-visors">
        <span className="footer-visor left-[9%] top-[9%]" />
        <span className="footer-visor left-[42%] top-[20%]" />
        <span className="footer-visor right-[10%] top-[8%]" />
        <span className="footer-visor bottom-[4%] right-[20%]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 pb-8 pt-16 md:px-12 md:pb-10 md:pt-24 lg:px-20">
        <div className="grid gap-14 py-14 md:grid-cols-[1fr_auto] md:items-end md:py-20">
          <Link href="/" className="group inline-flex w-fit items-center" aria-label="BLING'D home">
            <span className="footer-brand-wordmark transition-opacity duration-500 group-hover:opacity-60">
              <span>B</span><span>L</span><span className="footer-brand-wordmark__inverted-i">i</span><span>N</span><span>G</span><span>&apos;</span><span>D</span>
            </span>
          </Link>

          <div className="grid grid-cols-2 gap-12 sm:gap-20">
            <nav aria-label="Footer navigation">
              <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em]">Navigate</p>
              <div className="flex flex-col items-start gap-3">
                {navigationLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm transition-opacity hover:opacity-70">
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>

            <nav aria-label="Information">
              <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em]">Information</p>
              <div className="flex flex-col items-start gap-3">
                {informationLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm transition-opacity hover:opacity-70">
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>

        <div className="border-t border-white/15 pt-6">
          <a
            href="https://snapchat.com/t/Bt7uOu1M"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit TIMZI Web on Snapchat"
            className="group mb-6 block w-fit transition-opacity hover:opacity-60"
          >
            <span
              className="mb-1.5 block text-[8px] uppercase tracking-[0.2em] md:text-[9px]"
              style={{ fontFamily: "var(--font-zen-dots)" }}
            >
              Powered by
            </span>
            <span
              className="block text-xl leading-none tracking-[-0.04em] md:text-2xl"
              style={{ fontFamily: "var(--font-zen-dots)" }}
            >
              TIMZI INC.
            </span>
          </a>

          <div className="flex flex-col gap-5 text-[10px] font-medium uppercase tracking-[0.18em] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <p>© {new Date().getFullYear()} BLING&apos;D. All rights reserved.</p>
              <Link href="/admin" className="transition-opacity hover:opacity-70">Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
