"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { CreatorProfile } from "@/types/instagram";

interface CreatorComparisonProps {
  creators: CreatorProfile[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "#22c55e",
  "#f59e0b",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background p-3 text-xs shadow-xl">
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {Math.round(p.value)}/100
        </p>
      ))}
    </div>
  );
};

export function CreatorComparison({ creators }: CreatorComparisonProps) {
  if (creators.length < 2) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">
          Sélectionnez au moins 2 créateurs pour comparer
        </p>
      </Card>
    );
  }

  const selected = creators.slice(0, 5); // max 5 for readability

  const metrics = ["Engagement", "Qualité audience", "Constance", "Croissance", "Score global"];

  const radarData = metrics.map((metric) => {
    const row: Record<string, string | number> = { metric };
    selected.forEach((c) => {
      const val =
        metric === "Engagement"
          ? Math.min(c.engagementRate * 10, 100)
          : metric === "Qualité audience"
            ? c.audienceQualityScore
            : metric === "Constance"
              ? c.contentConsistencyScore
              : metric === "Croissance"
                ? c.growthScore
                : c.overallScore;
      row[c.username] = Math.round(val);
    });
    return row;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Comparaison des créateurs</CardTitle>
        <CardDescription>Radar multi-dimensions — top {selected.length} créateurs</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(v) => `@${v}`}
            />
            {selected.map((c, i) => (
              <Radar
                key={c.id}
                name={c.username}
                dataKey={c.username}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
