import type { Metadata } from "next";
import Link from "next/link";
import ShopSampleGrid from "@/components/shop/ShopSampleGrid";

export const metadata: Metadata = {
  title: "Product style preview",
  robots: { index: false, follow: false },
};

export default function ShopPreview() {
  return (
    <section className="min-h-screen bg-black px-6 py-14 text-white">
      <header className="mx-auto mb-12 flex max-w-6xl items-center justify-between gap-6">
        <p className="text-xs uppercase tracking-widest text-white/50">Product style preview · Michroma</p>
        <Link href="/store" className="text-xs text-white/70 underline underline-offset-4">Back to shop</Link>
      </header>
      <div className="mx-auto max-w-6xl">
        <ShopSampleGrid />
      </div>
    </section>
  );
}
