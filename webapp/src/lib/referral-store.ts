/** Referral program — code generation and tracking via localStorage. */

const REFERRAL_KEY = "instainsights_referral";
const DAYS_FREE_PER_REFERRAL = 30;

export interface ReferralData {
  code: string;
  referralCount: number;
  createdAt: string; // ISO date
}

// ─── Code generation ──────────────────────────────────────────────────────────

/**
 * Generate a human-readable referral code.
 * Format: 3 uppercase letters + 4 digits (e.g. TRV8492).
 */
export function generateReferralCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude I, O to avoid confusion
  const l = Array.from(
    { length: 3 },
    () => letters[Math.floor(Math.random() * letters.length)]
  ).join("");
  const n = String(Math.floor(Math.random() * 9000) + 1000); // 1000–9999
  return `${l}${n}`;
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

/** Days of Pro access unlocked from referrals. */
export function daysUnlocked(referralCount: number): number {
  return referralCount * DAYS_FREE_PER_REFERRAL;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export function loadReferral(): ReferralData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFERRAL_KEY);
    return raw ? (JSON.parse(raw) as ReferralData) : null;
  } catch {
    return null;
  }
}

/**
 * Load existing referral data or initialise a fresh one.
 * The code is generated once and persisted — subsequent calls return the same code.
 */
export function getOrCreateReferral(): ReferralData {
  const existing = loadReferral();
  if (existing) return existing;
  const data: ReferralData = {
    code: generateReferralCode(),
    referralCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  saveReferral(data);
  return data;
}

export function saveReferral(data: ReferralData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFERRAL_KEY, JSON.stringify(data));
}

/** Simulate a new referral registration (for demo / testing purposes). */
export function addReferral(data: ReferralData): ReferralData {
  const updated = { ...data, referralCount: data.referralCount + 1 };
  saveReferral(updated);
  return updated;
}
