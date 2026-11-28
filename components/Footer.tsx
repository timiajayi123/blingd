"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const footerLinks = [
  { label: "Contact us", href: "/contact" },
  { label: "Shipping Rules", href: "/delivery-policy" },
  { label: "Track your order", href: "/track-order" },
];

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

          <nav aria-label="Customer links" className="flex flex-col items-start gap-3 md:items-end">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-black/60 transition-colors hover:text-black">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-black/10 pt-6">
          <a
            href="https://snapchat.com/t/Bt7uOu1M"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit TIMZI Web on Snapchat"
            className="group mb-6 block w-fit transition-opacity hover:opacity-60"
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

          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/40">
            <p>© {new Date().getFullYear()} BLING&apos;D. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
