/**
 * Posthog analytics client.
 *
 * Initialisation is consent-gated: posthog.init() is only called after the
 * user accepts analytics via CookieBanner. Calling captureEvent() before
 * consent is a no-op.
 *
 * Set NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST in .env.local.
 * If the key is missing, all calls are silent no-ops (works in dev/test).
 */

import posthog from "posthog-js";

let initialised = false;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function initPosthog(): void {
  if (typeof window === "undefined" || initialised || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage",
    autocapture: false,
  });
  initialised = true;
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !initialised || !POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export function identifyUser(distinctId: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !initialised || !POSTHOG_KEY) return;
  posthog.identify(distinctId, properties);
}

export function resetUser(): void {
  if (typeof window === "undefined" || !initialised || !POSTHOG_KEY) return;
  posthog.reset();
}
