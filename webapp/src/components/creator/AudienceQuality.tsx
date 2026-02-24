"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent } from "@/lib/utils";
import { Users, UserX, UserCheck, ArrowLeftRight } from "lucide-react";

interface AudienceQualityProps {
  followerCount: number;
  inactiveCount: number;
  inactivePercentage: number;
  nonReciprocalCount: number;
  followingCount: number;
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background p-2.5 text-xs shadow-xl">
      <p className="font-semibold">{payload[0].name}</p>
      <p className="text-muted-foreground">{formatNumber(payload[0].value)} abonnés</p>
    </div>
  );
};

export function AudienceQuality({
  followerCount,
  inactiveCount,
  inactivePercentage,
  nonReciprocalCount,
  followingCount,
  isLoading,
}: AudienceQualityProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="mx-auto h-40 w-40 rounded-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-full rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeCount = followerCount - inactiveCount;
  const activePercentage = 100 - inactivePercentage;

  const pieData = [
    { name: "Actifs", value: activeCount, color: "#22c55e" },
    { name: "Inactifs", value: inactiveCount, color: "#94a3b8" },
  ];

  const stats = [
    {
      icon: UserCheck,
      label: "Abonnés actifs",
      value: formatNumber(activeCount),
      pct: activePercentage,
      color: "text-emerald-500",
      barColor: "bg-emerald-500",
    },
    {
      icon: UserX,
      label: "Abonnés inactifs",
      value: formatNumber(inactiveCount),
      pct: inactivePercentage,
      color: "text-slate-400",
      barColor: "bg-slate-400",
    },
    {
      icon: ArrowLeftRight,
      label: "Non réciproques (following)",
      value: String(nonReciprocalCount),
      pct: followingCount > 0 ? (nonReciprocalCount / followingCount) * 100 : 0,
      color: "text-amber-500",
      barColor: "bg-amber-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          Qualité de l&apos;audience
        </CardTitle>
        <CardDescription>{formatNumber(followerCount)} abonnés au total</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Pie chart */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold">{formatPercent(activePercentage)}</p>
              <p className="text-xs text-muted-foreground">actifs</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3.5">
          {stats.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  {s.label}
                </div>
                <span className="font-semibold tabular-nums">
                  {s.value}{" "}
                  <span className="font-normal text-muted-foreground">({s.pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${s.barColor}`}
                  style={{ width: `${Math.min(s.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
