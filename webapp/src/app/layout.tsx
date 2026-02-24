import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "InstaInsights – Analytics Instagram",
    template: "%s | InstaInsights",
  },
  description:
    "Plateforme d'analyse Instagram avancée pour créateurs de contenu et agences. Insights alimentés par l'IA.",
  keywords: ["Instagram", "analytics", "influencer", "agence", "insights", "dashboard"],
  robots: { index: false, follow: false }, // Private SaaS – no indexing
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
