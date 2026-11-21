import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact BLING’D support on WhatsApp for help with orders, delivery updates, and product questions.",
  alternates: { canonical: "/contact" },
  openGraph: { url: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
