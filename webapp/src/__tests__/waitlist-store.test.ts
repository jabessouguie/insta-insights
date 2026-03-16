/**
 * @jest-environment jsdom
 */
import {
  getWaitlistEntries,
  isOnWaitlist,
  addToWaitlist,
  removeFromWaitlist,
  clearWaitlist,
} from "@/lib/waitlist-store";

beforeEach(() => {
  localStorage.clear();
});

describe("getWaitlistEntries", () => {
  it("returns empty array when nothing stored", () => {
    expect(getWaitlistEntries()).toEqual([]);
  });

  it("returns entries after addToWaitlist", () => {
    addToWaitlist("a@example.com", "pro");
    expect(getWaitlistEntries()).toHaveLength(1);
  });
});

describe("isOnWaitlist", () => {
  it("returns false when not on waitlist", () => {
    expect(isOnWaitlist("a@example.com")).toBe(false);
  });

  it("returns true after adding email", () => {
    addToWaitlist("a@example.com", "pro");
    expect(isOnWaitlist("a@example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    addToWaitlist("Test@Example.COM", "pro");
    expect(isOnWaitlist("test@example.com")).toBe(true);
    expect(isOnWaitlist("TEST@EXAMPLE.COM")).toBe(true);
  });
});

describe("addToWaitlist", () => {
  it("creates a new entry with correct fields", () => {
    const entry = addToWaitlist("a@example.com", "pro");
    expect(entry.email).toBe("a@example.com");
    expect(entry.plan).toBe("pro");
    expect(entry.joinedAt).toBeTruthy();
  });

  it("returns existing entry when email already present (no duplicate)", () => {
    const first = addToWaitlist("a@example.com", "pro");
    const second = addToWaitlist("a@example.com", "agency");
    expect(second.joinedAt).toBe(first.joinedAt);
    expect(getWaitlistEntries()).toHaveLength(1);
  });

  it("accumulates multiple distinct emails", () => {
    addToWaitlist("a@example.com", "pro");
    addToWaitlist("b@example.com", "agency");
    expect(getWaitlistEntries()).toHaveLength(2);
  });

  it("supports agency plan", () => {
    const entry = addToWaitlist("agency@example.com", "agency");
    expect(entry.plan).toBe("agency");
  });
});

describe("removeFromWaitlist", () => {
  it("removes an existing entry", () => {
    addToWaitlist("a@example.com", "pro");
    removeFromWaitlist("a@example.com");
    expect(isOnWaitlist("a@example.com")).toBe(false);
  });

  it("is case-insensitive on removal", () => {
    addToWaitlist("A@EXAMPLE.COM", "pro");
    removeFromWaitlist("a@example.com");
    expect(getWaitlistEntries()).toHaveLength(0);
  });

  it("is a no-op when email not found", () => {
    addToWaitlist("a@example.com", "pro");
    removeFromWaitlist("unknown@example.com");
    expect(getWaitlistEntries()).toHaveLength(1);
  });
});

describe("clearWaitlist", () => {
  it("removes all entries", () => {
    addToWaitlist("a@example.com", "pro");
    addToWaitlist("b@example.com", "agency");
    clearWaitlist();
    expect(getWaitlistEntries()).toHaveLength(0);
  });

  it("is a no-op when already empty", () => {
    expect(() => clearWaitlist()).not.toThrow();
  });
});
