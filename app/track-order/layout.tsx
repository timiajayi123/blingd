import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Order",
  description:
    "Track an BLING’D order using your private confirmation link.",
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  alternates: { canonical: "/track-order" },
  openGraph: { url: "/track-order" },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
