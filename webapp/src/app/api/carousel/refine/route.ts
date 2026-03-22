import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences, GEMINI_FLASH } from "@/lib/ai-provider";
import type { CarouselSlideContent, CarouselGenerateResponse } from "@/types/instagram";

export const dynamic = "force-dynamic";

interface CarouselRefineRequest {
  slides: CarouselSlideContent[];
  instagramDescription: string;
  hashtags: string[];
  feedback: string;
  language?: "en" | "fr";
  model?: string;
}

export async function POST(request: Request): Promise<NextResponse<CarouselGenerateResponse>> {
  try {
    const body: CarouselRefineRequest = await request.json();
    const { slides, instagramDescription, hashtags, feedback, language = "en", model } = body;

    if (!slides?.length || !feedback?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: slides, feedback" },
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
    const currentJson = JSON.stringify({ slides, instagramDescription, hashtags }, null, 2);

    const prompt = `You are an Instagram carousel content editor.

Here is the current carousel JSON (${lang}):
${currentJson}

The user wants to refine it with this feedback:
"${feedback.trim()}"

Apply the feedback to the carousel. Keep the same JSON structure and number of slides.
Only change what the feedback asks for.
photoIndex values must remain valid (keep existing values unless the feedback explicitly asks to change them).
Text length rules (always enforce): title max 5 words, subtitle max 8 words, body max 18 words.

Reply ONLY with the updated JSON (no markdown fences, no extra text):
{
  "slides": [...],
  "instagramDescription": "...",
  "hashtags": [...]
}`;

    const rawText = await generateText(prompt, { model: model ?? GEMINI_FLASH });
    const parsed = JSON.parse(stripJsonFences(rawText)) as {
      slides: CarouselSlideContent[];
      instagramDescription: string;
      hashtags: string[];
    };

    return NextResponse.json({
      success: true,
      slides: parsed.slides,
      instagramDescription: parsed.instagramDescription,
      hashtags: parsed.hashtags,
    });
  } catch (error) {
    console.error("Error in /api/carousel/refine:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'affinage du carrousel" },
      { status: 500 }
    );
  }
}
