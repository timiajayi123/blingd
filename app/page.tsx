import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import HomeWordmark from "@/components/home/HomeWordmark";
import HomeCarousel from "@/components/home/HomeCarousel";
import { getStorefrontMedia } from "@/lib/storefrontMedia";

export const metadata: Metadata = {
  title: { absolute: "BLING’D | Official Store" },
  description: "Shop BLING’D now.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default async function Home() {
  const storefrontMedia = await getStorefrontMedia();
  const hasCarousel = storefrontMedia.homeCarouselUrls.length > 0;
  return (
    <section className={`blank-homepage relative flex items-center justify-center overflow-hidden px-6 ${hasCarousel ? "has-carousel" : ""}`}>
      {hasCarousel && <HomeCarousel images={storefrontMedia.homeCarouselUrls} />}
      <Link
        href="/cart"
        aria-label="Open shopping bag"
        className={`absolute right-5 top-5 z-20 grid h-16 w-16 place-items-center transition duration-300 hover:-translate-y-0.5 hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 sm:right-8 sm:top-8 ${hasCarousel ? "text-white focus-visible:ring-white focus-visible:ring-offset-black" : "text-black focus-visible:ring-black focus-visible:ring-offset-4"}`}
      >
        <ShoppingCart size={32} strokeWidth={1.55} aria-hidden="true" />
      </Link>
      <div className="relative z-10 flex w-full self-start flex-col items-center gap-10 pt-16 sm:pt-20">
        <HomeWordmark />
        <Link
          href="/store"
          aria-label="Open shop"
          title="Shop"
          className="inline-flex h-12 translate-y-10 items-center justify-center border border-black bg-white px-10 font-['Uni_Sans_Thin','Uni_Sans','Arial_Narrow',sans-serif] text-sm font-light tracking-[0.18em] text-black transition hover:-translate-y-0.5 hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
        >
          SHOP
        </Link>
      </div>
    </section>
  );
}
