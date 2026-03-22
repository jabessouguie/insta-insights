/**
 * @jest-environment jsdom
 */
import { beforeEach } from "@jest/globals";
import {
  loadPastCollabs,
  savePastCollab,
  updatePastCollab,
  deletePastCollab,
  clearPastCollabs,
  formatPastCollabsForPrompt,
  type PastCollab,
} from "@/lib/past-collabs-store";

beforeEach(() => {
  localStorage.clear();
  // Polyfill crypto.randomUUID for jsdom
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => Math.random().toString(36).slice(2) },
    configurable: true,
  });
});

describe("loadPastCollabs", () => {
  it("returns [] when localStorage is empty", () => {
    expect(loadPastCollabs()).toEqual([]);
  });

  it("returns parsed array after save", () => {
    savePastCollab({
      brand: "Acme",
      deliverables: "2 posts",
      obtained: "500 €",
      doneAt: "2025-03",
    });
    const result = loadPastCollabs();
    expect(result).toHaveLength(1);
    expect(result[0].brand).toBe("Acme");
  });
});

describe("savePastCollab", () => {
  it("assigns an id and persists", () => {
    const entry = savePastCollab({
      brand: "Hotel X",
      deliverables: "3 stories",
      obtained: "2 nuits offertes",
      doneAt: "2024-12",
    });
    expect(entry.id).toBeTruthy();
    expect(loadPastCollabs()[0].brand).toBe("Hotel X");
  });

  it("prepends new entries (most recent first)", () => {
    savePastCollab({ brand: "A", deliverables: "x", obtained: "y", doneAt: "2024-01" });
    savePastCollab({ brand: "B", deliverables: "x", obtained: "y", doneAt: "2024-02" });
    const list = loadPastCollabs();
    expect(list[0].brand).toBe("B");
    expect(list[1].brand).toBe("A");
  });

  it("persists optional results field", () => {
    const entry = savePastCollab({
      brand: "Brand",
      deliverables: "1 reel",
      obtained: "300 €",
      results: "10k vues",
      doneAt: "2025-01",
    });
    expect(entry.results).toBe("10k vues");
    expect(loadPastCollabs()[0].results).toBe("10k vues");
  });
});

describe("updatePastCollab", () => {
  it("updates the matching entry", () => {
    const entry = savePastCollab({
      brand: "BrandOld",
      deliverables: "x",
      obtained: "y",
      doneAt: "2024-06",
    });
    updatePastCollab({ ...entry, brand: "BrandNew" });
    expect(loadPastCollabs()[0].brand).toBe("BrandNew");
  });

  it("does not change other entries", () => {
    const a = savePastCollab({ brand: "A", deliverables: "x", obtained: "y", doneAt: "2024-01" });
    savePastCollab({ brand: "B", deliverables: "x", obtained: "y", doneAt: "2024-02" });
    updatePastCollab({ ...a, brand: "A-updated" });
    const list = loadPastCollabs();
    expect(list.find((c) => c.id === a.id)?.brand).toBe("A-updated");
    expect(list.some((c) => c.brand === "B")).toBe(true);
  });
});

describe("deletePastCollab", () => {
  it("removes the entry by id", () => {
    const entry = savePastCollab({
      brand: "ToDelete",
      deliverables: "x",
      obtained: "y",
      doneAt: "2025-02",
    });
    deletePastCollab(entry.id);
    expect(loadPastCollabs()).toHaveLength(0);
  });

  it("leaves other entries intact", () => {
    const a = savePastCollab({ brand: "A", deliverables: "x", obtained: "y", doneAt: "2024-01" });
    const b = savePastCollab({ brand: "B", deliverables: "x", obtained: "y", doneAt: "2024-02" });
    deletePastCollab(b.id);
    const list = loadPastCollabs();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(a.id);
  });
});

describe("clearPastCollabs", () => {
  it("removes all entries", () => {
    savePastCollab({ brand: "A", deliverables: "x", obtained: "y", doneAt: "2024-01" });
    savePastCollab({ brand: "B", deliverables: "x", obtained: "y", doneAt: "2024-02" });
    clearPastCollabs();
    expect(loadPastCollabs()).toHaveLength(0);
  });
});

describe("formatPastCollabsForPrompt", () => {
  it("returns empty string for empty array", () => {
    expect(formatPastCollabsForPrompt([])).toBe("");
  });

  it("includes brand, deliverables, obtained", () => {
    const collabs: PastCollab[] = [
      {
        id: "1",
        brand: "Hôtel Ritz",
        deliverables: "2 posts + 5 stories",
        obtained: "Séjour offert",
        doneAt: "2025-01",
      },
    ];
    const result = formatPastCollabsForPrompt(collabs);
    expect(result).toContain("Hôtel Ritz");
    expect(result).toContain("2 posts + 5 stories");
    expect(result).toContain("Séjour offert");
  });

  it("includes results when provided", () => {
    const collabs: PastCollab[] = [
      {
        id: "1",
        brand: "Brand",
        deliverables: "1 reel",
        obtained: "300 €",
        results: "12k vues",
        doneAt: "2025-02",
      },
    ];
    expect(formatPastCollabsForPrompt(collabs)).toContain("12k vues");
  });

  it("limits to 5 entries max", () => {
    const collabs: PastCollab[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      brand: `Brand${i}`,
      deliverables: "x",
      obtained: "y",
      doneAt: "2025-01",
    }));
    const result = formatPastCollabsForPrompt(collabs);
    expect(result).toContain("Brand0");
    expect(result).not.toContain("Brand5");
  });
});
