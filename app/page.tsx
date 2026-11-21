import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import HomeWordmark from "@/components/home/HomeWordmark";

export const metadata: Metadata = {
  title: { absolute: "BLING’D | Official Store" },
  description:
    "High-end Nigerian streetwear from Lagos. Discover bold clothing, accessories, and the latest BLING’D drops.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function Home() {
  return (
    <section className="blank-homepage flex items-center justify-center overflow-hidden px-6">
      <Link
        href="/cart"
        aria-label="Open shopping bag"
        className="absolute right-5 top-5 z-20 grid h-16 w-16 place-items-center text-black transition duration-300 hover:-translate-y-0.5 hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 sm:right-8 sm:top-8"
      >
        <ShoppingCart size={32} strokeWidth={1.55} aria-hidden="true" />
      </Link>
      <div className="flex flex-col items-center gap-10">
        <HomeWordmark />
        <Link
          href="/store"
          aria-label="Open shop"
          title="Shop"
          className="grid h-16 w-16 translate-y-8 place-items-center bg-transparent text-black transition hover:scale-105 hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
        >
          <ShoppingBag size={38} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
