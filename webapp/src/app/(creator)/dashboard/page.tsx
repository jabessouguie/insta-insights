"use client";

import { useMemo } from "react";
import { Users, TrendingUp, Heart, MessageCircle, Eye, BarChart2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MetricCard, MetricCardSkeleton } from "@/components/dashboard/MetricCard";
import { FollowersChart } from "@/components/dashboard/FollowersChart";
import { EngagementChart } from "@/components/dashboard/EngagementChart";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { BestPostingTimes } from "@/components/creator/BestPostingTimes";
import { AudienceQuality } from "@/components/creator/AudienceQuality";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstagramData } from "@/hooks/useInstagramData";
import { formatNumber, formatDate } from "@/lib/utils";
import { mockCreatorInsights } from "@/lib/mock-data";

const TYPE_LABELS: Record<string, string> = {
  IMAGE: "📸 Photo",
  REEL: "🎬 Reel",
  STORY: "⏱️ Story",
  CAROUSEL: "🖼️ Carousel",
  VIDEO: "🎥 Vidéo",
};

export default function CreatorDashboard() {
  const { data, isLoading } = useInstagramData();

  const insightsRequest = useMemo(
    () => ({
      metrics: data?.metrics ?? {},
      profile: data?.profile ?? {},
      mode: "creator" as const,
    }),
    [data]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Page title */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Créateur</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Chargement des données..."
                : data
                  ? `${formatNumber(data.metrics.engagementRate)}% taux d'engagement · Source: ${data.dataSource}`
                  : "Aucune donnée disponible"}
            </p>
          </div>
          {data && (
            <Badge variant="outline" className="self-start text-xs sm:self-auto">
              Mis à jour: {formatDate(new Date(data.parsedAt))}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
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
                    title="Abonnés"
                    value={data?.profile.followerCount ?? 0}
                    change={data?.metrics.followerGrowthRate}
                    description="vs mois dernier"
                    icon={Users}
                    format="number"
                    iconColor="text-violet-400"
                    iconBg="bg-violet-500/10"
                  />
                  <MetricCard
                    title="Taux d'engagement"
                    value={data?.metrics.engagementRate ?? 0}
                    change={0.3}
                    description="vs mois dernier"
                    icon={TrendingUp}
                    format="percent"
                    iconColor="text-pink-400"
                    iconBg="bg-pink-500/10"
                  />
                  <MetricCard
                    title="Likes moyens/post"
                    value={Math.round(data?.metrics.avgLikesPerPost ?? 0)}
                    icon={Heart}
                    format="number"
                    iconColor="text-red-400"
                    iconBg="bg-red-500/10"
                  />
                  <MetricCard
                    title="Commentaires/post"
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
            <InsightsPanel
              request={insightsRequest}
              initialInsights={mockCreatorInsights}
              summary="Profil avec un bon potentiel. Les Reels sont ton meilleur levier de croissance organique."
            />
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
                <CardTitle className="text-base font-semibold">
                  Top 10 posts par engagement
                </CardTitle>
                <CardDescription>Posts avec le plus de likes + commentaires</CardDescription>
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
                            {post.caption || "Pas de légende"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {formatDate(new Date(post.timestamp))}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-red-400" />
                            {formatNumber(post.likes)}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MessageCircle className="h-3 w-3" />
                            {post.comments}
                          </span>
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
              ) : (
                <>
                  <MetricCard
                    title="Abonnements actifs"
                    value={data?.profile.followingCount ?? 0}
                    icon={Users}
                    format="number"
                    iconColor="text-blue-400"
                    iconBg="bg-blue-500/10"
                  />
                  <MetricCard
                    title="Portée moyenne/post"
                    value={Math.round(data?.metrics.avgReachPerPost ?? 0)}
                    icon={Eye}
                    format="number"
                    iconColor="text-cyan-400"
                    iconBg="bg-cyan-500/10"
                  />
                  <MetricCard
                    title="Posts analysés"
                    value={data?.profile.postCount ?? 0}
                    icon={BarChart2}
                    format="number"
                    iconColor="text-indigo-400"
                    iconBg="bg-indigo-500/10"
                  />
                </>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <AudienceQuality
                followerCount={data?.profile.followerCount ?? 0}
                inactiveCount={data?.metrics.inactiveFollowersCount ?? 0}
                inactivePercentage={data?.metrics.inactiveFollowersPercentage ?? 0}
                nonReciprocalCount={data?.metrics.nonReciprocalFollowsCount ?? 0}
                followingCount={data?.profile.followingCount ?? 0}
                isLoading={isLoading}
              />

              {/* Reco card */}
              <div className="space-y-4">
                <InsightsPanel
                  request={{ ...insightsRequest, mode: "creator" }}
                  initialInsights={mockCreatorInsights.filter((i) => i.category === "audience")}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
