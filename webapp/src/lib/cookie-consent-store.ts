/**
 * Cookie Consent Store
 *
 * Persists the user's analytics consent decision in localStorage.
 * Only after explicit acceptance should Posthog (or any tracking) be initialised.
 * Follows GDPR "freely given, specific, informed and unambiguous" requirements.
 */

const KEY = "instainsights_cookie_consent";

export type ConsentStatus = "accepted" | "declined" | null;

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (raw === "accepted" || raw === "declined") return raw;
  return null;
}

export function setConsentStatus(status: "accepted" | "declined"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, status);
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function hasGivenConsent(): boolean {
  return getConsentStatus() !== null;
}

export function hasAcceptedConsent(): boolean {
  return getConsentStatus() === "accepted";
}
