/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for the report-store module.
 * Covers: loadReports, saveReport, deleteReport, clearReports.
 */

import { loadReports, saveReport, deleteReport, clearReports } from "@/lib/report-store";
import type { ExecutiveReport } from "@/types/instagram";

let uuidCounter = 0;

beforeEach(() => {
  uuidCounter = 0;
  localStorage.clear();
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => `test-uuid-${++uuidCounter}` },
    writable: true,
    configurable: true,
  });
});

function makeReport(period = "Février 2026"): ExecutiveReport {
  return {
    period,
    executiveSummary: "Good month.",
    keyWins: ["Win 1"],
    keyAlerts: ["Alert 1"],
    contentPerformance: "Reels performed well.",
    audienceTrends: "Stable audience.",
    nextMonthRecommendations: ["Post more reels."],
    generatedAt: new Date().toISOString(),
  };
}

describe("loadReports", () => {
  it("returns empty array when nothing is stored", () => {
    expect(loadReports()).toEqual([]);
  });

  it("returns stored reports", () => {
    const r = makeReport();
    saveReport(r, "monthly");
    const loaded = loadReports();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].report.period).toBe("Février 2026");
  });

  it("returns empty array on parse error", () => {
    localStorage.setItem("insta_executive_reports", "bad-json");
    expect(loadReports()).toEqual([]);
  });
});

describe("saveReport", () => {
  it("saves a monthly report and returns it with an id", () => {
    const saved = saveReport(makeReport("Jan 2026"), "monthly");
    expect(saved.id).toBeTruthy();
    expect(saved.periodType).toBe("monthly");
    expect(saved.report.period).toBe("Jan 2026");
    expect(saved.savedAt).toBeTruthy();
  });

  it("saves a weekly report with correct periodType", () => {
    const saved = saveReport(makeReport("Semaine du 10 mars"), "weekly");
    expect(saved.periodType).toBe("weekly");
  });

  it("defaults to monthly when no period type provided", () => {
    const saved = saveReport(makeReport());
    expect(saved.periodType).toBe("monthly");
  });

  it("prepends new reports (most recent first)", () => {
    saveReport(makeReport("Jan 2026"), "monthly");
    saveReport(makeReport("Feb 2026"), "monthly");
    const reports = loadReports();
    expect(reports[0].report.period).toBe("Feb 2026");
    expect(reports[1].report.period).toBe("Jan 2026");
  });

  it("caps at 20 reports", () => {
    for (let i = 0; i < 25; i++) {
      saveReport(makeReport(`Period ${i}`), "monthly");
    }
    expect(loadReports()).toHaveLength(20);
  });
});

describe("deleteReport", () => {
  it("removes the report with the given id", () => {
    const s1 = saveReport(makeReport("Jan 2026"), "monthly");
    const s2 = saveReport(makeReport("Feb 2026"), "monthly");
    deleteReport(s1.id);
    const reports = loadReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(s2.id);
  });

  it("does nothing if id not found", () => {
    saveReport(makeReport(), "monthly");
    expect(() => deleteReport("non-existent")).not.toThrow();
    expect(loadReports()).toHaveLength(1);
  });
});

describe("clearReports", () => {
  it("removes all reports", () => {
    saveReport(makeReport("Jan 2026"), "monthly");
    saveReport(makeReport("Feb 2026"), "weekly");
    clearReports();
    expect(loadReports()).toEqual([]);
  });
});
