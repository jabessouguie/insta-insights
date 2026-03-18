/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for the referral store module.
 *
 * Covers:
 * - generateReferralCode: format and uniqueness
 * - daysUnlocked: reward calculation
 * - getOrCreateReferral: idempotency
 * - addReferral: counter increment
 * - loadReferral / saveReferral: localStorage persistence
 */

import {
  generateReferralCode,
  daysUnlocked,
  getOrCreateReferral,
  addReferral,
  loadReferral,
  saveReferral,
} from "@/lib/referral-store";
import type { ReferralData } from "@/lib/referral-store";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

// ─── generateReferralCode ─────────────────────────────────────────────────────

describe("generateReferralCode", () => {
  it("returns a 7-character string", () => {
    expect(generateReferralCode()).toHaveLength(7);
  });

  it("starts with 3 uppercase letters", () => {
    const code = generateReferralCode();
    expect(code.slice(0, 3)).toMatch(/^[A-Z]{3}$/);
  });

  it("does not contain I or O", () => {
    // Run many times to reduce false-negative probability
    for (let i = 0; i < 200; i++) {
      const code = generateReferralCode().slice(0, 3);
      expect(code).not.toMatch(/[IO]/);
    }
  });

  it("ends with a 4-digit number between 1000 and 9999", () => {
    const digits = Number(generateReferralCode().slice(3));
    expect(digits).toBeGreaterThanOrEqual(1000);
    expect(digits).toBeLessThanOrEqual(9999);
  });

  it("generates unique codes across multiple calls", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateReferralCode()));
    // With 50 draws from a large space, duplicates should be extremely rare
    expect(codes.size).toBeGreaterThan(40);
  });
});

// ─── daysUnlocked ─────────────────────────────────────────────────────────────

describe("daysUnlocked", () => {
  it("returns 0 when no referrals", () => {
    expect(daysUnlocked(0)).toBe(0);
  });

  it("returns 30 for 1 referral", () => {
    expect(daysUnlocked(1)).toBe(30);
  });

  it("returns 90 for 3 referrals", () => {
    expect(daysUnlocked(3)).toBe(90);
  });

  it("scales linearly", () => {
    expect(daysUnlocked(10)).toBe(300);
  });
});

// ─── loadReferral / saveReferral ──────────────────────────────────────────────

describe("loadReferral / saveReferral", () => {
  it("returns null when storage is empty", () => {
    expect(loadReferral()).toBeNull();
  });

  it("round-trips through localStorage", () => {
    const data: ReferralData = { code: "TST1234", referralCount: 2, createdAt: "2024-01-01" };
    saveReferral(data);
    expect(loadReferral()).toEqual(data);
  });

  it("overwrites previous data on save", () => {
    const data: ReferralData = { code: "TST1234", referralCount: 1, createdAt: "2024-01-01" };
    saveReferral(data);
    saveReferral({ ...data, referralCount: 5 });
    expect(loadReferral()?.referralCount).toBe(5);
  });
});

// ─── getOrCreateReferral ──────────────────────────────────────────────────────

describe("getOrCreateReferral", () => {
  it("creates and persists referral data on first call", () => {
    const data = getOrCreateReferral();
    expect(data.referralCount).toBe(0);
    expect(data.code).toHaveLength(7);
    expect(loadReferral()).toEqual(data);
  });

  it("returns the same code on subsequent calls (idempotent)", () => {
    const first = getOrCreateReferral();
    const second = getOrCreateReferral();
    expect(second.code).toBe(first.code);
  });

  it("sets createdAt to today's date", () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const data = getOrCreateReferral();
    expect(data.createdAt).toBe(todayStr);
  });
});

// ─── addReferral ──────────────────────────────────────────────────────────────

describe("addReferral", () => {
  it("increments referralCount by 1", () => {
    const initial: ReferralData = { code: "TST1234", referralCount: 0, createdAt: "2024-01-01" };
    const updated = addReferral(initial);
    expect(updated.referralCount).toBe(1);
  });

  it("persists the updated count to localStorage", () => {
    const initial: ReferralData = { code: "TST1234", referralCount: 3, createdAt: "2024-01-01" };
    addReferral(initial);
    expect(loadReferral()?.referralCount).toBe(4);
  });

  it("does not mutate the original object", () => {
    const initial: ReferralData = { code: "TST1234", referralCount: 0, createdAt: "2024-01-01" };
    addReferral(initial);
    expect(initial.referralCount).toBe(0);
  });

  it("preserves code and createdAt", () => {
    const initial: ReferralData = { code: "XYZ9999", referralCount: 2, createdAt: "2024-06-15" };
    const updated = addReferral(initial);
    expect(updated.code).toBe("XYZ9999");
    expect(updated.createdAt).toBe("2024-06-15");
  });
});
