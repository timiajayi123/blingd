"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // The Shop has its own fixed, full-viewport treatment.
  if (pathname === "/store") return null;

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-white via-zinc-50 to-zinc-100 text-black">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 md:px-12 md:pb-10 md:pt-24 lg:px-20">
        <div className="grid gap-14 py-14 md:grid-cols-[1fr_auto] md:items-end md:py-20">
          <Link href="/" className="group inline-flex w-fit items-center" aria-label="BLING'D home">
            <span className="footer-brand-wordmark transition-opacity duration-500 group-hover:opacity-60">
              <span>B</span><span>L</span><span className="footer-brand-wordmark__inverted-i">i</span><span>N</span><span>G</span><span>&apos;</span><span>D</span>
            </span>
          </Link>

          <nav aria-label="Customer links" className="grid grid-cols-2 gap-x-8 gap-y-3 text-center text-sm text-black/60 md:min-w-72">
            <Link href="/contact" className="transition-colors hover:text-black">Contact us</Link>
            <Link href="/track-order" className="transition-colors hover:text-black">Track your order</Link>
            <Link href="/delivery-policy" className="col-span-2 justify-self-center transition-colors hover:text-black">Shipping Rules</Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-black/10 pt-6">
          <a
            href="https://snapchat.com/t/Bt7uOu1M"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit TIMZI Web on Snapchat"
            className="group block w-fit transition-opacity hover:opacity-60"
          >
            <span
              className="mb-1.5 block text-[8px] uppercase tracking-[0.2em] text-black/50 md:text-[9px]"
              style={{ fontFamily: "var(--font-zen-dots)" }}
            >
              Powered by
            </span>
            <span
              className="block text-xl leading-none tracking-[-0.04em] text-black md:text-2xl"
              style={{ fontFamily: "var(--font-zen-dots)" }}
            >
              TIMZI INC.
            </span>
          </a>

          <div className="pb-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-black/40">
            <p>© 2026 BLING&apos;D</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
