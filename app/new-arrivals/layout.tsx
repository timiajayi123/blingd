import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Arrivals",
  description:
    "Explore the newest BLING’D streetwear, clothing, and accessories released in the last 30 days.",
  alternates: { canonical: "/new-arrivals" },
  openGraph: { url: "/new-arrivals" },
};

export default function NewArrivalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
