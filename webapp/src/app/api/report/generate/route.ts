import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences } from "@/lib/ai-provider";
import type { ReportGenerateResponse, InstagramAnalytics } from "@/types/instagram";

export const dynamic = "force-dynamic";

interface ReportGenerateRequest {
  data: InstagramAnalytics;
  periodType?: "weekly" | "monthly";
  model?: string;
  promptContext?: string;
}

function buildReportPrompt(
  data: InstagramAnalytics,
  periodType: "weekly" | "monthly" = "monthly",
  promptContext?: string
): string {
  const { profile, metrics, audienceInsights, contentInteractions, reachInsights, posts } = data;

  const isWeekly = periodType === "weekly";
  const periodLabel = isWeekly ? "hebdomadaire" : "mensuel";
  const nextKey = isWeekly ? "nextWeekRecommendations" : "nextMonthRecommendations";
  const periodExample = isWeekly ? "ex: Semaine du 10 mars 2026" : "ex: Février 2026";

  const topCaptions = posts
    .filter((p) => p.caption.trim().length > 0)
    .slice(0, isWeekly ? 5 : 10)
    .map(
      (p, i) =>
        `${i + 1}. [${p.mediaType}] "${p.caption.substring(0, 120)}" — ${p.likes} likes, ${p.comments} comments`
    )
    .join("\n");

  return `Tu es un analyste senior en marketing des réseaux sociaux. Génère un rapport exécutif ${periodLabel} professionnel basé sur les données Instagram suivantes.

## Données du compte
- Utilisateur : @${profile.username}
- Abonnés : ${profile.followerCount.toLocaleString("fr-FR")}
- Posts total : ${profile.postCount}
- Taux d'engagement : ${metrics.engagementRate}%
- Likes moyens/post : ${metrics.avgLikesPerPost}
- Commentaires moyens/post : ${metrics.avgCommentsPerPost}
- Portée moyenne/post : ${metrics.avgReachPerPost}

## Interactions contenu
${
  contentInteractions
    ? `
- Total interactions : ${contentInteractions.totalInteractions.toLocaleString("fr-FR")}
- Posts likes : ${contentInteractions.posts.likes} | comments : ${contentInteractions.posts.comments}
- Reels likes : ${contentInteractions.reels.likes} | comments : ${contentInteractions.reels.comments}
- Interactions non-abonnés : ${contentInteractions.nonFollowerInteractionPct}%
`
    : "Non disponible"
}

## Reach & Impressions
${
  reachInsights
    ? `
- Comptes touchés : ${reachInsights.accountsReached.toLocaleString("fr-FR")}
- Impressions : ${reachInsights.impressions.toLocaleString("fr-FR")}
- Visites profil : ${reachInsights.profileVisits.toLocaleString("fr-FR")}
`
    : "Non disponible"
}

## Audience
${
  audienceInsights
    ? `
- Tranche d'âge dominante : ${Object.entries(audienceInsights.ageGroups).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A"}
- Genre : ${audienceInsights.genderSplit.female}% F / ${audienceInsights.genderSplit.male}% H
- Top pays : ${Object.keys(audienceInsights.topCountries).slice(0, 3).join(", ")}
`
    : "Non disponible"
}

## Top contenus récents
${topCaptions}

## Meilleurs créneaux
- Jours : ${metrics.bestPostingDays
    .slice(0, 3)
    .map((d) => d.day)
    .join(", ")}
- Heures : ${metrics.bestPostingHours
    .slice(0, 3)
    .map((h) => `${h.hour}h`)
    .join(", ")}
${promptContext ? `\n## Contexte additionnel (Audience & Ton de voix)\n${promptContext}` : ""}

## Tâche

Génère un rapport exécutif ${periodLabel} concis et actionnable. Adopte un ton professionnel et direct. Utilise des données réelles tirées des métriques ci-dessus.${isWeekly ? "\nPour un rapport hebdomadaire, concentre-toi sur les tendances immédiates, les contenus de la semaine et les actions à prendre dès maintenant." : ""}


## Format JSON STRICT (aucun markdown)

{
  "period": "string (${periodExample})",
  "executiveSummary": "string (2-3 phrases synthétisant la période)",
  "keyWins": ["string", "string", "string"],
  "keyAlerts": ["string", "string"],
  "contentPerformance": "string (1 paragraphe sur les formats et contenus qui ont performé)",
  "audienceTrends": "string (1 paragraphe sur l'évolution de l'audience)",
  "${nextKey}": ["string", "string", "string"],
  "postPromptTemplates": [
    "Template caption 1 (max 60 mots, avec [SUJET] comme placeholder, basé sur le meilleur format)",
    "Template caption 2 — format différent (liste, question ou anecdote)",
    "Template caption 3 — adapté au deuxième meilleur format de contenu"
  ],
  "calendarSuggestions": [
    { "day": "Lundi", "time": "18h", "contentType": "Reel", "rationale": "Audience la plus active d'après les métriques" },
    { "day": "Jeudi", "time": "12h", "contentType": "Carrousel", "rationale": "Fort engagement historique les jeudis" },
    { "day": "Samedi", "time": "10h", "contentType": "Image", "rationale": "Audience disponible en début de week-end" }
  ],
  "generatedAt": "string (date ISO)"
}`;
}

export async function POST(request: Request): Promise<NextResponse<ReportGenerateResponse>> {
  try {
    const body: ReportGenerateRequest | InstagramAnalytics = await request.json();

    // Support both legacy format (raw InstagramAnalytics) and new {data, periodType, model}
    const isWrapped = "data" in body && body.data !== undefined;
    const data = isWrapped ? (body as ReportGenerateRequest).data : (body as InstagramAnalytics);
    const periodType = isWrapped
      ? ((body as ReportGenerateRequest).periodType ?? "monthly")
      : "monthly";
    const model = isWrapped ? (body as ReportGenerateRequest).model : undefined;
    const promptContext = isWrapped ? (body as ReportGenerateRequest).promptContext : undefined;

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 503 }
      );
    }

    const prompt = buildReportPrompt(data, periodType, promptContext);
    const raw = await generateText(prompt, { model });
    const report = JSON.parse(stripJsonFences(raw));
    report.generatedAt = report.generatedAt ?? new Date().toISOString();
    // Normalise: weekly reports use nextWeekRecommendations, store as nextMonthRecommendations
    if (
      periodType === "weekly" &&
      report.nextWeekRecommendations &&
      !report.nextMonthRecommendations
    ) {
      report.nextMonthRecommendations = report.nextWeekRecommendations;
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error in /api/report/generate:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du rapport" },
      { status: 500 }
    );
  }
}
