import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms that apply when browsing or ordering from the BLING’D official store.",
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-14 text-zinc-900 sm:px-6 lg:py-20">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
        <header className="bg-black px-6 py-12 text-white sm:px-10 sm:py-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-white/50">BLING’D Legal</p>
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">Terms of Service</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">These terms apply whenever you browse our website, create an account, or place an order with BLING’D.</p>
        </header>

        <div className="space-y-9 px-6 py-10 text-sm leading-7 text-zinc-600 sm:px-10 sm:py-12 sm:text-base">
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">1. Using our store</h2><p>You must provide accurate information and use the website only for lawful purposes. If you are under 18, you must have permission from a parent or guardian before placing an order.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">2. Products and availability</h2><p>We aim to present product colours, images, descriptions, sizing, stock, and prices accurately. Screen settings and production variations may cause minor differences. Products and limited drops may be changed, restricted, or withdrawn without notice.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">3. Orders and payment</h2><p>Your checkout confirmation means we received your order; it does not guarantee acceptance. Orders are accepted after successful payment and verification. We may cancel or refund an order affected by a stock, pricing, payment, security, or fraud issue.</p></section>
          <section className="rounded-2xl border border-black bg-zinc-50 p-6"><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">4. Sizes, exchanges and refunds</h2><p className="font-bold uppercase text-black">Check your selected size before paying. Choosing the wrong size does not qualify for a free swap. If you need another size, you must place and pay for a new order.</p><p className="mt-3">Other return or refund requests are handled under our <Link href="/refund-policy" className="font-bold text-black underline underline-offset-4">Refund Policy</Link>.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">5. Delivery</h2><p>Delivery charges are shown at checkout and depend on the selected location. Delivery dates are estimates and can be affected by order volume, weather, traffic, security conditions, or logistics providers. You are responsible for providing a complete address and reachable phone number.</p><p className="mt-3 font-bold uppercase text-black">If you are unavailable and miss your delivery, you must pay a new delivery fee before redelivery.</p><p className="mt-3">Read the complete <Link href="/delivery-policy" className="font-bold text-black underline underline-offset-4">Shipping Rules</Link>.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">6. Accounts and communications</h2><p>You are responsible for activity under your account and for keeping your login details secure. We may contact you using the email address or phone number supplied with your order to provide payment, order, and delivery updates.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">7. Intellectual property</h2><p>BLING’D names, designs, photographs, graphics, logos, and site content belong to BLING’D or their respective owners. They may not be copied, resold, reproduced, or used commercially without written permission.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">8. Liability</h2><p>To the extent permitted by law, BLING’D is not responsible for indirect losses, service interruptions, or delays outside our reasonable control. Nothing in these terms removes any consumer right that cannot legally be excluded.</p></section>
          <section><h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">9. Changes and governing law</h2><p>We may update these terms when our store or policies change. The version published here applies from its effective date. These terms are governed by the laws of the Federal Republic of Nigeria.</p></section>
          <section className="rounded-2xl bg-zinc-100 p-6"><h2 className="mb-2 text-xl font-black uppercase tracking-tight text-black">10. Contact us</h2><p>Questions about these terms can be sent to <a href="mailto:support@example.com" className="font-bold text-black underline underline-offset-4">support@example.com</a>.</p></section>
          <p className="border-t border-zinc-200 pt-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Effective: 1 August 2026</p>
        </div>
      </article>
    </main>
  );
}
