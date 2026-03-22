import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences, GEMINI_FLASH } from "@/lib/ai-provider";
import type { UGCGenerateRequest, UGCGenerateResponse, UGCScript } from "@/types/instagram";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse<UGCGenerateResponse>> {
  try {
    const body: UGCGenerateRequest = await request.json();
    const { brandName, constraints, language = "fr" } = body;

    if (!brandName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: brandName" },
        { status: 400 }
      );
    }

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 501 }
      );
    }

    const lang = language === "fr" ? "French" : "English";
    const constraintsBlock = constraints?.trim()
      ? `\nCreator ideas and constraints:\n"${constraints.trim()}"`
      : "";

    const prompt = `You are a UGC (User-Generated Content) script expert for Instagram.

Brand: "${brandName.trim()}"${constraintsBlock}

Your task:
1. Choose the single best Instagram format for UGC content promoting this brand: "carousel", "reels", or "stories".
2. Generate exactly 5 posts for that format (5 slides for carousel, 5 scenes for reels, 5 story frames for stories).

Rules:
- Write all content in ${lang}
- Be authentic, creator-native — not corporate
- Each post must feel like genuine UGC, not an ad
- Focus on storytelling and value for the audience

Reply ONLY with valid JSON (no markdown fences, no extra text):
{
  "format": "carousel" | "reels" | "stories",
  "formatReason": "Brief explanation of why this format works best for this brand",
  "posts": [
    {
      "index": 1,
      "title": "Slide/Scene/Frame title",
      "script": "Caption text or voiceover script",
      "visualDescription": "What appears on screen",
      "cta": "Optional call-to-action (omit if not relevant)"
    }
  ]
}`;

    const rawText = await generateText(prompt, { model: GEMINI_FLASH });
    const parsed = JSON.parse(stripJsonFences(rawText)) as UGCScript;

    return NextResponse.json({ success: true, ugc: parsed });
  } catch (error) {
    console.error("Error in /api/ugc/generate:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du contenu UGC" },
      { status: 500 }
    );
  }
}
