"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/store") return null;

  return (
    <footer className="relative isolate overflow-hidden bg-black text-white" style={{ fontFamily: '"Michroma", sans-serif', fontWeight: 400 }}>
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="footer-visor-outline" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.25" result="expanded" />
            <feFlood floodColor="white" result="white" />
            <feComposite in="white" in2="expanded" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div aria-hidden="true" className="footer-visors">
        <span className="footer-visor left-[2%]" style={{ animationDelay: '-2s' }} />
        <span className="footer-visor left-[15%]" style={{ animationDelay: '-8s' }} />
        <span className="footer-visor left-[28%]" style={{ animationDelay: '-13s' }} />
        <span className="footer-visor left-[41%]" style={{ animationDelay: '-5s' }} />
        <span className="footer-visor left-[54%]" style={{ animationDelay: '-11s' }} />
        <span className="footer-visor left-[67%]" style={{ animationDelay: '-1s' }} />
        <span className="footer-visor left-[80%]" style={{ animationDelay: '-9s' }} />
        <span className="footer-visor right-[2%]" style={{ animationDelay: '-15s' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-8 pt-16 md:px-12 md:pb-10 md:pt-24 lg:px-20">
        <div className="grid gap-14 py-14 md:grid-cols-[1fr_auto] md:items-end md:py-20">
          <Link href="/" className="group inline-flex w-fit items-center" aria-label="BLING'D home">
            <span className="footer-brand-wordmark transition-opacity duration-500 group-hover:opacity-60" style={{ fontFamily: '"Michroma", sans-serif', fontWeight: 400 }}>
              <span>B</span><span>L</span><span className="footer-brand-wordmark__inverted-i">i</span><span>N</span><span>G</span><span>&apos;</span><span>D</span>
            </span>
          </Link>
          <nav aria-label="Customer links" className="mx-auto grid w-full max-w-md grid-cols-[auto_auto] justify-center gap-x-5 gap-y-5 text-center text-[12px] leading-6 text-white/85 sm:gap-x-8 sm:text-sm md:mx-0 md:min-w-80 md:text-base">
            <Link href="/contact" className="transition-colors hover:text-white">Contact us</Link>
            <Link href="/track-order" className="transition-colors hover:text-white">Track your order</Link>
            <Link href="/delivery-policy" className="col-span-2 justify-self-center transition-colors hover:text-white">Shipping Rules</Link>
          </nav>
        </div>

        <div className="flex flex-nowrap items-end justify-between gap-3 border-t border-white/15 pt-6">
          <a href="https://snapchat.com/t/Bt7uOu1M" target="_blank" rel="noopener noreferrer" aria-label="Visit TIMZI Web on Snapchat" className="group block min-w-0 transition-opacity hover:opacity-60">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.2em] text-white/50 md:text-[9px]">Powered by</span>
            <span className="block text-base leading-none tracking-[-0.04em] text-white md:text-2xl">TIMZI INC.</span>
          </a>
          <p className="shrink-0 pb-0.5 text-right text-[8px] uppercase tracking-[0.06em] text-white/45 sm:text-[10px]">© 2026 BLING&apos;D</p>
        </div>
      </div>
    </footer>
  );
}
