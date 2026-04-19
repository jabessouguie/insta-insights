import { NextResponse } from "next/server";
import { generateText, isAIConfigured, GEMINI_FLASH } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

interface ReplySuggestRequest {
  collabName: string;
  sentEmailBody: string;
  prospectReply: string;
  language?: "fr" | "en";
  model?: string;
}

interface ReplySuggestResponse {
  success: boolean;
  replies?: string[];
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<ReplySuggestResponse>> {
  try {
    const body: ReplySuggestRequest = await request.json();
    const { collabName, sentEmailBody, prospectReply, language = "fr", model } = body;

    if (!collabName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: collabName" },
        { status: 400 }
      );
    }
    if (!sentEmailBody?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: sentEmailBody" },
        { status: 400 }
      );
    }
    if (!prospectReply?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: prospectReply" },
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

    const prompt = `You are an expert in influencer-brand collaboration communication.

Context:
- Collaboration prospect: ${collabName.trim()}
- Email you sent: """
${sentEmailBody.trim()}
"""
- Their reply: """
${prospectReply.trim()}
"""

Generate exactly 3 short follow-up reply options in ${lang}, each with a different tone:
1. Professional and formal
2. Warm and friendly
3. Brief and direct

Rules:
- Each reply must be 2-5 sentences max
- Stay consistent with the collab context
- Address their reply specifically
- Do NOT include subject lines
- Reply ONLY with a JSON array of 3 strings, no markdown fences, no keys:
["reply 1", "reply 2", "reply 3"]`;

    const rawText = await generateText(prompt, { model: model || GEMINI_FLASH, maxTokens: 600 });
    // Strip potential JSON fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const replies = JSON.parse(cleaned) as string[];

    if (!Array.isArray(replies) || replies.length === 0) {
      throw new Error("Invalid response format from AI");
    }

    return NextResponse.json({ success: true, replies });
  } catch (error) {
    console.error("Error in /api/collabs/reply-suggest:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération de la réponse" },
      { status: 500 }
    );
  }
}
