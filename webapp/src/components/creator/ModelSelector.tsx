"use client";

import { MODEL_OPTIONS } from "@/lib/model-prefs-store";
import type { ModelFeature } from "@/lib/model-prefs-store";

interface ModelSelectorProps {
  feature: ModelFeature;
  value: string;
  onChange: (model: string) => void;
  className?: string;
}

const FEATURE_LABELS: Record<ModelFeature, string> = {
  carousel: "Modèle IA (carrousel)",
  insights: "Modèle IA (analyse)",
  report: "Modèle IA (rapport)",
  audience: "Modèle IA (audience)",
  captions: "Modèle IA (légendes)",
};

export function ModelSelector({ feature, value, onChange, className }: ModelSelectorProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {FEATURE_LABELS[feature]}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {MODEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
