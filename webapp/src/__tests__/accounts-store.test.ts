/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for accounts-store.ts
 *
 * Covers:
 * - saveAccount: create, update by username, max-5 eviction
 * - loadAccounts: empty state, persistence
 * - removeAccount: removal + active-id cleanup
 * - getActiveAccountId / setActiveAccountId: persistence
 * - getActiveAccount: fallback to last saved
 */

import {
  loadAccounts,
  saveAccount,
  removeAccount,
  getActiveAccountId,
  setActiveAccountId,
  getActiveAccount,
  MAX_ACCOUNTS,
} from "@/lib/accounts-store";

// ─── Setup ────────────────────────────────────────────────────────────────────

let counter = 0;

beforeEach(() => {
  localStorage.clear();
  counter = 0;
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => `test-uuid-${++counter}` },
    configurable: true,
    writable: true,
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAccount(username: string, followerCount = 1000) {
  return { username, displayName: username, profilePicUrl: "", followerCount };
}

// ─── loadAccounts ─────────────────────────────────────────────────────────────

describe("loadAccounts", () => {
  it("returns empty array when localStorage is empty", () => {
    expect(loadAccounts()).toEqual([]);
  });

  it("returns saved accounts on subsequent loads", () => {
    saveAccount(makeAccount("alice"));
    const accounts = loadAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].username).toBe("alice");
  });

  it("returns empty array on corrupt localStorage data", () => {
    localStorage.setItem("insta_accounts", "not-valid-json");
    expect(loadAccounts()).toEqual([]);
  });
});

// ─── saveAccount ──────────────────────────────────────────────────────────────

describe("saveAccount", () => {
  it("assigns a uuid id to a new account", () => {
    const saved = saveAccount(makeAccount("bob"));
    expect(saved.id).toBe("test-uuid-1");
  });

  it("assigns a savedAt ISO timestamp", () => {
    const saved = saveAccount(makeAccount("bob"));
    expect(() => new Date(saved.savedAt)).not.toThrow();
    expect(saved.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("updates an existing account with the same username", () => {
    saveAccount(makeAccount("carol", 500));
    const updated = saveAccount(makeAccount("carol", 1500));
    const accounts = loadAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].followerCount).toBe(1500);
    expect(accounts[0].id).toBe(updated.id);
  });

  it("preserves the original id when updating an existing account", () => {
    const original = saveAccount(makeAccount("dave"));
    const updated = saveAccount(makeAccount("dave", 9999));
    expect(updated.id).toBe(original.id);
  });

  it("stores multiple different accounts", () => {
    saveAccount(makeAccount("alice"));
    saveAccount(makeAccount("bob"));
    saveAccount(makeAccount("carol"));
    expect(loadAccounts()).toHaveLength(3);
  });

  it(`evicts the oldest account when limit of ${MAX_ACCOUNTS} is exceeded`, () => {
    for (let i = 1; i <= MAX_ACCOUNTS; i++) {
      saveAccount(makeAccount(`user${i}`));
    }
    expect(loadAccounts()).toHaveLength(MAX_ACCOUNTS);

    // Add one more — oldest (user1) should be evicted
    saveAccount(makeAccount("overflow"));
    const accounts = loadAccounts();
    expect(accounts).toHaveLength(MAX_ACCOUNTS);
    expect(accounts.find((a) => a.username === "user1")).toBeUndefined();
    expect(accounts.find((a) => a.username === "overflow")).toBeDefined();
  });
});

// ─── removeAccount ────────────────────────────────────────────────────────────

describe("removeAccount", () => {
  it("removes the account with the given id", () => {
    const saved = saveAccount(makeAccount("eve"));
    removeAccount(saved.id);
    expect(loadAccounts()).toHaveLength(0);
  });

  it("is a no-op for an unknown id", () => {
    saveAccount(makeAccount("frank"));
    removeAccount("non-existent-id");
    expect(loadAccounts()).toHaveLength(1);
  });

  it("clears the active account id when the active account is removed", () => {
    const saved = saveAccount(makeAccount("grace"));
    setActiveAccountId(saved.id);
    expect(getActiveAccountId()).toBe(saved.id);
    removeAccount(saved.id);
    expect(getActiveAccountId()).toBeNull();
  });

  it("does not clear active account id when a different account is removed", () => {
    const a = saveAccount(makeAccount("henry"));
    const b = saveAccount(makeAccount("iris"));
    setActiveAccountId(a.id);
    removeAccount(b.id);
    expect(getActiveAccountId()).toBe(a.id);
  });
});

// ─── getActiveAccountId / setActiveAccountId ──────────────────────────────────

describe("active account id", () => {
  it("returns null when nothing has been set", () => {
    expect(getActiveAccountId()).toBeNull();
  });

  it("persists the active account id", () => {
    setActiveAccountId("test-uuid-1");
    expect(getActiveAccountId()).toBe("test-uuid-1");
  });

  it("clears the active account id when null is passed", () => {
    setActiveAccountId("test-uuid-1");
    setActiveAccountId(null);
    expect(getActiveAccountId()).toBeNull();
  });
});

// ─── getActiveAccount ─────────────────────────────────────────────────────────

describe("getActiveAccount", () => {
  it("returns null when no accounts are saved", () => {
    expect(getActiveAccount()).toBeNull();
  });

  it("returns the account matching the active id", () => {
    saveAccount(makeAccount("jack"));
    const kate = saveAccount(makeAccount("kate"));
    setActiveAccountId(kate.id);
    expect(getActiveAccount()?.username).toBe("kate");
  });

  it("falls back to the last saved account when no active id is set", () => {
    saveAccount(makeAccount("liam"));
    saveAccount(makeAccount("mia"));
    // no setActiveAccountId call
    expect(getActiveAccount()?.username).toBe("mia");
  });

  it("falls back to the last account when active id does not match any account", () => {
    saveAccount(makeAccount("noah"));
    setActiveAccountId("stale-id-that-does-not-exist");
    expect(getActiveAccount()?.username).toBe("noah");
  });
});
