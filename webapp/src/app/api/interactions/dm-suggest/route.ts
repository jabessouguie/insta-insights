import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DMSuggestRequest } from "@/types/instagram";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function textStream(text: string): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}

export async function POST(request: Request): Promise<Response> {
  const body: DMSuggestRequest & { feedback?: string } = await request.json();
  const { username, profileUrl, creatorProfile, feedback } = body;

  if (!username || !profileUrl) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing username or profileUrl" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = `Hey @${username}! I came across your profile and really loved your content — we seem to share the same vibe. Would love to follow and support each other! What kind of content are you working on lately? 🙌`;
    return textStream(fallback);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

  const prompt = `You are an Instagram content creator called @${creatorProfile.username ?? "me"} with ${creatorProfile.followerCount?.toLocaleString("en-US") ?? "several thousand"} followers.

You want to send a direct message (DM) to @${username} (profile: ${profileUrl}).
You follow this account but they don't follow you back yet.

Write a short, authentic, warm and personalised DM in English (2-3 sentences max). The DM must:
- Sound 100% human, not robotic
- Naturally suggest that you both follow and support each other (mutual follow / community support vibe)
- Feel genuine — reference their username (${username}) or their likely niche to make it personal
- Not be pushy or transactional
- End with an open question to start a conversation

Reply with ONLY the DM text, no quotes, no explanations.${feedback ? `\n\nUser feedback on previous version: ${feedback}` : ""}`;

  try {
    const stream = await model.generateContentStream(prompt);

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error in /api/interactions/dm-suggest:", error);
    return new Response(JSON.stringify({ error: "Failed to generate DM suggestion" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
