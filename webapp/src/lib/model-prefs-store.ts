/**
 * Per-feature AI model preference store (localStorage).
 * Allows the user to choose a specific model for carousel, insights, and report generation.
 */

export type ModelFeature =
  | "carousel"
  | "insights"
  | "report"
  | "audience"
  | "captions"
  | "ugc"
  | "guide"
  | "collabs";

export type ModelPrefs = Partial<Record<ModelFeature, string>>;

const STORAGE_KEY = "model_prefs_v1";

export const MODEL_OPTIONS: Array<{ label: string; value: string; provider: string }> = [
  { label: "Gemini Flash (rapide)", value: "gemini-3-flash-preview", provider: "gemini" },
  { label: "Gemini Pro (puissant)", value: "gemini-3.1-pro-preview", provider: "gemini" },
  { label: "Claude 3.7 Sonnet", value: "claude-3-7-sonnet-20250219", provider: "anthropic" },
  { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022", provider: "anthropic" },
  { label: "GPT-4o (flagship)", value: "gpt-4o", provider: "openai" },
  { label: "GPT-4o mini (rapide)", value: "gpt-4o-mini", provider: "openai" },
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
