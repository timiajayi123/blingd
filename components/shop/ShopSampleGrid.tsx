const samples = [
  { name: "Nightframe tee", price: "₦28,000", color: "#1b1b1d" },
  { name: "Ghostline tee", price: "₦32,000", color: "#b6b6b8" },
  { name: "Afterhours tee", price: "₦30,000", color: "#252530" },
  { name: "Chrome signal tee", price: "₦35,000", color: "#3e3e42" },
];

export default function ShopSampleGrid() {
  return (
    <section aria-label="Sample products" className="w-full py-10 text-left">
      <p className="mb-6 text-xs text-white/45">Display samples · not available for purchase</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-8 sm:gap-y-20">
        {samples.map((product) => (
          <article key={product.name} className="min-w-0">
            <div className="flex aspect-square items-center justify-center bg-[#080808] p-6">
              <svg viewBox="0 0 400 400" role="img" aria-label={`${product.name} sample illustration`} className="h-full w-full">
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
    </section>
  );
}
