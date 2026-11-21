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
import {
  SITE_DESCRIPTION,
  SITE_LOGO_URL,
  SITE_NAME,
  SITE_URL,
  SUPPORT_PHONE,
} from "@/lib/siteConfig";

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
  applicationName: 'BLING’D Admin',
  title: {
    default: "BLING’D",
    template: "%s | BLING’D"
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "BLING’D", "Streetwear", "Luxury Fashion", "Streetwear Nigeria", "Streetwear Brand", "Urban Fashion", "Accessories"
  ],
  authors: [{ name: "BLING’D" }],
  creator: "BLING’D",
  publisher: "BLING’D",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: SITE_LOGO_URL,
        width: 1536,
        height: 1536,
        alt: `${SITE_NAME} logo`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SITE_LOGO_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [{ url: "/blingd-icon.png", sizes: "223x223", type: "image/png" }],
    shortcut: "/blingd-icon.png",
    apple: [{ url: "/blingd-icon.png", sizes: "223x223", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: 'BLING’D Admin',
    statusBarStyle: 'black-translucent',
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: "BLING’D Nigeria",
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: SITE_LOGO_URL,
    width: 1536,
    height: 1536,
  },
  image: SITE_LOGO_URL,
  founder: {
    "@type": "Person",
    name: "Jordan",
    sameAs: [
      "https://example.com",
      "https://example.com",
    ],
  },
  sameAs: [
    "https://example.com",
    "https://example.com",
  ],
  telephone: SUPPORT_PHONE,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Lagos",
    addressRegion: "Lagos",
    addressCountry: "NG",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: SUPPORT_PHONE,
    contactType: "customer service",
    areaServed: "NG",
    availableLanguage: "English",
  },
};

const sitelinkStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  alternateName: "BLING’D Nigeria",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export default function RootLayout({ children }: {
children: React.ReactNode }) {
  return (
    <html lang="en">
      <head></head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${exo.variable} ${zenDots.variable} ${blingdScript.variable} antialiased bg-black flex flex-col min-h-screen`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sitelinkStructuredData) }}
        />
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
