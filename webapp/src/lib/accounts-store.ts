"use client";

/**
 * Accounts Store
 * Persists saved Instagram account profiles in localStorage.
 * Allows creators to switch between multiple accounts in the Header.
 * Maximum 5 accounts stored.
 */

export interface SavedAccount {
  id: string;
  username: string;
  displayName: string;
  profilePicUrl: string;
  followerCount: number;
  savedAt: string;
}

export const MAX_ACCOUNTS = 5;

const KEY_ACCOUNTS = "insta_accounts";
const KEY_ACTIVE = "insta_active_account_id";

export function loadAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_ACCOUNTS);
    if (!raw) return [];
    return JSON.parse(raw) as SavedAccount[];
  } catch {
    return [];
  }
}

export function saveAccount(account: Omit<SavedAccount, "id" | "savedAt">): SavedAccount {
  if (typeof window === "undefined") return { ...account, id: "", savedAt: "" };
  const accounts = loadAccounts();

  // Update if username already exists
  const existing = accounts.findIndex((a) => a.username === account.username);
  const saved: SavedAccount = {
    ...account,
    id: existing >= 0 ? accounts[existing].id : crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    accounts[existing] = saved;
  } else {
    // Enforce max — drop oldest if needed
    if (accounts.length >= MAX_ACCOUNTS) {
      accounts.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
      accounts.shift();
    }
    accounts.push(saved);
  }

  localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(accounts));
  return saved;
}

export function removeAccount(id: string): void {
  if (typeof window === "undefined") return;
  const accounts = loadAccounts().filter((a) => a.id !== id);
  localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(accounts));

  // Clear active if it was this account
  if (getActiveAccountId() === id) {
    localStorage.removeItem(KEY_ACTIVE);
  }
}

export function getActiveAccountId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_ACTIVE);
}

export function setActiveAccountId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id === null) {
    localStorage.removeItem(KEY_ACTIVE);
  } else {
    localStorage.setItem(KEY_ACTIVE, id);
  }
}

/** Returns the active account, falling back to the most recently saved one. */
export function getActiveAccount(): SavedAccount | null {
  const accounts = loadAccounts();
  if (accounts.length === 0) return null;
  const activeId = getActiveAccountId();
  return accounts.find((a) => a.id === activeId) ?? accounts[accounts.length - 1];
}
