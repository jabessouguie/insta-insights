import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences } from "@/lib/ai-provider";
import { InstagramGraphAPI } from "@/lib/instagram-graph-api";
import type {
  AudienceSegmentsResponse,
  AudiencePersona,
  BrandVoiceAudit,
  AudienceInsights,
  InstagramMetrics,
  InstagramProfile,
} from "@/types/instagram";

export const dynamic = "force-dynamic";

interface SegmentsRequest {
  profile: Partial<InstagramProfile>;
  metrics: Partial<InstagramMetrics>;
  audienceInsights?: Partial<AudienceInsights>;
  captions: string[];
  model?: string;
}

function buildPrompt(req: SegmentsRequest, comments: string[]): string {
  const { profile, metrics, audienceInsights, captions } = req;

  return `Tu es un expert en psychologie des audiences et en marketing digital Instagram.

Analyse les données suivantes d'un créateur de contenu et génère 4 personas psychographiques distincts basés sur le modèle Big Five (OCEAN).

## Profil du créateur
- Abonnés : ${profile.followerCount ?? "N/A"}
- Bio : "${profile.bio ?? "N/A"}"
- Taux d'engagement : ${metrics.engagementRate ?? "N/A"}%

## Données d'audience
${
  audienceInsights
    ? `
- Tranches d'âge : ${JSON.stringify(audienceInsights.ageGroups ?? {})}
- Genre : ${JSON.stringify(audienceInsights.genderSplit ?? {})}
- Top pays : ${JSON.stringify(audienceInsights.topCountries ?? {})}
- Top villes : ${JSON.stringify(audienceInsights.topCities ?? {})}
`
    : "Non disponible"
}

## 20 dernières légendes du créateur
${captions
  .slice(0, 20)
  .map((c, i) => `${i + 1}. "${c.substring(0, 150)}"`)
  .join("\n")}

${
  comments.length > 0
    ? `## Commentaires réels de l'audience (${comments.length} commentaires)
${comments
  .slice(0, 100)
  .map((c, i) => `${i + 1}. "${c.substring(0, 100)}"`)
  .join("\n")}`
    : ""
}

## Tâche

### Partie 1 : Personas psychographiques
Génère exactement 4 personas distincts. Pour chaque persona :
- Un nom évocateur et mémorable (ex: "L'Explorateur Ambitieux", "La Curatrice Sensible")
- Un emoji représentatif
- Une description de 2-3 phrases
- La part estimée de l'audience (les 4 totalisent 100%)
- Scores Big Five de 0 à 100 (basés sur les comportements observables dans les commentaires et l'engagement)
- 3-4 motivations principales
- 3-4 piliers de contenu recommandés pour engager ce persona

### Partie 2 : Audit de ton de voix
Analyse les légendes du créateur :
- Score de cohérence stylistique (0-100)
- Ton dominant en 3-5 mots
- Longueur moyenne estimée des légendes (courte <50 mots, moyenne 50-150, longue >150)
- Taux d'utilisation des CTA estimé (0-100)
- 3 suggestions d'amélioration concrètes

## Format de réponse STRICT (JSON valide uniquement, pas de markdown)

{
  "personas": [
    {
      "name": "string",
      "emoji": "string",
      "description": "string",
      "sharePercent": number,
      "bigFive": {
        "openness": number,
        "conscientiousness": number,
        "extraversion": number,
        "agreeableness": number,
        "neuroticism": number
      },
      "motivations": ["string"],
      "contentPillars": ["string"]
    }
  ],
  "brandVoice": {
    "consistencyScore": number,
    "dominantTone": "string",
    "avgCaptionLength": number,
    "ctaUsageRate": number,
    "suggestions": ["string", "string", "string"]
  }
}`;
}

export async function POST(request: Request): Promise<NextResponse<AudienceSegmentsResponse>> {
  try {
    const body: SegmentsRequest = await request.json();

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured", dataSource: "export_inference" },
        { status: 503 }
      );
    }

    // Fetch real comments if Graph API token provided
    let comments: string[] = [];
    let commentCount = 0;
    const token = request.headers.get("X-Instagram-Token");
    const accountId = request.headers.get("X-Instagram-Account-Id");

    if (token && accountId) {
      try {
        const api = new InstagramGraphAPI(token, accountId);
        const rawMedia = await api.getMedia(50);
        const rawComments = await api.getAllComments(rawMedia);
        comments = rawComments.map((c) => c.text).filter(Boolean);
        commentCount = comments.length;
      } catch (err) {
        console.error("Could not fetch comments from Graph API:", err);
      }
    }

    const prompt = buildPrompt(body, comments);
    const raw = await generateText(prompt, { model: body.model });
    const parsed = JSON.parse(stripJsonFences(raw)) as {
      personas: AudiencePersona[];
      brandVoice: BrandVoiceAudit;
    };

    return NextResponse.json({
      success: true,
      personas: parsed.personas,
      brandVoice: parsed.brandVoice,
      commentCount,
      dataSource: commentCount > 0 ? "graph_api" : "export_inference",
    });
  } catch (error) {
    console.error("Error in /api/audience/segments:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'analyse", dataSource: "export_inference" },
      { status: 500 }
    );
  }
}
