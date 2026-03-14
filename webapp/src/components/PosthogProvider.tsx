"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hasAcceptedConsent } from "@/lib/cookie-consent-store";
import { initPosthog, captureEvent } from "@/lib/posthog";

/**
 * Initialises Posthog when:
 *  1. The user has already accepted analytics consent (on mount), OR
 *  2. The user accepts in the current session (via cookie_consent_change event)
 *
 * Also tracks client-side route changes as pageview events.
 */
export function PosthogProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialise if consent was already given in a previous session
    if (hasAcceptedConsent()) {
      initPosthog();
    }

    // Listen for consent given in this session
    const handleConsentChange = (e: Event) => {
      const status = (e as CustomEvent<{ status: string }>).detail?.status;
      if (status === "accepted") {
        initPosthog();
        captureEvent("consent_accepted");
      }
    };

    window.addEventListener("cookie_consent_change", handleConsentChange);
    return () => window.removeEventListener("cookie_consent_change", handleConsentChange);
  }, []);

  // Track route changes
  useEffect(() => {
    if (hasAcceptedConsent()) {
      captureEvent("$pageview", { path: pathname });
    }
  }, [pathname]);

  return null;
}
