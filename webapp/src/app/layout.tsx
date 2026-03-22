import type { Metadata } from "next";
import { Playfair_Display, Roboto, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-secondary",
  weight: ["400", "500", "700"],
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://instainsights.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "InstaInsights – Analytics Instagram IA",
    template: "%s | InstaInsights",
  },
  description:
    "Transformez votre export Instagram en insights actionnables. Analytics, Media Kit PDF, Carousel IA et Collab Finder — 100% local, 100% RGPD, gratuit sans CB.",
  keywords: [
    "Instagram analytics",
    "analyse Instagram",
    "dashboard Instagram",
    "media kit influencer",
    "carousel Instagram IA",
    "collab finder",
    "créateur de contenu",
    "agence influencer",
    "export Instagram",
    "insights IA",
  ],
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  appleWebApp: {
    statusBarStyle: "black-translucent",
    title: "InstaInsights",
    capable: true,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BASE_URL,
    siteName: "InstaInsights",
    title: "InstaInsights – Analytics Instagram IA",
    description:
      "Transformez votre export Instagram en insights actionnables. Analytics, Media Kit PDF, Carousel IA — 100% local, gratuit sans CB.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "InstaInsights – Analytics Instagram IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InstaInsights – Analytics Instagram IA",
    description:
      "Analytics Instagram propulsées par l'IA. Gratuit, 100% local, sans connexion Instagram.",
    images: ["/api/og"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1f3d3b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');})}`,
          }}
        />
      </head>
      <body
        className={`${playfair.variable} ${roboto.variable} ${montserrat.variable} overflow-x-hidden font-sans`}
        suppressHydrationWarning
      >
        {/* Skip to main content — WCAG 2.1 AA */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[99999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:outline-none"
        >
          Aller au contenu principal
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
