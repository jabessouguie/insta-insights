/** Campaign ROI tracking — localStorage persistence. */

const STORAGE_KEY = "instainsights_campaigns";

export interface Campaign {
  id: string;
  brand: string;
  date: string; // "YYYY-MM-DD"
  revenue: number;
  cost: number;
  reach: number;
  engagements: number;
  notes: string;
}

// ─── Calculations ──────────────────────────────────────────────────────────────

/**
 * Return on Investment as a percentage.
 * ROI = (revenue - cost) / cost * 100
 * Returns Infinity when cost is 0 and revenue > 0, 0 when both are 0.
 */
export function roi(revenue: number, cost: number): number {
  if (cost === 0) return revenue > 0 ? Infinity : 0;
  return ((revenue - cost) / cost) * 100;
}

/**
 * Cost Per Engagement.
 * CPE = cost / engagements
 * Returns 0 when engagements is 0.
 */
export function cpe(cost: number, engagements: number): number {
  if (engagements === 0) return 0;
  return cost / engagements;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export function loadCampaigns(): Campaign[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Campaign[];
  } catch {
    return [];
  }
}

export function saveCampaign(campaign: Campaign): void {
  if (typeof window === "undefined") return;
  const existing = loadCampaigns();
  const idx = existing.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) {
    existing[idx] = campaign;
  } else {
    existing.push(campaign);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function deleteCampaign(id: string): void {
  if (typeof window === "undefined") return;
  const remaining = loadCampaigns().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}

/** Create a new campaign with auto-generated id and today's date. */
export function createCampaign(partial: Omit<Campaign, "id" | "date">): Campaign {
  return {
    ...partial,
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
  };
}

// ─── Aggregates ───────────────────────────────────────────────────────────────

export interface CampaignSummary {
  totalRevenue: number;
  totalCost: number;
  totalCampaigns: number;
  avgRoi: number;
}

export function summarize(campaigns: Campaign[]): CampaignSummary {
  if (campaigns.length === 0) {
    return { totalRevenue: 0, totalCost: 0, totalCampaigns: 0, avgRoi: 0 };
  }
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalCost = campaigns.reduce((s, c) => s + c.cost, 0);
  const avgRoi = roi(totalRevenue, totalCost);
  return {
    totalRevenue,
    totalCost,
    totalCampaigns: campaigns.length,
    avgRoi: isFinite(avgRoi) ? avgRoi : 100,
  };
}
