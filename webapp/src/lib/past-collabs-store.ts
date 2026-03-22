/**
 * Past Collaborations Store
 *
 * Persists the creator's previous brand collaborations in localStorage.
 * These are injected into AI email generation and Media Kit prompts to
 * provide social proof and personalise the pitch.
 */

const KEY = "instainsights_past_collabs";

export interface PastCollab {
  id: string;
  /** Brand or partner name */
  brand: string;
  /** What the creator delivered (posts, stories, reels, event attendance, …) */
  deliverables: string;
  /** What the creator obtained in return (fee, free product, press stay, …) */
  obtained: string;
  /** Optional: key results achieved (reach, sales generated, code uses, …) */
  results?: string;
  /** ISO date string (YYYY-MM or YYYY-MM-DD) */
  doneAt: string;
}

function load(): PastCollab[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PastCollab[]) : [];
  } catch {
    return [];
  }
}

function persist(collabs: PastCollab[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(collabs));
}

export function loadPastCollabs(): PastCollab[] {
  return load();
}

export function savePastCollab(collab: Omit<PastCollab, "id">): PastCollab {
  const entry: PastCollab = { ...collab, id: crypto.randomUUID() };
  persist([entry, ...load()]);
  return entry;
}

export function updatePastCollab(updated: PastCollab): void {
  persist(load().map((c) => (c.id === updated.id ? updated : c)));
}

export function deletePastCollab(id: string): void {
  persist(load().filter((c) => c.id !== id));
}

export function clearPastCollabs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

/**
 * Format past collabs as a compact text block for injection into AI prompts.
 * Returns an empty string when no past collabs are recorded.
 */
export function formatPastCollabsForPrompt(collabs: PastCollab[]): string {
  if (collabs.length === 0) return "";
  const lines = collabs
    .slice(0, 5) // keep prompt lean: max 5 entries
    .map((c) => {
      const parts = [
        `- ${c.brand} (${c.doneAt})`,
        `  Livré : ${c.deliverables}`,
        `  Obtenu : ${c.obtained}`,
      ];
      if (c.results) parts.push(`  Résultats : ${c.results}`);
      return parts.join("\n");
    });
  return `Collaborations précédentes du créateur :\n${lines.join("\n")}`;
}
