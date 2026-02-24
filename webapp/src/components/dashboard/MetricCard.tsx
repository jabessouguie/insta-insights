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
  iconColor = "text-violet-400",
  iconBg = "bg-violet-500/10",
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
      {/* Subtle gradient accent */}
      <div
        className={cn(
          "absolute right-0 top-0 h-20 w-20 rounded-bl-full opacity-5",
          iconBg.replace("bg-", "bg-")
        )}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground md:text-3xl">{formattedValue}</p>

            {(change !== undefined || description) && (
              <div className="mt-2 flex items-center gap-1.5">
                {change !== undefined && (
                  <>
                    <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
                    <span className={cn("text-xs font-medium", trendColor)}>
                      {formatPercent(change)}
                    </span>
                  </>
                )}
                {description && (
                  <span className="text-xs text-muted-foreground">{description}</span>
                )}
              </div>
            )}
          </div>

          <div className={cn("rounded-xl p-2.5", iconBg)}>
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
