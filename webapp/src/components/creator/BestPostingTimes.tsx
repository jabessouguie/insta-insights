"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, clamp } from "@/lib/utils";

interface BestPostingTimesProps {
  days: { day: string; avgEngagement: number }[];
  hours: { hour: number; avgEngagement: number }[];
  isLoading?: boolean;
}

export function BestPostingTimes({ days, hours, isLoading }: BestPostingTimesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-1 h-3 w-52" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-16 shrink-0" />
              <Skeleton className="h-5 flex-1 rounded" />
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const maxDayEngage = Math.max(...days.map((d) => d.avgEngagement), 1);
  const maxHourEngage = Math.max(...hours.map((h) => h.avgEngagement), 1);
  const topDays = days.slice(0, 7);
  const topHours = hours.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Meilleurs moments de publication</CardTitle>
        <CardDescription>Par engagement moyen (likes + commentaires)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Days */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Par jour
          </p>
          <div className="space-y-2.5">
            {topDays.map((d, i) => {
              const pct = clamp((d.avgEngagement / maxDayEngage) * 100, 2, 100);
              return (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                    {d.day.slice(0, 3)}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        i === 0
                          ? "bg-gradient-to-r from-violet-600 to-violet-400"
                          : i === 1
                            ? "bg-gradient-to-r from-violet-500/80 to-violet-400/80"
                            : "bg-violet-500/40"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums">
                    {Math.round(d.avgEngagement)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hours */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top 5 heures
          </p>
          <div className="grid grid-cols-5 gap-2">
            {topHours.map((h, i) => {
              const pct = clamp((h.avgEngagement / maxHourEngage) * 100, 10, 100);
              return (
                <div key={h.hour} className="flex flex-col items-center gap-1.5">
                  <div className="relative flex h-20 w-full flex-col justify-end overflow-hidden rounded-lg bg-muted/50">
                    <div
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500",
                        i === 0
                          ? "bg-gradient-to-t from-violet-600 to-violet-400"
                          : "bg-violet-500/50"
                      )}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-medium">
                    {String(h.hour).padStart(2, "0")}h
                  </span>
                  {i === 0 && (
                    <span className="rounded-full bg-violet-500/20 px-1 py-0.5 text-[9px] font-semibold text-violet-400">
                      TOP
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
