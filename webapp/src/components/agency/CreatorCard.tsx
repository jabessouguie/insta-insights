"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber, scoreColor } from "@/lib/utils";
import { CheckCircle, TrendingUp, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreatorProfile } from "@/types/instagram";

interface CreatorCardProps {
  creator: CreatorProfile;
  isSelected?: boolean;
  onClick?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Travel: "bg-blue-500/20 text-blue-400",
  Fashion: "bg-pink-500/20 text-pink-400",
  Food: "bg-amber-500/20 text-amber-400",
  Tech: "bg-cyan-500/20 text-cyan-400",
  Fitness: "bg-emerald-500/20 text-emerald-400",
  Beauty: "bg-rose-500/20 text-rose-400",
  Gaming: "bg-violet-500/20 text-violet-400",
  Art: "bg-orange-500/20 text-orange-400",
  Music: "bg-indigo-500/20 text-indigo-400",
  Lifestyle: "bg-teal-500/20 text-teal-400",
  Business: "bg-slate-500/20 text-slate-400",
  Other: "bg-gray-500/20 text-gray-400",
};

export function CreatorCard({ creator, isSelected, onClick }: CreatorCardProps) {
  const scoreClass = scoreColor(creator.overallScore);

  return (
    <Card
      className={cn(
        "cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg",
        isSelected && "shadow-lg ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      {/* Score accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, hsl(var(--primary)) ${creator.overallScore}%, hsl(var(--muted)) ${creator.overallScore}%)`,
        }}
      />

      <CardContent className="p-4">
        {/* Header row */}
        <div className="mb-4 flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-border">
            <AvatarImage src={creator.profilePicUrl} alt={creator.username} />
            <AvatarFallback>{creator.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">@{creator.username}</p>
              {creator.isVerified && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
            </div>
            <p className="truncate text-xs text-muted-foreground">{creator.fullName}</p>
            <span
              className={cn(
                "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                CATEGORY_COLORS[creator.category] ?? CATEGORY_COLORS.Other
              )}
            >
              {creator.category}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className={cn("text-xl font-bold tabular-nums", scoreClass)}>
              {creator.overallScore}
            </span>
            <span className="text-[10px] text-muted-foreground">score</span>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="mb-0.5 flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="text-[10px] font-medium">Abonnés</span>
            </div>
            <p className="text-sm font-bold">{formatNumber(creator.followerCount)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="mb-0.5 flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] font-medium">Engagement</span>
            </div>
            <p className="text-sm font-bold">{creator.engagementRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="mb-0.5 flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              <span className="text-[10px] font-medium">Qualité audience</span>
            </div>
            <p className="text-sm font-bold">{creator.audienceQualityScore}/100</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="mb-0.5 flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span className="text-[10px] font-medium">Est./post</span>
            </div>
            <p className="text-sm font-bold">
              {creator.estimatedEarningsPerPost
                ? `${creator.estimatedEarningsPerPost.toLocaleString("fr-FR")}€`
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Score bars */}
        <div className="space-y-2">
          {[
            { label: "Consistance", value: creator.contentConsistencyScore },
            { label: "Croissance", value: creator.growthScore },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-0.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{label}</span>
                <span className="font-medium">{value}/100</span>
              </div>
              <Progress value={value} className="h-1" />
            </div>
          ))}
        </div>

        {/* Tags */}
        {creator.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {creator.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CreatorCardSkeleton() {
  return (
    <Card>
      <div className="h-1 w-full bg-muted" />
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
