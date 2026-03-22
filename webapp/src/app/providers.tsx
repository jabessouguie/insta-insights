"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/contexts/LanguageContext";

const BugReportButton = dynamic(
  () => import("@/components/BugReportButton").then((m) => m.BugReportButton),
  { ssr: false }
);

const CookieBanner = dynamic(
  () => import("@/components/CookieBanner").then((m) => m.CookieBanner),
  { ssr: false }
);

const PosthogProvider = dynamic(
  () => import("@/components/PosthogProvider").then((m) => m.PosthogProvider),
  { ssr: false }
);

const OnboardingWizard = dynamic(
  () => import("@/components/OnboardingWizard").then((m) => m.OnboardingWizard),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <LanguageProvider>
          {children}
          <PosthogProvider />
          <OnboardingWizard />
          <BugReportButton />
          <CookieBanner />
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
