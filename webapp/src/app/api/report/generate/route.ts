import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ReportGenerateResponse, InstagramAnalytics } from "@/types/instagram";

export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash";

function buildReportPrompt(data: InstagramAnalytics): string {
  const { profile, metrics, audienceInsights, contentInteractions, reachInsights, posts } = data;

  const topCaptions = posts
    .filter((p) => p.caption.trim().length > 0)
    .slice(0, 10)
    .map(
      (p, i) =>
        `${i + 1}. [${p.mediaType}] "${p.caption.substring(0, 120)}" — ${p.likes} likes, ${p.comments} comments`
    )
    .join("\n");

  return `Tu es un analyste senior en marketing des réseaux sociaux. Génère un rapport exécutif mensuel professionnel basé sur les données Instagram suivantes.

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

## Tâche

Génère un rapport exécutif concis et actionnable. Adopte un ton professionnel et direct. Utilise des données réelles tirées des métriques ci-dessus.

## Format JSON STRICT (aucun markdown)

{
  "period": "string (ex: Février 2026)",
  "executiveSummary": "string (2-3 phrases synthétisant le mois)",
  "keyWins": ["string", "string", "string"],
  "keyAlerts": ["string", "string"],
  "contentPerformance": "string (1 paragraphe sur les formats et contenus qui ont performé)",
  "audienceTrends": "string (1 paragraphe sur l'évolution de l'audience)",
  "nextMonthRecommendations": ["string", "string", "string"],
  "generatedAt": "string (date ISO)"
}`;
}

export async function POST(request: Request): Promise<NextResponse<ReportGenerateResponse>> {
  try {
    const data: InstagramAnalytics = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY not configured" },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = buildReportPrompt(data);

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const report = JSON.parse(jsonText);
    report.generatedAt = report.generatedAt ?? new Date().toISOString();

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error in /api/report/generate:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du rapport" },
      { status: 500 }
    );
  }
}
