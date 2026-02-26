"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import {
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
  Eye,
  BarChart2,
  Share2,
  Bookmark,
  MessageSquare,
  Send,
  Upload,
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
  const { data, isLoading, mutate } = useInstagramData();
  const t = useT();
  const [includeReels, setIncludeReels] = useState(false);

  // Zip upload
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadFileName, setUploadFileName] = useState("");

  /** Upload a single file via XHR (supports progress events). Returns the full parsed response. */
  const uploadOneFile = useCallback(
    (file: File, url: string): Promise<{ success: boolean; data?: unknown; error?: string }> =>
      new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("x-file-name", file.name);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ success: false, error: t("upload.error") });
          }
        };
        xhr.onerror = () => resolve({ success: false, error: t("upload.error") });
        xhr.send(file);
      }),
    [t]
  );

  const handleZipUpload = useCallback(async (files: File[]) => {
    const zips = files.filter((f) => f.name.endsWith(".zip"));
    if (zips.length === 0) {
      setUploadError(t("upload.invalidFormat"));
      return;
    }
    setIsUploading(true);
    setUploadError("");
    setUploadProgress(0);
    try {
      let allOk = true;
      for (let i = 0; i < zips.length; i++) {
        setUploadFileName(zips.length > 1 ? `(${i + 1}/${zips.length}) ${zips[i].name}` : zips[i].name);
        setUploadProgress(0);
        const url = i > 0 ? "/api/upload?keepExisting=1" : "/api/upload";
        const json = await uploadOneFile(zips[i], url);
        if (!json.success) {
          setUploadError(`${zips[i].name}: ${json.error ?? t("upload.error")}`);
          allOk = false;
          break;
        }
      }
      // After all ZIPs are extracted, re-fetch /api/data to parse the merged export
      if (allOk) mutate();
    } catch {
      setUploadError(t("upload.error"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFileName("");
    }
  }, [mutate, t, uploadOneFile]);

  // Natural language query
  const [queryInput, setQueryInput] = useState("");
  const [queryAnswer, setQueryAnswer] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryHistory, setQueryHistory] = useState<Array<{ q: string; a: string }>>([]);

  const handleQuery = async () => {
    if (!queryInput.trim() || !data) return;
    const question = queryInput.trim();
    setIsQuerying(true);
    setQueryAnswer("");
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: {
            profile: data.profile,
            metrics: data.metrics,
            audienceInsights: data.audienceInsights,
            contentInteractions: data.contentInteractions,
            reachInsights: data.reachInsights,
            recentPosts: data.posts
              ?.filter((p) => p.mediaType !== "STORY" && p.caption.trim().length > 0)
              .slice(-20)
              .map((p) => ({
                caption: p.caption,
                timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : String(p.timestamp),
                mediaType: p.mediaType,
                likes: p.likes,
                comments: p.comments,
              })),
          },
        }),
      });
      const json = await res.json();
      if (json.success && json.answer) {
        setQueryAnswer(json.answer);
        setQueryHistory((prev) => [...prev, { q: question, a: json.answer }]);
      } else {
        setQueryAnswer(json.error ?? t("query.error"));
      }
    } catch {
      setQueryAnswer(t("query.error"));
    } finally {
      setIsQuerying(false);
      setQueryInput("");
    }
  };

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

        {/* Zip upload */}
        <div className="mb-6">
          <div
            onClick={() => !isUploading && zipInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isUploading) return;
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) handleZipUpload(files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 text-sm transition-colors ${isUploading ? "border-primary/40 bg-primary/5" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
          >
            {isUploading ? (
              <>
                <div className="flex items-center gap-2 text-foreground">
                  <Upload className="h-4 w-4 animate-pulse" />
                  <span className="font-medium">{t("upload.uploading")}</span>
                </div>
                {uploadFileName && (
                  <span className="text-xs text-muted-foreground">{uploadFileName}</span>
                )}
                <div className="mx-auto w-2/3 max-w-xs">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-center text-xs text-muted-foreground">
                    {uploadProgress}%
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>{t("upload.dropzone")}</span>
              </>
            )}
          </div>
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) handleZipUpload(files);
              e.target.value = "";
            }}
          />
          {uploadError && (
            <p className="mt-1 text-xs text-destructive">{uploadError}</p>
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

            {/* Natural language query */}
            {data && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <MessageSquare className="h-4 w-4 text-violet-400" />
                    {t("query.title")}
                  </CardTitle>
                  <CardDescription>{t("query.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* History */}
                  {queryHistory.length > 0 && (
                    <div className="max-h-60 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                      {queryHistory.map((entry, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-xs font-medium text-foreground">{entry.q}</p>
                          <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                            {entry.a}
                          </p>
                          {i < queryHistory.length - 1 && (
                            <hr className="border-border/30" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleQuery();
                        }
                      }}
                      placeholder={t("query.placeholder")}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                      disabled={isQuerying}
                    />
                    <button
                      onClick={handleQuery}
                      disabled={isQuerying || !queryInput.trim()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
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
            <div className="grid gap-4 sm:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
              ) : (
                <>
                  <MetricCard
                    title={t("dashboard.reelInteractions")}
                    value={data?.contentInteractions?.reels.interactions ?? 0}
                    change={data?.contentInteractions ? 398 : undefined}
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
