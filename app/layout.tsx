import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono, Oswald, Exo, Zen_Dots } from "next/font/google";
import "./globals.css";
import Header from "./myReusableComponents/Header";
import { Toaster } from "@/components/ui/sonner";
import StoreEmail from "@/components/ui/StoreEmail";

import Footer from "@/components/Footer";
import { GlobalLoaderProvider } from "@/components/providers/GlobalLoaderProvider";
import VercelAnalytics from "@/components/providers/VercelAnalytics";
import SiteLockWrapper from "@/components/ui/SiteLockWrapper";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["400", "700"] });
const exo = Exo({ variable: "--font-exo", subsets: ["latin"], weight: ["400", "700", "900"] });
const zenDots = Zen_Dots({ variable: "--font-zen-dots", subsets: ["latin"], weight: "400" });
const blingdScript = localFont({
  src: "./fonts/amsterdam-handwriting.regular.ttf",
  variable: "--font-blingd-script",
  display: "swap",
});

export const metadata: Metadata = {
  icons: {
    icon: [{ url: "/blingd-icon.png", sizes: "223x223", type: "image/png" }],
    shortcut: "/blingd-icon.png",
    apple: [{ url: "/blingd-icon.png", sizes: "223x223", type: "image/png" }],
  },
};

export default function RootLayout({ children }: {
children: React.ReactNode }) {
  return (
    <html lang="en">
      <head></head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${exo.variable} ${zenDots.variable} ${blingdScript.variable} antialiased bg-black flex flex-col min-h-screen`}>
        <GlobalLoaderProvider>
          <SiteLockWrapper>
              <div className="noise-overlay" />
              <div className="scanlines" />
              <Header />
              <StoreEmail />

              <main className="flex-grow">{children}</main>
              <Footer />
              <Toaster visibleToasts={3} />
          </SiteLockWrapper>
          <VercelAnalytics />
        </GlobalLoaderProvider>
      </body>
    </html>
  );
}
