"use client";

import { useState, useEffect } from "react";
import { Shield, X, Cookie } from "lucide-react";
import { getConsentStatus, setConsentStatus } from "@/lib/cookie-consent-store";
import { Button } from "@/components/ui/button";

/**
 * GDPR-compliant cookie/analytics consent banner.
 *
 * - Appears on first visit (once per browser)
 * - Accepting triggers Posthog initialisation (handled by PosthogProvider)
 * - Declining stores "declined" and hides the banner permanently
 * - Fires a custom "cookie_consent_change" event so PosthogProvider can react
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsentStatus() === null) {
      // Small delay so the banner doesn't flash on every page hydration
      const id = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(id);
    }
  }, []);

  const dispatch = (status: "accepted" | "declined") => {
    setConsentStatus(status);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("cookie_consent_change", { detail: { status } }));
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Consentement aux cookies analytiques"
      className="animate-in slide-in-from-bottom-4 fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-lg duration-300 sm:left-auto sm:right-6 sm:max-w-sm"
    >
      <div className="rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-black/30">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Cookie className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">Cookies analytiques</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch("declined")}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Refuser et fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
          Nous utilisons{" "}
          <a
            href="https://posthog.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Posthog
          </a>{" "}
          pour comprendre comment l&apos;app est utilisée et l&apos;améliorer. Aucune donnée
          personnelle ni export Instagram n&apos;est collectée.
        </p>
        <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3 w-3 text-emerald-500" />
          Tes données Instagram restent 100% locales.
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => dispatch("declined")}
          >
            Refuser
          </Button>
          <Button size="sm" className="flex-1 text-xs" onClick={() => dispatch("accepted")}>
            Accepter
          </Button>
        </div>

        {/* Privacy link */}
        <p className="mt-3 text-center text-[10px] text-muted-foreground/60">
          <a href="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">
            Politique de confidentialité
          </a>
        </p>
      </div>
    </div>
  );
}
