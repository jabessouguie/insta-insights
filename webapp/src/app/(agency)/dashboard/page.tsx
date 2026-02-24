"use client";

import { useState, useMemo } from "react";
import { Building2, Users, TrendingUp, Eye, DollarSign, Plus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MetricCard, MetricCardSkeleton } from "@/components/dashboard/MetricCard";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { CreatorCard, CreatorCardSkeleton } from "@/components/agency/CreatorCard";
import { CreatorComparison } from "@/components/agency/CreatorComparison";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/utils";
import { mockAgencyPortfolio, mockAgencyInsights } from "@/lib/mock-data";

export default function AgencyDashboard() {
  const portfolio = mockAgencyPortfolio;
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const isLoading = false;

  const toggleCreator = (id: string) => {
    setSelectedCreators((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectedCreatorObjects = useMemo(
    () => portfolio.creators.filter((c) => selectedCreators.includes(c.id)),
    [selectedCreators, portfolio.creators]
  );

  const bestCreator = portfolio.creators.reduce((a, b) =>
    a.overallScore > b.overallScore ? a : b
  );

  const insightsRequest = useMemo(
    () => ({
      metrics: { engagementRate: portfolio.avgEngagementRate },
      profile: { followerCount: portfolio.totalFollowers },
      mode: "agency" as const,
      creatorProfile: { overallScore: bestCreator.overallScore, category: bestCreator.category },
    }),
    [portfolio, bestCreator]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header mode="agency" agencyName={portfolio.agencyName} />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Page title */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-6 w-6 text-pink-400" />
              {portfolio.agencyName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {portfolio.creators.length} créateurs · {formatNumber(portfolio.totalFollowers)}{" "}
              abonnés cumulés
            </p>
          </div>
          <Button className="self-start sm:self-auto" size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Ajouter un créateur
          </Button>
        </div>

        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            <TabsTrigger value="insights">Insights IA</TabsTrigger>
          </TabsList>

          {/* ── Portfolio Tab ── */}
          <TabsContent value="portfolio" className="space-y-6">
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
              ) : (
                <>
                  <MetricCard
                    title="Créateurs managés"
                    value={portfolio.creators.length}
                    icon={Users}
                    format="number"
                    iconColor="text-pink-400"
                    iconBg="bg-pink-500/10"
                  />
                  <MetricCard
                    title="Abonnés cumulés"
                    value={portfolio.totalFollowers}
                    icon={Users}
                    format="number"
                    iconColor="text-violet-400"
                    iconBg="bg-violet-500/10"
                  />
                  <MetricCard
                    title="Engagement moyen"
                    value={portfolio.avgEngagementRate}
                    icon={TrendingUp}
                    format="percent"
                    iconColor="text-emerald-400"
                    iconBg="bg-emerald-500/10"
                  />
                  <MetricCard
                    title="Portée totale"
                    value={portfolio.totalReach}
                    icon={Eye}
                    format="number"
                    iconColor="text-amber-400"
                    iconBg="bg-amber-500/10"
                  />
                </>
              )}
            </div>

            {/* Creator grid */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Créateurs ({portfolio.creators.length})
                </h2>
                {selectedCreators.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCreators.length} sélectionné(s) pour comparaison
                  </Badge>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <CreatorCardSkeleton key={i} />)
                  : portfolio.creators.map((creator) => (
                      <CreatorCard
                        key={creator.id}
                        creator={creator}
                        isSelected={selectedCreators.includes(creator.id)}
                        onClick={() => toggleCreator(creator.id)}
                      />
                    ))}
              </div>
            </div>

            {/* Revenue estimation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  Estimation de revenus par campagne
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {portfolio.creators
                    .sort(
                      (a, b) =>
                        (b.estimatedEarningsPerPost ?? 0) - (a.estimatedEarningsPerPost ?? 0)
                    )
                    .map((creator) => (
                      <div key={creator.id} className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={creator.profilePicUrl} />
                          <AvatarFallback className="text-[10px]">
                            {creator.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm">@{creator.username}</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-full bg-amber-400/60"
                            style={{
                              width: `${Math.min(
                                ((creator.estimatedEarningsPerPost ?? 0) / 3000) * 120,
                                120
                              )}px`,
                            }}
                          />
                          <span className="w-16 text-right text-sm font-semibold tabular-nums text-amber-400">
                            {creator.estimatedEarningsPerPost?.toLocaleString("fr-FR")}€
                          </span>
                        </div>
                      </div>
                    ))}
                  <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                    <span className="text-muted-foreground">Total campagne complète: </span>
                    <span className="font-bold text-amber-400">
                      {portfolio.creators
                        .reduce((a, c) => a + (c.estimatedEarningsPerPost ?? 0), 0)
                        .toLocaleString("fr-FR")}
                      €
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Comparison Tab ── */}
          <TabsContent value="comparison" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Cliquez sur des créateurs dans l&apos;onglet Portfolio pour les sélectionner, puis
              comparez ici. {selectedCreators.length === 0 && "(Affichage de tous les créateurs)"}
            </p>
            <CreatorComparison
              creators={
                selectedCreatorObjects.length >= 2
                  ? selectedCreatorObjects
                  : portfolio.creators.slice(0, 5)
              }
            />

            {/* Detailed comparison table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Tableau comparatif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-xs text-muted-foreground">
                        <th className="py-2 text-left font-medium">Créateur</th>
                        <th className="py-2 text-right font-medium">Abonnés</th>
                        <th className="py-2 text-right font-medium">Engagement</th>
                        <th className="py-2 text-right font-medium">Audience</th>
                        <th className="py-2 text-right font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {portfolio.creators
                        .sort((a, b) => b.overallScore - a.overallScore)
                        .map((creator, i) => (
                          <tr key={creator.id} className="transition-colors hover:bg-muted/30">
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={creator.profilePicUrl} />
                                  <AvatarFallback className="text-[9px]">
                                    {creator.username.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">@{creator.username}</span>
                                {creator.isVerified && (
                                  <span className="text-[10px] text-blue-400">✓</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 text-right tabular-nums">
                              {formatNumber(creator.followerCount)}
                            </td>
                            <td className="py-2.5 text-right font-medium tabular-nums text-emerald-500">
                              {creator.engagementRate.toFixed(1)}%
                            </td>
                            <td className="py-2.5 text-right tabular-nums">
                              {creator.audienceQualityScore}/100
                            </td>
                            <td className="py-2.5 text-right">
                              <Badge
                                variant={
                                  creator.overallScore >= 80
                                    ? "default"
                                    : creator.overallScore >= 60
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {creator.overallScore}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Insights Tab ── */}
          <TabsContent value="insights" className="space-y-6">
            <InsightsPanel
              request={insightsRequest}
              initialInsights={mockAgencyInsights}
              summary="Portfolio performant avec des opportunités de croissance identifiées. Alex Fitness et Léa Tech sont vos créateurs les plus rentables."
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
