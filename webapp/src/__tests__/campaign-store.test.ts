/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for the campaign store module.
 *
 * Covers:
 * - roi: return on investment calculation
 * - cpe: cost per engagement calculation
 * - summarize: aggregate metrics
 * - CRUD: save, load, delete (localStorage mocked)
 */

import {
  roi,
  cpe,
  summarize,
  createCampaign,
  loadCampaigns,
  saveCampaign,
  deleteCampaign,
} from "@/lib/campaign-store";
import type { Campaign } from "@/lib/campaign-store";

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c-1",
    brand: "Nike",
    date: "2024-06-01",
    revenue: 1000,
    cost: 200,
    reach: 50000,
    engagements: 2000,
    notes: "",
    ...overrides,
  };
}

// ─── roi ──────────────────────────────────────────────────────────────────────

describe("roi", () => {
  it("returns 400% when revenue is 5× cost", () => {
    expect(roi(1000, 200)).toBeCloseTo(400, 1);
  });

  it("returns -50% when revenue is half the cost", () => {
    expect(roi(100, 200)).toBeCloseTo(-50, 1);
  });

  it("returns 0% when revenue equals cost", () => {
    expect(roi(500, 500)).toBe(0);
  });

  it("returns 0 when both are 0", () => {
    expect(roi(0, 0)).toBe(0);
  });

  it("returns Infinity when cost is 0 and revenue > 0", () => {
    expect(roi(100, 0)).toBe(Infinity);
  });

  it("returns 0 when revenue is 0 and cost is 0", () => {
    expect(roi(0, 0)).toBe(0);
  });
});

// ─── cpe ──────────────────────────────────────────────────────────────────────

describe("cpe", () => {
  it("divides cost by engagements", () => {
    expect(cpe(200, 2000)).toBe(0.1);
  });

  it("returns 0 when engagements is 0", () => {
    expect(cpe(200, 0)).toBe(0);
  });

  it("returns 0 when cost is 0", () => {
    expect(cpe(0, 1000)).toBe(0);
  });
});

// ─── summarize ────────────────────────────────────────────────────────────────

describe("summarize", () => {
  it("returns zeros for empty list", () => {
    const s = summarize([]);
    expect(s.totalRevenue).toBe(0);
    expect(s.totalCost).toBe(0);
    expect(s.totalCampaigns).toBe(0);
    expect(s.avgRoi).toBe(0);
  });

  it("sums revenues and costs across campaigns", () => {
    const campaigns = [
      makeCampaign({ revenue: 500, cost: 100 }),
      makeCampaign({ id: "c-2", revenue: 300, cost: 200 }),
    ];
    const s = summarize(campaigns);
    expect(s.totalRevenue).toBe(800);
    expect(s.totalCost).toBe(300);
    expect(s.totalCampaigns).toBe(2);
  });

  it("computes overall ROI across combined revenue and cost", () => {
    const campaigns = [makeCampaign({ revenue: 600, cost: 200 })];
    const s = summarize(campaigns);
    // (600 - 200) / 200 * 100 = 200%
    expect(s.avgRoi).toBeCloseTo(200, 1);
  });

  it("uses 100 as avgRoi fallback when cost is 0 and revenue > 0", () => {
    const campaigns = [makeCampaign({ revenue: 500, cost: 0 })];
    const s = summarize(campaigns);
    expect(s.avgRoi).toBe(100);
  });
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

describe("CRUD operations", () => {
  it("loadCampaigns returns [] when storage is empty", () => {
    expect(loadCampaigns()).toEqual([]);
  });

  it("saveCampaign persists a campaign", () => {
    saveCampaign(makeCampaign());
    expect(loadCampaigns()).toHaveLength(1);
  });

  it("saveCampaign updates an existing campaign", () => {
    saveCampaign(makeCampaign());
    saveCampaign(makeCampaign({ brand: "Adidas" }));
    const loaded = loadCampaigns();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].brand).toBe("Adidas");
  });

  it("saveCampaign appends a new campaign", () => {
    saveCampaign(makeCampaign({ id: "a" }));
    saveCampaign(makeCampaign({ id: "b" }));
    expect(loadCampaigns()).toHaveLength(2);
  });

  it("deleteCampaign removes the correct campaign", () => {
    saveCampaign(makeCampaign({ id: "keep" }));
    saveCampaign(makeCampaign({ id: "remove" }));
    deleteCampaign("remove");
    const loaded = loadCampaigns();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("keep");
  });

  it("createCampaign sets today's date and a unique id", () => {
    const c1 = createCampaign({
      brand: "A",
      revenue: 100,
      cost: 50,
      reach: 1000,
      engagements: 100,
      notes: "",
    });
    const c2 = createCampaign({
      brand: "B",
      revenue: 200,
      cost: 100,
      reach: 2000,
      engagements: 200,
      notes: "",
    });
    expect(c1.id).not.toBe(c2.id);
    expect(c1.date).toBe(new Date().toISOString().slice(0, 10));
  });
});
