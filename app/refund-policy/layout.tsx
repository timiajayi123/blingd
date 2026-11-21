import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Read the BLING’D refund and return policy before placing an order.",
  alternates: { canonical: "/refund-policy" },
  openGraph: { url: "/refund-policy" },
};

export default function RefundPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
