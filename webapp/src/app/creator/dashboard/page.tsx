"use client";

import { useMemo, useState } from "react";
import {
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
  Eye,
  BarChart2,
  Share2,
  Bookmark,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MetricCard, MetricCardSkeleton } from "@/components/dashboard/MetricCard";
import { FollowersChart } from "@/components/dashboard/FollowersChart";
import { EngagementChart } from "@/components/dashboard/EngagementChart";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { BestPostingTimes } from "@/components/creator/BestPostingTimes";
import { AudienceQuality } from "@/components/creator/AudienceQuality";
import { AudienceDemographics } from "@/components/creator/AudienceDemographics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstagramData } from "@/hooks/useInstagramData";
import { formatNumber, formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const TYPE_LABELS: Record<string, string> = {
  IMAGE: "📸 Photo",
  REEL: "🎬 Reel",
  STORY: "⏱️ Story",
  CAROUSEL: "🖼️ Carousel",
  VIDEO: "🎥 Vidéo",
};

export default function CreatorDashboard() {
  const { data, isLoading } = useInstagramData();
  const t = useT();
  const [includeReels, setIncludeReels] = useState(false);

  const insightsRequest = useMemo(
    () => ({
      metrics: data?.metrics ?? {},
      profile: data?.profile ?? {},
      mode: "creator" as const,
      // Send up to 20 recent non-story posts with captions for Gemini theme analysis
      posts: data?.posts
        ?.filter((p) => p.mediaType !== "STORY" && p.caption.trim().length > 0)
        .slice(-20)
        .map((p) => ({
          caption: p.caption,
          // Timestamps come back as strings after JSON serialization from the API
          timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : String(p.timestamp),
          mediaType: p.mediaType,
        })),
      // Rich context for niche / audience / location-aware insights
      audienceInsights: data?.audienceInsights,
      contentInteractions: data?.contentInteractions,
      reachInsights: data?.reachInsights,
    }),
    [data]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Page title */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? t("dashboard.loading")
                : data
                  ? `${formatNumber(data.metrics.engagementRate)}% ${t("kpi.engagementRate").toLowerCase()} · ${t("dashboard.source")}: ${data.dataSource}`
                  : t("dashboard.noData")}
            </p>
          </div>
          {data && (
            <div className="flex flex-wrap gap-2 self-start sm:flex-col sm:items-end">
              <Badge variant="outline" className="text-xs">
                {t("dashboard.updatedAt")}: {formatDate(new Date(data.parsedAt))}
              </Badge>
              {(data.contentInteractions?.period ?? data.audienceInsights?.period) && (
                <Badge variant="secondary" className="text-xs">
                  {t("dashboard.dataPeriod")}:{" "}
                  {data.contentInteractions?.period ?? data.audienceInsights?.period}
                </Badge>
              )}
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="content">{t("tabs.content")}</TabsTrigger>
            <TabsTrigger value="audience">{t("tabs.audience")}</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
              ) : (
                <>
                  <MetricCard
                    title={t("kpi.followers")}
                    value={data?.profile.followerCount ?? 0}
                    change={data?.metrics.followerGrowthRate}
                    description={t("dashboard.vsLastMonth")}
                    icon={Users}
                    format="number"
                    iconColor="text-violet-400"
                    iconBg="bg-violet-500/10"
                  />
                  <div className="flex flex-col">
                    <MetricCard
                      title={t("kpi.engagementRate")}
                      value={
                        includeReels
                          ? (data?.metrics.engagementRateWithReels ??
                            data?.metrics.engagementRate ??
                            0)
                          : (data?.metrics.engagementRate ?? 0)
                      }
                      change={0.3}
                      description={t("dashboard.vsLastMonth")}
                      icon={TrendingUp}
                      format="percent"
                      iconColor="text-pink-400"
                      iconBg="bg-pink-500/10"
                    />
                    {data?.metrics.engagementRateWithReels !== undefined && (
                      <button
                        onClick={() => setIncludeReels((v) => !v)}
                        className="mt-1 px-1 text-left text-[10px] text-muted-foreground underline hover:text-foreground"
                      >
                        {t(includeReels ? "dashboard.er.reelsIncluded" : "dashboard.er.postsOnly")}
                      </button>
                    )}
                  </div>
                  <MetricCard
                    title={t("kpi.avgLikes")}
                    value={Math.round(data?.metrics.avgLikesPerPost ?? 0)}
                    icon={Heart}
                    format="number"
                    iconColor="text-red-400"
                    iconBg="bg-red-500/10"
                  />
                  <MetricCard
                    title={t("kpi.avgComments")}
                    value={Math.round(data?.metrics.avgCommentsPerPost ?? 0)}
                    icon={MessageCircle}
                    format="number"
                    iconColor="text-amber-400"
                    iconBg="bg-amber-500/10"
                  />
                </>
              )}
            </div>

            {/* Followers chart */}
            <FollowersChart
              data={data?.metrics.followerGrowthByMonth ?? []}
              isLoading={isLoading}
            />

            {/* AI Insights */}
            <InsightsPanel request={insightsRequest} />
          </TabsContent>

          {/* ── Content Tab ── */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <EngagementChart
                data={data?.metrics.contentTypePerformance ?? []}
                isLoading={isLoading}
              />
              <BestPostingTimes
                days={data?.metrics.bestPostingDays ?? []}
                hours={data?.metrics.bestPostingHours ?? []}
                isLoading={isLoading}
              />
            </div>

            {/* Top posts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">{t("content.topPosts")}</CardTitle>
                <CardDescription>{t("content.topPostsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {(data?.metrics.topPosts ?? []).map((post, i) => (
                      <div key={post.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-muted-foreground">
                            {post.caption || t("content.noCaption")}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {formatDate(new Date(post.timestamp))}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {TYPE_LABELS[post.mediaType] ?? post.mediaType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Audience Tab ── */}
          <TabsContent value="audience" className="space-y-6">
            {/* Reach KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
              ) : (
                <>
                  <MetricCard
                    title={t("kpi.accountsReached")}
                    value={
                      data?.reachInsights?.accountsReached ??
                      Math.round(data?.metrics.avgReachPerPost ?? 0)
                    }
                    change={data?.reachInsights ? 173 : undefined}
                    description={t("dashboard.vsPreviousPeriod")}
                    icon={Eye}
                    format="number"
                    iconColor="text-cyan-400"
                    iconBg="bg-cyan-500/10"
                  />
                  <MetricCard
                    title={t("kpi.impressions")}
                    value={data?.reachInsights?.impressions ?? 0}
                    change={data?.reachInsights ? 182 : undefined}
                    description={t("dashboard.vsPreviousPeriod")}
                    icon={BarChart2}
                    format="number"
                    iconColor="text-violet-400"
                    iconBg="bg-violet-500/10"
                  />
                  <MetricCard
                    title={t("kpi.profileVisits")}
                    value={data?.reachInsights?.profileVisits ?? 0}
                    change={data?.reachInsights ? 19.6 : undefined}
                    description={t("dashboard.vsPreviousPeriod")}
                    icon={Users}
                    format="number"
                    iconColor="text-emerald-400"
                    iconBg="bg-emerald-500/10"
                  />
                  <MetricCard
                    title={t("kpi.accountsInteracted")}
                    value={data?.contentInteractions?.accountsInteracted ?? 0}
                    change={data?.contentInteractions ? 179 : undefined}
                    description={`${data?.contentInteractions?.nonFollowerInteractionPct ?? 0}% ${t("dashboard.nonFollowerPctSuffix")}`}
                    icon={Share2}
                    format="number"
                    iconColor="text-pink-400"
                    iconBg="bg-pink-500/10"
                  />
                </>
              )}
            </div>

            {/* Interaction breakdown by type */}
            {(data?.contentInteractions || isLoading) && (
              <div className="grid gap-4 sm:grid-cols-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
                ) : (
                  <>
                    <MetricCard
                      title={t("dashboard.reelInteractions")}
                      value={data?.contentInteractions?.reels.interactions ?? 0}
                      change={398}
                      description={t("dashboard.reelInteractionsDesc")}
                      icon={TrendingUp}
                      format="number"
                      iconColor="text-orange-400"
                      iconBg="bg-orange-500/10"
                    />
                    <MetricCard
                      title={t("dashboard.saves")}
                      value={data?.contentInteractions?.reels.saves ?? 0}
                      icon={Bookmark}
                      format="number"
                      iconColor="text-amber-400"
                      iconBg="bg-amber-500/10"
                    />
                    <MetricCard
                      title={t("dashboard.nonFollowerReach")}
                      value={`${data?.reachInsights?.nonFollowerReachPct ?? 0}%`}
                      description={t("dashboard.nonFollowerReachDesc")}
                      icon={MessageCircle}
                      format="raw"
                      iconColor="text-indigo-400"
                      iconBg="bg-indigo-500/10"
                    />
                  </>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <AudienceQuality
                followerCount={data?.profile.followerCount ?? 0}
                inactiveCount={data?.metrics.inactiveFollowersCount ?? 0}
                inactivePercentage={data?.metrics.inactiveFollowersPercentage ?? 0}
                nonReciprocalCount={data?.metrics.nonReciprocalFollowsCount ?? 0}
                followingCount={data?.profile.followingCount ?? 0}
                isLoading={isLoading}
              />

              <AudienceDemographics
                audienceInsights={data?.audienceInsights}
                isLoading={isLoading}
              />
            </div>

            <InsightsPanel request={{ ...insightsRequest, mode: "creator" }} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
