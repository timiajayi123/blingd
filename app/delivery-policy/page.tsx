import Link from 'next/link';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Rules",
  description: "BLING’D delivery coverage, charges, timelines, and missed-delivery rules.",
  alternates: { canonical: "/delivery-policy" },
  openGraph: { url: "/delivery-policy" },
};

export default function DeliveryPolicy() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-14 text-zinc-900 sm:px-6 lg:py-20">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
        <header className="bg-black px-6 py-12 text-white sm:px-10 sm:py-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-white/50">BLING’D Orders</p>
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">Shipping Rules</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">What to expect after payment, how delivery charges work, and what happens when a delivery attempt is missed.</p>
        </header>

        <div className="space-y-9 px-6 py-10 text-sm leading-7 text-zinc-600 sm:px-10 sm:py-12 sm:text-base">
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">1. Where we deliver</h2><p>Online checkout currently supports delivery within Nigeria. Available states, areas, and their current charges are shown during checkout.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">2. Delivery charges</h2><p>Your delivery fee is calculated from the state or sub-location you select at checkout. The amount displayed in your order summary is the delivery charge for that order and delivery attempt.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">3. Processing and estimated arrival</h2><p>Orders begin processing after payment is confirmed. Estimated delivery periods are guides, not guarantees. Weekends, public holidays, order volume, weather, traffic, security conditions, and third-party logistics may affect timing.</p></section>
          <section className="rounded-2xl border-2 border-black bg-zinc-50 p-6"><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">4. Missed delivery</h2><p className="font-black uppercase text-black">You must be available and reachable on the agreed delivery date. If you miss the delivery attempt, you must pay another delivery fee before your order can be sent again.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">5. Address and contact details</h2><p>Enter a complete delivery address, a useful landmark where applicable, and a working phone number. You are responsible for extra costs or failed delivery caused by incorrect, incomplete, or outdated details.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">6. Receiving your order</h2><p>Someone should be available at the supplied address to receive the package. Delivery may be handed to the customer or another person available at that address unless you give us different instructions before dispatch.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">7. Size selection</h2><p className="font-bold uppercase text-black">Confirm your size before placing your order. Selecting the wrong size does not qualify for a free swap; a different size requires a new order and payment.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">8. Delays outside our control</h2><p>We will make reasonable efforts to keep you informed, but BLING’D is not responsible for delays caused by events outside our reasonable control. We may contact you to arrange an alternative where necessary.</p></section>
          <section className="rounded-2xl bg-zinc-100 p-6"><h2 className="mb-2 text-xl font-black uppercase tracking-tight text-black">Questions about delivery?</h2><p>Contact <a href="mailto:support@example.com" className="font-bold text-black underline underline-offset-4">support@example.com</a> before placing your order, or review our <Link href="/terms" className="font-bold text-black underline underline-offset-4">Terms of Service</Link>.</p></section>
          <p className="border-t border-zinc-200 pt-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Effective: 1 August 2026</p>
        </div>
      </article>
    </main>
  );
}
