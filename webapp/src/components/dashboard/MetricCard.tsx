import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number; // % change
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  format?: "number" | "percent" | "raw";
}

export function MetricCard({
  title,
  value,
  change,
  description,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  format = "raw",
}: MetricCardProps) {
  const formattedValue =
    format === "number"
      ? formatNumber(Number(value))
      : format === "percent"
        ? `${Number(value).toFixed(1)}%`
        : value;

  const TrendIcon =
    change === undefined || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;

  const trendColor =
    change === undefined || change === 0
      ? "text-muted-foreground"
      : change > 0
        ? "text-emerald-500"
        : "text-red-500";

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      {/* Subtle background pattern/accent */}
      <div
        className={cn(
          "absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.03] transition-transform group-hover:scale-110",
          iconBg
        )}
        aria-hidden="true"
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </h3>
            <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {formattedValue}
            </p>

            {(change !== undefined || description) && (
              <div className="mt-2 flex items-center gap-1.5">
                {change !== undefined && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                      change > 0 ? "bg-emerald-500/10" : change < 0 ? "bg-red-500/10" : "bg-muted"
                    )}
                  >
                    <TrendIcon className={cn("h-3 w-3", trendColor)} />
                    <span className={cn("text-[10px] font-bold", trendColor)}>
                      {formatPercent(Math.abs(change))}
                    </span>
                  </div>
                )}
                {description && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {description}
                  </span>
                )}
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}
