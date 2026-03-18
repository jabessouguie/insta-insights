import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export interface HashtagSuggestRequest {
  topHashtags: string[];
  niche?: string;
  language?: "fr" | "en";
}

export interface HashtagSuggestResponse {
  success: boolean;
  data?: { suggestions: string[]; rationale: string };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<HashtagSuggestResponse>> {
  try {
    const body: HashtagSuggestRequest = await request.json();
    const { topHashtags, niche = "", language = "fr" } = body;

    if (!topHashtags?.length) {
      return NextResponse.json({ success: false, error: "No hashtags provided" }, { status: 400 });
    }

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 501 }
      );
    }

    const isEn = language === "en";
    const tagList = topHashtags.slice(0, 20).join(", ");
    const nicheHint = niche
      ? isEn
        ? `\nCreator niche: ${niche}`
        : `\nNiche du créateur : ${niche}`
      : "";

    const prompt = isEn
      ? `You are a hashtag strategy expert for Instagram creators.

A creator uses these top hashtags: ${tagList}${nicheHint}

Suggest 15 additional hashtags they should test to improve reach and discoverability.
Mix:
- 5 niche-specific hashtags (medium competition, 100K–1M posts)
- 5 community/emerging hashtags (under 500K posts for better visibility)
- 5 broad interest hashtags (over 1M posts for reach)

Rules:
- Only return real, existing Instagram hashtags
- Include the # prefix
- No duplicates with the list above

Respond ONLY with this JSON (no markdown):
{
  "suggestions": ["#hashtag1", "#hashtag2"],
  "rationale": "2-sentence explanation of the hashtag mix strategy"
}`
      : `Tu es un expert en stratégie de hashtags pour créateurs Instagram.

Un créateur utilise ces hashtags principaux : ${tagList}${nicheHint}

Suggère 15 hashtags supplémentaires à tester pour améliorer la portée et la découvrabilité.
Mélange :
- 5 hashtags de niche (concurrence moyenne, 100K–1M publications)
- 5 hashtags communauté/émergents (moins de 500K publications pour meilleure visibilité)
- 5 hashtags larges (plus d'1M publications pour la portée)

Règles :
- Uniquement des hashtags Instagram réels et existants
- Inclure le # devant chaque hashtag
- Pas de doublons avec la liste ci-dessus

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "suggestions": ["#hashtag1", "#hashtag2"],
  "rationale": "Explication en 2 phrases de la stratégie de mix de hashtags"
}`;

    const raw = await generateText(prompt);
    const parsed = JSON.parse(stripJsonFences(raw)) as {
      suggestions: string[];
      rationale: string;
    };

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Error in /api/hashtags/suggest:", error);
    return NextResponse.json(
      { success: false, error: "Failed to suggest hashtags" },
      { status: 500 }
    );
  }
}
