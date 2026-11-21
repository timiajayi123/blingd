import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How BLING’D collects, uses, and protects customer information.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy" },
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-14 text-zinc-900 sm:px-6 lg:py-20">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
        <header className="bg-black px-6 py-12 text-white sm:px-10 sm:py-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-white/50">BLING’D Legal</p>
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">Privacy Policy</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
            This policy explains what information we collect, why we use it, and the choices you have when shopping with BLING’D.
          </p>
        </header>

        <div className="space-y-9 px-6 py-10 text-sm leading-7 text-zinc-600 sm:px-10 sm:py-12 sm:text-base">
          <section>
            <h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">1. Information we collect</h2>
            <p>We collect information you provide when you create an account, place an order, join a mailing list, or contact us. This may include your name, email address, phone number, delivery address, order details, and messages sent to our team.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">2. How we use your information</h2>
            <p>We use your information to process and deliver orders, verify payments, provide customer support, send order updates, prevent fraud, maintain our website, and meet our legal obligations. We only send promotional messages where you have agreed to receive them or where permitted by law.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">3. Payments</h2>
            <p>Payments are handled by our payment provider. BLING’D does not store your complete card details. Payment providers process your information under their own privacy and security terms.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">4. Cookies and site data</h2>
            <p>We may use cookies and similar storage to keep you signed in, remember your cart and preferences, secure the website, understand performance, and improve your shopping experience. You can restrict cookies in your browser, although parts of the site may stop working correctly.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">5. When we share information</h2>
            <p>We share only what is reasonably necessary with trusted providers that help us operate the store, process payments, host data, send communications, and deliver orders. We may also disclose information where required by law, to protect customers, or to prevent fraud and abuse. We do not sell your personal information.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">6. Security and retention</h2>
            <p>We use reasonable safeguards to protect your information. No online system is completely secure, but we limit access and retain information only for as long as needed to operate the store, resolve disputes, prevent fraud, and meet legal or accounting requirements.</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-black uppercase tracking-tight text-black">7. Your choices and rights</h2>
            <p>You may ask to access, correct, or delete personal information we hold about you, subject to any information we must retain by law. You may also unsubscribe from marketing messages at any time.</p>
          </section>
          <section className="rounded-2xl bg-zinc-100 p-6">
            <h2 className="mb-2 text-xl font-black uppercase tracking-tight text-black">8. Contact us</h2>
            <p>For privacy questions or requests, email <a href="mailto:support@example.com" className="font-bold text-black underline underline-offset-4">support@example.com</a>.</p>
          </section>
          <p className="border-t border-zinc-200 pt-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Effective: 1 August 2026</p>
        </div>
      </article>
    </main>
  );
}
