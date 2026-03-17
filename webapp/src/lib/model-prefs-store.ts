/**
 * Per-feature AI model preference store (localStorage).
 * Allows the user to choose a specific model for carousel, insights, and report generation.
 */

export type ModelFeature = "carousel" | "insights" | "report";

export type ModelPrefs = Partial<Record<ModelFeature, string>>;

const STORAGE_KEY = "model_prefs_v1";

export const MODEL_OPTIONS: Array<{ label: string; value: string; provider: string }> = [
  { label: "Gemini Flash (rapide)", value: "gemini-3-flash-preview", provider: "gemini" },
  { label: "Gemini Pro (puissant)", value: "gemini-3.1-pro-preview", provider: "gemini" },
  { label: "Claude Sonnet 4.6", value: "claude-sonnet-4-6", provider: "anthropic" },
  { label: "Claude Opus 4.6", value: "claude-opus-4-6", provider: "anthropic" },
  { label: "GPT-4.1 (flagship)", value: "gpt-4.1", provider: "openai" },
  { label: "GPT-4.1 mini (rapide)", value: "gpt-4.1-mini", provider: "openai" },
  { label: "o3 (raisonnement)", value: "o3", provider: "openai" },
  { label: "o4-mini (raisonnement rapide)", value: "o4-mini", provider: "openai" },
];

export const DEFAULT_MODEL = "gemini-3-flash-preview";

export function loadModelPrefs(): ModelPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ModelPrefs) : {};
  } catch {
    return {};
  }
}

export function saveModelPref(feature: ModelFeature, model: string): void {
  if (typeof window === "undefined") return;
  const prefs = loadModelPrefs();
  prefs[feature] = model;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function getModelPref(feature: ModelFeature): string {
  const prefs = loadModelPrefs();
  return prefs[feature] ?? DEFAULT_MODEL;
}
