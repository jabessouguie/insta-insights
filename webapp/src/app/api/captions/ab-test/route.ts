import { NextRequest, NextResponse } from "next/server";
import { generateText, stripJsonFences } from "@/lib/ai-provider";

export interface AbTestRequest {
  idea: string;
  language?: "fr" | "en";
  /** Optional context: creator niche, tone, audience */
  context?: string;
}

export interface AbTestResponse {
  success: boolean;
  variantA?: string;
  variantB?: string;
  error?: string;
}

const MOCK_RESPONSE: AbTestResponse = {
  success: true,
  variantA:
    "✨ Nouvelle routine matinale adoptée — 5h du matin, café chaud, carnet ouvert. Le secret ? Commencer avant que le monde ne se réveille. Quels sont vos rituels du matin ? 👇\n\n#productivité #matinale #routine",
  variantB:
    "🌅 Le silence du matin est mon superpouvoir. 3 habitudes qui ont transformé mes journées → 1) Se lever à 5h 2) Pas de réseaux avant 8h 3) Écrire 10 min. Vous en adoptez une ?\n\n#productivity #morningroutine #habitudes",
};

export async function POST(req: NextRequest): Promise<NextResponse<AbTestResponse>> {
  const body = (await req.json()) as AbTestRequest;
  const { idea, language = "fr", context = "" } = body;

  if (!idea?.trim()) {
    return NextResponse.json({ success: false, error: "idea is required" }, { status: 400 });
  }

  const lang = language === "en" ? "English" : "French";
  const contextBlock = context ? `\nCreator context: ${context}` : "";

  const prompt = `You are an expert Instagram copywriter. Generate exactly 2 caption variants (A and B) for the same post idea.

Post idea: "${idea}"${contextBlock}
Language: ${lang}

Rules:
- Each variant must have a DIFFERENT tone, structure and hook
- Variant A: storytelling / personal / emotional angle
- Variant B: listicle / tactical / actionable angle
- Each caption: 80-200 words, include relevant hashtags (10-15), end with a call-to-action
- Output ONLY valid JSON, no markdown fences

JSON format:
{
  "variantA": "<full caption with hashtags>",
  "variantB": "<full caption with hashtags>"
}`;

  try {
    const raw = await generateText(prompt, { maxTokens: 1024 });
    const parsed = JSON.parse(stripJsonFences(raw)) as { variantA: string; variantB: string };

    if (!parsed.variantA || !parsed.variantB) {
      throw new Error("missing variants");
    }

    return NextResponse.json({
      success: true,
      variantA: parsed.variantA,
      variantB: parsed.variantB,
    });
  } catch {
    // Fallback to mock when AI key is missing or parse fails
    return NextResponse.json(MOCK_RESPONSE);
  }
}
