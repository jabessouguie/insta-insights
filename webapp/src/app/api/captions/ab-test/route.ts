import { NextRequest, NextResponse } from "next/server";
import { generateText, stripJsonFences } from "@/lib/ai-provider";

export interface AbTestRequest {
  idea: string;
  language?: "fr" | "en";
  /** Optional context: creator niche, tone, audience */
  context?: string;
  /** Top performing hashtags from the creator's own data — injected into the prompt */
  topHashtags?: string[];
  /** Captions from the best performing Reels */
  topReelsCaptions?: string[];
  /** Captions from the worst performing Reels */
  worstReelsCaptions?: string[];
  /** AI model preference */
  model?: string;
  /** The specific variable to isolate in the A/B test */
  testVariable?: "hook" | "body" | "auto";
}

export interface CaptionVariant {
  hook: string;
  body: string;
}

export interface AbTestResponse {
  success: boolean;
  variantA?: CaptionVariant;
  variantB?: CaptionVariant;
  error?: string;
}

const MOCK_RESPONSE: AbTestResponse = {
  success: true,
  variantA: {
    hook: "✨ Nouvelle routine matinale adoptée — 5h du matin",
    body: "Café chaud, carnet ouvert. Le secret ? Commencer avant que le monde ne se réveille. Quels sont vos rituels du matin ? 👇\n\n#productivité #matinale #routine",
  },
  variantB: {
    hook: "🌅 Le silence du matin est mon superpouvoir.",
    body: "3 habitudes qui ont transformé mes journées → 1) Se lever à 5h 2) Pas de réseaux avant 8h 3) Écrire 10 min. Vous en adoptez une ?\n\n#productivity #morningroutine #habitudes",
  },
};

export async function POST(req: NextRequest): Promise<NextResponse<AbTestResponse>> {
  const body = (await req.json()) as AbTestRequest;
  const {
    idea,
    language = "fr",
    context = "",
    topHashtags,
    topReelsCaptions,
    worstReelsCaptions,
    model,
    testVariable = "auto",
  } = body;

  if (!idea?.trim()) {
    return NextResponse.json({ success: false, error: "idea is required" }, { status: 400 });
  }

  const lang = language === "en" ? "English" : "French";
  const contextBlock = context ? `\nCreator context: ${context}` : "";
  const hashtagsBlock =
    topHashtags && topHashtags.length > 0
      ? `\nTop performing hashtags from your data (prioritize these): ${topHashtags.slice(0, 10).join(", ")}`
      : "";
  const bestReelsBlock =
    topReelsCaptions && topReelsCaptions.length > 0
      ? `\nCaptions from your BEST performing Reels (emulate this style/structure):\n- ${topReelsCaptions.join("\n- ")}`
      : "";
  const worstReelsBlock =
    worstReelsCaptions && worstReelsCaptions.length > 0
      ? `\nCaptions from your WORST performing Reels (AVOID this style/structure):\n- ${worstReelsCaptions.join("\n- ")}`
      : "";

  const testingRule =
    testVariable === "hook"
      ? "- A/B TEST RULE: You MUST write exactly the same 'body' for both variants, but provide two COMPLETELY DIFFERENT 'hooks'. One should be a question, the other a bold statement."
      : testVariable === "body"
        ? "- A/B TEST RULE: You MUST write exactly the same 'hook' for both variants, but provide two COMPLETELY DIFFERENT 'bodies' (e.g. one short and tactical, one long and emotional)."
        : "- THE GOLDEN RULE OF A/B TESTING: Change ONLY ONE major variable at a time between Variant A and Variant B (e.g., test a Question hook vs. a Statement hook, OR test a short caption vs. a long storytelling caption, but keep the core message identical).";

  const prompt = `You are an expert Instagram copywriter. Generate exactly 2 caption variants (A and B) for the same post idea.

Post idea: "${idea}"${contextBlock}${hashtagsBlock}${bestReelsBlock}${worstReelsBlock}
Language: ${lang}

Rules:
${testingRule}
- Analyze the BEST and WORST performing captions provided above. Adapt the new captions to heavily lean towards the style of the BEST performing captions, and strictly avoid the mistakes of the WORST performing captions.
- Each caption MUST clearly feature a strong hook (first line) and a body.
- Each caption: 80-200 words, include a MAXIMUM of 5 relevant hashtags, and end with a call-to-action.
- Output ONLY valid JSON, no markdown fences

JSON format:
{
  "variantA": { "hook": "The first impactful sentence to stop the scroll", "body": "The rest of the caption including max 5 hashtags and a CTA" },
  "variantB": { "hook": "The alternative hook", "body": "The alternative body" }
}`;

  try {
    const raw = await generateText(prompt, { maxTokens: 1024, model });
    const parsed = JSON.parse(stripJsonFences(raw)) as {
      variantA: CaptionVariant;
      variantB: CaptionVariant;
    };

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
