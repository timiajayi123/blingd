import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet BLING’D, a Lagos-based Nigerian streetwear brand creating bold pieces inspired by identity, architecture, and urban culture.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about" },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
