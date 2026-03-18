/**
 * @jest-environment jsdom
 */
import {
  getConsentStatus,
  setConsentStatus,
  clearConsent,
  hasGivenConsent,
  hasAcceptedConsent,
} from "@/lib/cookie-consent-store";

const KEY = "instainsights_cookie_consent";

beforeEach(() => {
  localStorage.clear();
});

describe("getConsentStatus", () => {
  it("returns null when no consent has been stored", () => {
    expect(getConsentStatus()).toBeNull();
  });

  it("returns 'accepted' when consent is accepted", () => {
    localStorage.setItem(KEY, "accepted");
    expect(getConsentStatus()).toBe("accepted");
  });

  it("returns 'declined' when consent is declined", () => {
    localStorage.setItem(KEY, "declined");
    expect(getConsentStatus()).toBe("declined");
  });

  it("returns null for an unknown stored value", () => {
    localStorage.setItem(KEY, "unknown_value");
    expect(getConsentStatus()).toBeNull();
  });
});

describe("setConsentStatus", () => {
  it("stores 'accepted' in localStorage", () => {
    setConsentStatus("accepted");
    expect(localStorage.getItem(KEY)).toBe("accepted");
  });

  it("stores 'declined' in localStorage", () => {
    setConsentStatus("declined");
    expect(localStorage.getItem(KEY)).toBe("declined");
  });

  it("overwrites a previous consent value", () => {
    setConsentStatus("accepted");
    setConsentStatus("declined");
    expect(localStorage.getItem(KEY)).toBe("declined");
  });
});

describe("clearConsent", () => {
  it("removes the consent key from localStorage", () => {
    localStorage.setItem(KEY, "accepted");
    clearConsent();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("is a no-op when no consent was stored", () => {
    expect(() => clearConsent()).not.toThrow();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe("hasGivenConsent", () => {
  it("returns false when no consent stored", () => {
    expect(hasGivenConsent()).toBe(false);
  });

  it("returns true when consent is accepted", () => {
    setConsentStatus("accepted");
    expect(hasGivenConsent()).toBe(true);
  });

  it("returns true when consent is declined (a decision was made)", () => {
    setConsentStatus("declined");
    expect(hasGivenConsent()).toBe(true);
  });

  it("returns false after clearConsent", () => {
    setConsentStatus("accepted");
    clearConsent();
    expect(hasGivenConsent()).toBe(false);
  });
});

describe("hasAcceptedConsent", () => {
  it("returns false when no consent stored", () => {
    expect(hasAcceptedConsent()).toBe(false);
  });

  it("returns true only when consent is accepted", () => {
    setConsentStatus("accepted");
    expect(hasAcceptedConsent()).toBe(true);
  });

  it("returns false when consent is declined", () => {
    setConsentStatus("declined");
    expect(hasAcceptedConsent()).toBe(false);
  });

  it("returns false after clearConsent even if previously accepted", () => {
    setConsentStatus("accepted");
    clearConsent();
    expect(hasAcceptedConsent()).toBe(false);
  });
});
