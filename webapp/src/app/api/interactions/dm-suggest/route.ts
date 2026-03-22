import { NextResponse } from "next/server";
import { generateText, isAIConfigured } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

interface DMSuggestRequest {
  username: string;
  bio?: string | null;
  feedback?: string | null;
  previousDm?: string | null;
  language?: "fr" | "en";
}

interface DMSuggestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<DMSuggestResponse>> {
  try {
    const body: DMSuggestRequest = await request.json();
    const { username, bio, feedback, previousDm, language = "en" } = body;

    if (!username) {
      return NextResponse.json({ success: false, error: "Missing username" }, { status: 400 });
    }

    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "No AI provider configured" },
        { status: 501 }
      );
    }

    const langInstruction =
      language === "fr" ? "Write the message in French." : "Write the message in English.";

    // Feedback refinement mode
    const prompt =
      feedback?.trim() && previousDm?.trim()
        ? `You wrote this Instagram DM to @${username}:
"${previousDm.trim()}"

The user gave this feedback: "${feedback.trim()}"

Rewrite the DM taking the feedback into account. Keep it short, natural, and genuine.
Rules:
- Do NOT include characters like "—"
- Emojis and "." are ok
- Max 2 sentences
- ${langInstruction}
- Return ONLY the new message text, no explanation, no quotes around it`
        : bio?.trim()
          ? `I really like this instagram content creator and would love to connect and support.
Help me write a short, appropriate, human, natural, personal and catchy 1st instagram DM
expressing that idea.
Here is their bio: "${bio.trim()}"

Rules:
- Do NOT include characters like "—"
- Emojis and "." are ok
- Max 2 sentences
- Must feel genuine and personal
- ${langInstruction}
- Return ONLY the message text, no explanation, no quotes around it`
          : `I really like this instagram content creator @${username} and would love to connect and support.
Help me write a short, appropriate, human, natural, personal and catchy 1st instagram DM.

Rules:
- Do NOT include characters like "—"
- Emojis and "." are ok
- Max 2 sentences
- Must feel genuine and personal
- Address them as a fellow creator
- ${langInstruction}
- Return ONLY the message text, no explanation, no quotes around it`;

    const message = await generateText(prompt, { maxTokens: 200 });
    return NextResponse.json({ success: true, message: message.trim() });
  } catch (error) {
    console.error("Error in /api/interactions/dm-suggest:", error);
    return NextResponse.json({ success: false, error: "Failed to generate DM" }, { status: 500 });
  }
}
