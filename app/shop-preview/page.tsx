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
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-8 sm:gap-y-20">
      {[
        { name: "Nightframe tee", price: "₦28,000", color: "#1b1b1d" },
        { name: "Ghostline tee", price: "₦32,000", color: "#b6b6b8" },
        { name: "Afterhours tee", price: "₦30,000", color: "#252530" },
        { name: "Chrome signal tee", price: "₦35,000", color: "#3e3e42" },
      ].map((product) => (
      <article key={product.name} className="min-w-0">
        <div className="flex aspect-square items-center justify-center bg-[#080808] p-6">
          <svg viewBox="0 0 400 400" role="img" aria-label="Illustration of a black sample T-shirt" className="h-full w-full">
            <path d="M145 65 85 87 25 163 91 210 115 177 105 345 Q200 362 295 345 L285 177 309 210 375 163 315 87 255 65 Q200 110 145 65Z" fill={product.color} stroke="#505052" strokeWidth="2" />
            <path d="M145 65 Q200 132 255 65 M153 73 Q200 119 247 73" fill="none" stroke="#626266" strokeWidth="3" />
            <text x="200" y="214" textAnchor="middle" fill="white" fontFamily="Michroma, sans-serif" fontSize="26">BLING’D</text>
          </svg>
        </div>
        <h2 className="shop-product-name mt-6">{product.name}</h2>
        <p className="shop-price mt-3">{product.price}</p>
      </article>
      ))}
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs leading-6 text-white/40">Sample products and prices for reviewing the typography. These items are not for sale.</p>
    </section>
  );
}
