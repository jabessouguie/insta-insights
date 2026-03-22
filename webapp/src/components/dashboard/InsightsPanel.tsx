"use client";

import { useState, useEffect } from "react";
import { useAnimatedStatus } from "@/hooks/useAnimatedStatus";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Bell,
  RefreshCw,
  Copy,
  Check,
  CalendarClock,
} from "lucide-react";
import { AIFeedbackBar } from "@/components/ui/ai-feedback-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { AIInsight, InsightsApiRequest } from "@/types/instagram";
import { useInsights } from "@/hooks/useInsights";
import { ModelSelector } from "@/components/creator/ModelSelector";
import { getModelPref, saveModelPref, DEFAULT_MODEL } from "@/lib/model-prefs-store";

interface InsightsPanelProps {
  request: InsightsApiRequest;
  initialInsights?: AIInsight[];
  summary?: string;
}

const INSIGHT_ICONS = {
  success: TrendingUp,
  warning: AlertTriangle,
  tip: Lightbulb,
  alert: Bell,
};

const INSIGHT_COLORS = {
  success: "border-l-emerald-500 bg-emerald-500/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  tip: "border-l-violet-500 bg-violet-500/5",
  alert: "border-l-red-500 bg-red-500/5",
};

const ICON_COLORS = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  tip: "text-violet-500",
  alert: "text-red-500",
};

const PRIORITY_BADGES = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
};

function PromptTemplatesSection({ templates }: { templates: string[] }) {
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="border-t border-border/50 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Copy className="h-3 w-3" /> Templates de captions
      </p>
      <div className="space-y-2">
        {templates.map((tpl, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <p className="flex-1 text-xs leading-relaxed text-foreground/80">{tpl}</p>
            <button
              onClick={() => handleCopy(tpl, i)}
              className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              {copied === i ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarSuggestionsSection({
  suggestions,
}: {
  suggestions: Array<{ day: string; time: string; contentType: string; rationale: string }>;
}) {
  return (
    <div className="border-t border-border/50 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <CalendarClock className="h-3 w-3" /> Créneaux recommandés
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {suggestions.map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card/60 px-3 py-2">
            <p className="text-xs font-semibold">
              {s.day} · {s.time}
            </p>
            <p className="text-[10px] font-medium text-primary">{s.contentType}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{s.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsPanel({ request, initialInsights, summary }: InsightsPanelProps) {
  const t = useT();
  const { insights, isLoading, generate } = useInsights();
  const [hasGenerated, setHasGenerated] = useState(false);
  const [insightsModel, setInsightsModel] = useState(DEFAULT_MODEL);
  useEffect(() => {
    setInsightsModel(getModelPref("insights"));
  }, []);

  const insightsStatuses = [
    t("insights.status.analyzeProfile"),
    t("insights.status.identifyNiche"),
    t("insights.status.readMetrics"),
    t("insights.status.analyzeTopContent"),
    t("insights.status.generateRecommendations"),
    t("insights.status.personalizeForNiche"),
    t("insights.status.finalize"),
  ];

  const priorityLabels = {
    high: t("insights.priority.high"),
    medium: t("insights.priority.medium"),
    low: t("insights.priority.low"),
  };

  const loadingStatus = useAnimatedStatus(isLoading, insightsStatuses);

  const displayInsights = insights?.insights ?? initialInsights;
  const displaySummary = insights?.summary ?? summary;

  // Auto-generate when we have real metrics data and haven't generated yet
  const hasData = Object.keys(request.metrics).length > 0 && request.profile?.followerCount;
  useEffect(() => {
    if (hasData && !hasGenerated && !isLoading) {
      setHasGenerated(true);
      generate({ ...request, model: insightsModel });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData]);

  const handleGenerate = async (feedback?: string) => {
    setHasGenerated(true);
    await generate({
      ...request,
      model: insightsModel,
      userFeedback: feedback,
      // Pass current insights so Gemini can deepen the analysis on regeneration
      previousInsights: hasGenerated ? (displayInsights ?? undefined) : undefined,
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-violet-500/10 to-pink-500/5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-violet-400" />
              {t("insights.title")}
            </CardTitle>
            <CardDescription>{t("insights.subtitle")}</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <ModelSelector
              feature="insights"
              value={insightsModel}
              onChange={(m) => {
                setInsightsModel(m);
                saveModelPref("insights", m);
              }}
              className="w-44"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleGenerate()}
              disabled={isLoading}
              className="shrink-0 text-xs"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {t("insights.button.analyzing")}
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  {hasGenerated ? t("insights.button.refresh") : t("insights.button.generate")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Summary */}
        {displaySummary && (
          <p className="mt-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-foreground/80">
            {displaySummary}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-1 p-4">
            <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 shrink-0 animate-spin" />
              {loadingStatus}
            </p>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border-l-2 border-l-muted p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayInsights && displayInsights.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {displayInsights.map((insight) => {
              const Icon = INSIGHT_ICONS[insight.type];
              return (
                <li
                  key={insight.id}
                  className={cn(
                    "border-l-[3px] p-4 transition-colors hover:bg-muted/30",
                    INSIGHT_COLORS[insight.type]
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        insight.type === "success"
                          ? "bg-emerald-500/10"
                          : insight.type === "warning"
                            ? "bg-amber-500/10"
                            : insight.type === "tip"
                              ? "bg-violet-500/10"
                              : "bg-red-500/10"
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", ICON_COLORS[insight.type])} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold leading-tight">{insight.title}</p>
                        <Badge
                          variant={PRIORITY_BADGES[insight.priority]}
                          className="h-4 px-1.5 text-[10px]"
                        >
                          {priorityLabels[insight.priority]}
                        </Badge>
                        {insight.metric && (
                          <span className="font-mono text-xs font-medium text-muted-foreground">
                            {insight.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {insight.description}
                      </p>
                      {insight.recommendation && (
                        <p className="mt-2 text-xs font-medium text-foreground/70">
                          → {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("insights.empty")}</p>
          </div>
        )}
        {/* Caption templates */}
        {insights?.postPromptTemplates && insights.postPromptTemplates.length > 0 && (
          <PromptTemplatesSection templates={insights.postPromptTemplates} />
        )}
        {/* Calendar suggestions */}
        {insights?.calendarSuggestions && insights.calendarSuggestions.length > 0 && (
          <CalendarSuggestionsSection suggestions={insights.calendarSuggestions} />
        )}
        {displayInsights && displayInsights.length > 0 && (
          <div className="p-4 pt-0">
            <AIFeedbackBar
              onRegenerate={handleGenerate}
              isGenerating={isLoading}
              placeholder={t("insights.feedbackPlaceholder")}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
