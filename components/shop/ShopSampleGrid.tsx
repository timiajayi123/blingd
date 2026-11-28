const samples = [
  { name: "Nightframe visor", price: "₦28,000" },
  { name: "Ghostline visor", price: "₦32,000" },
  { name: "Afterhours visor", price: "₦30,000" },
  { name: "Chrome signal visor", price: "₦35,000" },
];

export default function ShopSampleGrid() {
  return (
    <section aria-label="Sample products" className="w-full py-10 text-left">
      <p className="mb-6 text-xs text-white/45">Display samples · not available for purchase</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-8 sm:gap-y-20">
        {samples.map((product) => (
          <article key={product.name} className="min-w-0">
            <div className="flex aspect-square items-center justify-center bg-transparent">
              <img src="/images/visor-loader.png" alt={product.name} className="h-full w-full object-contain" />
            </div>
            <h2 className="shop-product-name mt-6">{product.name}</h2>
            <p className="shop-price mt-3">{product.price}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
