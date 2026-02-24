/**
 * Gemini AI Integration
 * Uses Google's Gemini API to generate Instagram analytics insights.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { InsightsApiRequest, InsightsResponse, AIInsight } from "@/types/instagram";

const MODEL_NAME = "gemini-1.5-flash";

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key);
}

function buildCreatorPrompt(req: InsightsApiRequest): string {
  const { metrics, profile } = req;

  return `Tu es un expert en stratégie Instagram et en marketing digital.

Analyse les données Instagram suivantes d'un créateur de contenu et génère des insights actionnables en français.

### Profil
- Compte : @${profile.username || "inconnu"}
- Abonnés : ${(profile.followerCount ?? 0).toLocaleString("fr-FR")}
- Abonnements : ${(profile.followerCount ?? 0).toLocaleString("fr-FR")}
- Posts : ${profile.postCount ?? 0}

### Métriques clés
- Taux d'engagement : ${metrics.engagementRate?.toFixed(2) ?? "N/A"}%
- Moyenne de likes/post : ${Math.round(metrics.avgLikesPerPost ?? 0)}
- Moyenne de commentaires/post : ${Math.round(metrics.avgCommentsPerPost ?? 0)}
- Abonnés inactifs : ${metrics.inactiveFollowersPercentage?.toFixed(1) ?? "N/A"}%
- Abonnements non réciproques : ${metrics.nonReciprocalFollowsCount ?? 0}

### Performance par type de contenu
${
  metrics.contentTypePerformance
    ?.map((c) => `- ${c.type}: ${c.count} posts, engagement moyen ${c.avgEngagement?.toFixed(0)}`)
    .join("\n") ?? "N/A"
}

### Meilleurs moments de publication
${
  metrics.bestPostingDays
    ?.slice(0, 3)
    .map((d) => `- ${d.day}: engagement moyen ${d.avgEngagement?.toFixed(0)}`)
    .join("\n") ?? "N/A"
}

Génère exactement 5 insights JSON dans ce format (sans markdown, juste le JSON):
{
  "summary": "Résumé en 2 phrases",
  "insights": [
    {
      "id": "1",
      "type": "success|warning|tip|alert",
      "category": "engagement|growth|content|audience|timing|strategy",
      "title": "Titre court (<60 chars)",
      "description": "Description détaillée (2-3 phrases)",
      "metric": "valeur clé (ex: 4.2%)",
      "recommendation": "Action concrète à prendre",
      "priority": "high|medium|low"
    }
  ]
}`;
}

function buildAgencyPrompt(req: InsightsApiRequest): string {
  const { profile, creatorProfile } = req;

  return `Tu es un consultant senior en marketing d'influence.

Analyse le profil de ce créateur de contenu pour une agence et génère un rapport professionnel en français.

### Créateur
- Compte : @${profile.username || "inconnu"}
- Abonnés : ${(profile.followerCount ?? 0).toLocaleString("fr-FR")}
- Catégorie : ${creatorProfile?.category ?? "N/A"}
- Score global : ${creatorProfile?.overallScore ?? "N/A"}/100
- Score qualité audience : ${creatorProfile?.audienceQualityScore ?? "N/A"}/100
- Taux d'engagement : ${req.metrics.engagementRate?.toFixed(2) ?? "N/A"}%

Génère exactement 5 insights JSON pour l'agence (sans markdown, juste le JSON):
{
  "summary": "Résumé professionnel en 2 phrases pour l'agence",
  "insights": [
    {
      "id": "1",
      "type": "success|warning|tip|alert",
      "category": "engagement|growth|content|audience|timing|strategy",
      "title": "Titre court (<60 chars)",
      "description": "Description avec contexte business (2-3 phrases)",
      "metric": "valeur clé",
      "recommendation": "Recommandation stratégique pour l'agence",
      "priority": "high|medium|low"
    }
  ]
}`;
}

export async function generateInsights(req: InsightsApiRequest): Promise<InsightsResponse> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = req.mode === "agency" ? buildAgencyPrompt(req) : buildCreatorPrompt(req);

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  let parsed: { summary: string; insights: AIInsight[] };
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Fallback: return a generic response
    parsed = {
      summary:
        "Analyse en cours. Les données sont insuffisantes pour générer des insights complets.",
      insights: [
        {
          id: "1",
          type: "tip",
          category: "strategy",
          title: "Continuez à publier régulièrement",
          description:
            "La régularité est la clé du succès sur Instagram. Publiez au minimum 3 fois par semaine.",
          recommendation: "Créez un calendrier éditorial et respectez-le.",
          priority: "high",
        },
      ],
    };
  }

  return {
    insights: parsed.insights || [],
    summary: parsed.summary || "",
    generatedAt: new Date(),
    model: MODEL_NAME,
  };
}
