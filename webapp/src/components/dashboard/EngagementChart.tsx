"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentTypePerformance } from "@/types/instagram";

interface EngagementChartProps {
  data: ContentTypePerformance[];
  isLoading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  IMAGE: "Photo",
  REEL: "Reel",
  STORY: "Story",
  CAROUSEL: "Carousel",
  VIDEO: "Vidéo",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background p-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {TYPE_LABELS[label] ?? label}
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm" style={{ color: p.color }}>
          <span className="font-semibold">{Math.round(p.value)}</span>{" "}
          {p.name === "avgLikes" ? "likes" : "commentaires"}
        </p>
      ))}
    </div>
  );
};

export function EngagementChart({ data, isLoading }: EngagementChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-1 h-3 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    type: d.type,
    avgLikes: Math.round(d.avgLikes),
    avgComments: Math.round(d.avgComments),
    count: d.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Performance par Type de Contenu</CardTitle>
        <CardDescription>Engagement moyen (likes + commentaires) par format</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="type"
              tickFormatter={(v) => TYPE_LABELS[v] ?? v}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            />
            <Legend
              formatter={(v) => (v === "avgLikes" ? "Likes" : "Commentaires")}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar
              dataKey="avgLikes"
              name="avgLikes"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
            <Bar
              dataKey="avgComments"
              name="avgComments"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
