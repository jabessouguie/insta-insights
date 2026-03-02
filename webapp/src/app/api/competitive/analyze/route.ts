import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  InstagramProfile,
  InstagramMetrics,
  InstagramPost,
  CompetitiveAnalysisResponse,
  CompetitiveAnalysis,
} from "@/types/instagram";

export const dynamic = "force-dynamic";

interface AnalyzeRequest {
  profile: InstagramProfile;
  metrics: InstagramMetrics;
  posts: InstagramPost[];
  niche: string;
  competitors?: string[];
}

export async function POST(request: Request): Promise<NextResponse<CompetitiveAnalysisResponse>> {
  try {
    const body: AnalyzeRequest = await request.json();
    const { profile, metrics, posts, niche, competitors } = body;

    if (!niche?.trim()) {
      return NextResponse.json({ success: false, error: "Niche is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const captions = posts
      .filter((p) => p.caption.trim().length > 0)
      .slice(0, 30)
      .map(
        (p, i) =>
          `${i + 1}. [${p.mediaType}] ${new Date(p.timestamp).toLocaleDateString("fr-FR")} — ER: ${p.reach > 0 ? Math.round(((p.likes + p.comments) / p.reach) * 100) : 0}% — "${p.caption.substring(0, 150)}"`
      )
      .join("\n");

    const contentMix = metrics.contentTypePerformance
      .map((c) => `${c.type}: ${c.count} posts, ER moy ${c.engagementRate.toFixed(1)}%`)
      .join(", ");

    const competitorStr =
      competitors && competitors.length > 0
        ? `Comptes de référence mentionnés : ${competitors.join(", ")}`
        : "";

    const prompt = `Tu es un stratège Instagram expert en intelligence compétitive pour la niche "${niche}".

## Données du créateur
- Compte : @${profile.username} — ${profile.followerCount.toLocaleString()} abonnés
- Taux d'engagement : ${metrics.engagementRate.toFixed(2)}%
- Mix de contenu : ${contentMix}
- Fréquence de publication : ${posts.length} posts analysés
${competitorStr}

## Publications récentes (avec performance)
${captions || "Aucune caption disponible"}

## Ta mission
Analyse le positionnement de ce créateur dans la niche "${niche}" et identifie les opportunités stratégiques.

Réponds en JSON strict :
{
  "positioning": "paragraphe de 2-3 phrases sur le positionnement actuel",
  "strengths": ["force1", "force2", "force3"],
  "gaps": [
    { "category": "nom de la catégorie", "description": "lacune identifiée", "opportunity": "comment l'exploiter" }
  ],
  "contentFormats": ["format1", "format2", "format3", "format4"],
  "recommendations": ["reco1", "reco2", "reco3", "reco4", "reco5"],
  "generatedAt": "${new Date().toISOString()}"
}

Règles :
- strengths : 3 points forts réels basés sur les données
- gaps : 3-5 lacunes avec opportunité concrète
- contentFormats : 3-5 formats populaires dans "${niche}" que le créateur n'utilise pas ou sous-utilise
- recommendations : 5 actions stratégiques concrètes et prioritisées`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const raw = result.response.text();
    const parsed = JSON.parse(raw) as Partial<CompetitiveAnalysis>;

    const analysis: CompetitiveAnalysis = {
      positioning: parsed.positioning ?? "",
      strengths: parsed.strengths ?? [],
      gaps: parsed.gaps ?? [],
      contentFormats: parsed.contentFormats ?? [],
      recommendations: parsed.recommendations ?? [],
      generatedAt: parsed.generatedAt ?? new Date().toISOString(),
    };

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("Error in /api/competitive/analyze:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
