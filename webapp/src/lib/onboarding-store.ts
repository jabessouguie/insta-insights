/**
 * Onboarding Store
 *
 * Tracks which onboarding steps the user has completed so the wizard
 * is only shown to first-time users and progress is preserved across
 * page refreshes.
 */

const KEY = "instainsights_onboarding";

export type OnboardingStep = "welcome" | "import" | "features";

interface OnboardingState {
  completed: boolean;
  /** Steps the user has explicitly dismissed/completed */
  seenSteps: OnboardingStep[];
  startedAt: string;
}

function load(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OnboardingState) : null;
  } catch {
    return null;
  }
}

function save(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function isOnboardingCompleted(): boolean {
  return load()?.completed === true;
}

export function getSeenSteps(): OnboardingStep[] {
  return load()?.seenSteps ?? [];
}

export function markStepSeen(step: OnboardingStep): void {
  const state = load() ?? {
    completed: false,
    seenSteps: [],
    startedAt: new Date().toISOString(),
  };
  if (!state.seenSteps.includes(step)) {
    state.seenSteps.push(step);
  }
  save(state);
}

export function completeOnboarding(): void {
  const state = load() ?? {
    completed: false,
    seenSteps: [],
    startedAt: new Date().toISOString(),
  };
  state.completed = true;
  state.seenSteps = ["welcome", "import", "features"];
  save(state);
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
