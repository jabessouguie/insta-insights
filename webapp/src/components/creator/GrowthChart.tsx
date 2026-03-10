"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getSnapshotsForPeriod,
  computeFollowerDelta,
  type GrowthSnapshot,
} from "@/lib/growth-store";
import { formatNumber } from "@/lib/utils";

type Period = 30 | 90 | 365;

const PERIOD_LABELS: Record<Period, string> = {
  30: "30j",
  90: "90j",
  365: "1 an",
};

/** Formats a date string "YYYY-MM-DD" to a short label like "10 mar". */
function shortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Recharts-ready growth chart showing follower count and engagement rate
 * over a selectable time period (30 / 90 / 365 days).
 *
 * Reads data from the growth-store (localStorage snapshots). If fewer than
 * 2 snapshots are available the component shows a placeholder message.
 */
export function GrowthChart() {
  const [period, setPeriod] = useState<Period>(30);
  const [snapshots, setSnapshots] = useState<GrowthSnapshot[]>([]);

  useEffect(() => {
    setSnapshots(getSnapshotsForPeriod(period));
  }, [period]);

  const delta = computeFollowerDelta(snapshots);
  const latest = snapshots[snapshots.length - 1];

  const chartData = snapshots.map((s) => ({
    date: shortDate(s.date),
    Abonnés: s.followers,
    "Engagement %": parseFloat(s.engagementRate.toFixed(2)),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Evolution des abonnés</CardTitle>
            {delta !== null && (
              <span
                className={`flex items-center gap-1 text-sm font-semibold ${
                  delta > 0
                    ? "text-emerald-400"
                    : delta < 0
                      ? "text-red-400"
                      : "text-muted-foreground"
                }`}
              >
                {delta > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : delta < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
                {delta > 0 ? "+" : ""}
                {formatNumber(delta)} sur la période
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {([30, 90, 365] as Period[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "secondary" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>
        </div>

        {latest && (
          <p className="text-xs text-muted-foreground">
            Dernier snapshot : {shortDate(latest.date)} — {formatNumber(latest.followers)} abonnés ·{" "}
            {latest.engagementRate.toFixed(2)}% engagement
          </p>
        )}
      </CardHeader>

      <CardContent>
        {snapshots.length < 2 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <TrendingUp className="h-8 w-8 opacity-30" />
            <p>Pas encore assez de données pour afficher la courbe.</p>
            <p className="text-xs">
              Revenez demain — un snapshot est enregistré automatiquement à chaque visite.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatNumber(v)}
                width={52}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) =>
                  name === "Abonnés" ? [formatNumber(value), name] : [`${value}%`, name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Abonnés"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={snapshots.length <= 15 ? { r: 3 } : false}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Engagement %"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={snapshots.length <= 15 ? { r: 3 } : false}
                activeDot={{ r: 5 }}
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
