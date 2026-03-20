import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences, GEMINI_FLASH } from "@/lib/ai-provider";
import type { CarouselSlideContent } from "@/types/instagram";

export const dynamic = "force-dynamic";

interface RefineSlideRequest {
  slide: CarouselSlideContent;
  feedback: string;
  language?: "en" | "fr";
  model?: string;
}

interface RefineSlideResponse {
  success: boolean;
  slide?: CarouselSlideContent;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<RefineSlideResponse>> {
  try {
    const body: RefineSlideRequest = await request.json();
    const { slide, feedback, language = "en", model } = body;

    if (!slide || typeof slide !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing required field: slide" },
        { status: 400 }
      );
    }
    if (!feedback?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: feedback" },
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
    const slideJson = JSON.stringify(slide, null, 2);

    const prompt = `You are an Instagram carousel content editor.

Here is the current slide JSON (${lang}):
${slideJson}

The user wants to refine it with this feedback:
"${feedback.trim()}"

Apply the feedback to the slide. Keep the same JSON structure.
Only change what the feedback asks for.
photoIndex must remain valid (keep the existing value unless the feedback explicitly asks to change it).

Reply ONLY with the updated slide JSON (no markdown fences, no extra text):
{
  "title": "...",
  "subtitle": "...",
  "body": "...",
  "photoIndex": 0
}`;

    const rawText = await generateText(prompt, { model: model ?? GEMINI_FLASH });
    const parsed = JSON.parse(stripJsonFences(rawText)) as CarouselSlideContent;

    return NextResponse.json({ success: true, slide: parsed });
  } catch (error) {
    console.error("Error in /api/carousel/refine-slide:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'affinage de la slide" },
      { status: 500 }
    );
  }
}
