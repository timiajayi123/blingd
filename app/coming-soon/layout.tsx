import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "Preview upcoming BLING’D streetwear releases and future drops.",
  alternates: { canonical: "/coming-soon" },
  openGraph: { url: "/coming-soon" },
};

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
