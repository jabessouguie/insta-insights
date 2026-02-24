"use client";

import { useState, useCallback } from "react";
import type { InsightsApiRequest, InsightsApiResponse, InsightsResponse } from "@/types/instagram";

export interface UseInsightsReturn {
  insights: InsightsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: string | undefined;
  generate: (req: InsightsApiRequest) => Promise<void>;
}

export function useInsights(): UseInsightsReturn {
  const [insights, setInsights] = useState<InsightsResponse | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const generate = useCallback(async (req: InsightsApiRequest) => {
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      const json: InsightsApiResponse = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error ?? "Failed to generate insights");
      }

      setInsights(json.data);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { insights, isLoading, isError, error, generate };
}
