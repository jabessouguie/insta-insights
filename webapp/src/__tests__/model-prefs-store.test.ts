/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for the model-prefs-store module.
 * Covers: load, save, get per-feature model preferences.
 */

import {
  loadModelPrefs,
  saveModelPref,
  getModelPref,
  DEFAULT_MODEL,
  MODEL_OPTIONS,
} from "@/lib/model-prefs-store";
import type { ModelFeature } from "@/lib/model-prefs-store";

beforeEach(() => {
  localStorage.clear();
});

describe("loadModelPrefs", () => {
  it("returns empty object when nothing is stored", () => {
    expect(loadModelPrefs()).toEqual({});
  });

  it("returns stored prefs", () => {
    localStorage.setItem("model_prefs_v1", JSON.stringify({ carousel: "gpt-4o" }));
    expect(loadModelPrefs()).toEqual({ carousel: "gpt-4o" });
  });

  it("returns empty object on parse error", () => {
    localStorage.setItem("model_prefs_v1", "not-json");
    expect(loadModelPrefs()).toEqual({});
  });
});

describe("saveModelPref", () => {
  it("saves a model preference for a feature", () => {
    saveModelPref("carousel", "claude-sonnet-4-6");
    const prefs = loadModelPrefs();
    expect(prefs.carousel).toBe("claude-sonnet-4-6");
  });

  it("persists multiple features independently", () => {
    saveModelPref("carousel", "gpt-4o");
    saveModelPref("insights", "claude-sonnet-4-6");
    saveModelPref("report", "gemini-3.1-pro-preview");
    const prefs = loadModelPrefs();
    expect(prefs.carousel).toBe("gpt-4o");
    expect(prefs.insights).toBe("claude-sonnet-4-6");
    expect(prefs.report).toBe("gemini-3.1-pro-preview");
  });

  it("overwrites an existing pref", () => {
    saveModelPref("carousel", "gpt-4o");
    saveModelPref("carousel", "claude-sonnet-4-6");
    expect(loadModelPrefs().carousel).toBe("claude-sonnet-4-6");
  });
});

describe("getModelPref", () => {
  it("returns DEFAULT_MODEL when nothing is stored", () => {
    const features: ModelFeature[] = ["carousel", "insights", "report"];
    for (const f of features) {
      expect(getModelPref(f)).toBe(DEFAULT_MODEL);
    }
  });

  it("returns the stored model for a feature", () => {
    saveModelPref("insights", "gpt-4o");
    expect(getModelPref("insights")).toBe("gpt-4o");
  });

  it("returns DEFAULT_MODEL for an unset feature even when other features are set", () => {
    saveModelPref("carousel", "gpt-4o");
    expect(getModelPref("insights")).toBe(DEFAULT_MODEL);
  });
});

describe("MODEL_OPTIONS", () => {
  it("has at least 4 options", () => {
    expect(MODEL_OPTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it("each option has label, value and provider", () => {
    for (const opt of MODEL_OPTIONS) {
      expect(typeof opt.label).toBe("string");
      expect(typeof opt.value).toBe("string");
      expect(typeof opt.provider).toBe("string");
    }
  });

  it("includes the default model", () => {
    expect(MODEL_OPTIONS.some((o) => o.value === DEFAULT_MODEL)).toBe(true);
  });
});
