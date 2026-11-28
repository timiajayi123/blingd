import type { Metadata } from "next";
import Link from "next/link";

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
      <article className="mx-auto max-w-md">
        <div className="flex aspect-square items-center justify-center bg-[#080808] p-6">
          <svg viewBox="0 0 400 400" role="img" aria-label="Illustration of a black sample T-shirt" className="h-full w-full">
            <path d="M145 65 85 87 25 163 91 210 115 177 105 345 Q200 362 295 345 L285 177 309 210 375 163 315 87 255 65 Q200 110 145 65Z" fill="#1b1b1d" stroke="#505052" strokeWidth="2" />
            <path d="M145 65 Q200 132 255 65 M153 73 Q200 119 247 73" fill="none" stroke="#626266" strokeWidth="3" />
            <text x="200" y="214" textAnchor="middle" fill="white" fontFamily="Michroma, sans-serif" fontSize="26">BLING’D</text>
          </svg>
        </div>
        <h1 className="shop-product-name mt-6">Nightframe tee</h1>
        <p className="mt-3"><span className="shop-price-prefix">FROM</span><span className="shop-price"> ₦28,000</span></p>
        <p className="mt-6 text-xs leading-6 text-white/40">Sample product and price for reviewing the typography. This item is not for sale.</p>
      </article>
    </section>
  );
}
