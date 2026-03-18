/**
 * @jest-environment jsdom
 */
import {
  isOnboardingCompleted,
  getSeenSteps,
  markStepSeen,
  completeOnboarding,
  resetOnboarding,
} from "@/lib/onboarding-store";

beforeEach(() => {
  localStorage.clear();
});

describe("isOnboardingCompleted", () => {
  it("returns false when nothing is stored", () => {
    expect(isOnboardingCompleted()).toBe(false);
  });

  it("returns true after completeOnboarding()", () => {
    completeOnboarding();
    expect(isOnboardingCompleted()).toBe(true);
  });

  it("returns false after resetOnboarding()", () => {
    completeOnboarding();
    resetOnboarding();
    expect(isOnboardingCompleted()).toBe(false);
  });
});

describe("getSeenSteps", () => {
  it("returns empty array when nothing is stored", () => {
    expect(getSeenSteps()).toEqual([]);
  });

  it("returns seen steps after markStepSeen()", () => {
    markStepSeen("welcome");
    expect(getSeenSteps()).toContain("welcome");
  });

  it("does not duplicate steps", () => {
    markStepSeen("welcome");
    markStepSeen("welcome");
    expect(getSeenSteps().filter((s) => s === "welcome")).toHaveLength(1);
  });

  it("accumulates multiple steps", () => {
    markStepSeen("welcome");
    markStepSeen("import");
    const steps = getSeenSteps();
    expect(steps).toContain("welcome");
    expect(steps).toContain("import");
  });
});

describe("markStepSeen", () => {
  it("creates state if none exists", () => {
    markStepSeen("import");
    expect(getSeenSteps()).toContain("import");
    expect(isOnboardingCompleted()).toBe(false);
  });

  it("preserves existing steps when adding new one", () => {
    markStepSeen("welcome");
    markStepSeen("features");
    const steps = getSeenSteps();
    expect(steps).toContain("welcome");
    expect(steps).toContain("features");
  });
});

describe("completeOnboarding", () => {
  it("marks all steps as seen", () => {
    completeOnboarding();
    const steps = getSeenSteps();
    expect(steps).toContain("welcome");
    expect(steps).toContain("import");
    expect(steps).toContain("features");
  });

  it("sets completed to true", () => {
    completeOnboarding();
    expect(isOnboardingCompleted()).toBe(true);
  });

  it("works even if called without prior markStepSeen", () => {
    completeOnboarding();
    expect(isOnboardingCompleted()).toBe(true);
  });
});

describe("resetOnboarding", () => {
  it("removes the onboarding key from localStorage", () => {
    completeOnboarding();
    resetOnboarding();
    expect(localStorage.getItem("instainsights_onboarding")).toBeNull();
  });

  it("is a no-op when nothing was stored", () => {
    expect(() => resetOnboarding()).not.toThrow();
  });
});
