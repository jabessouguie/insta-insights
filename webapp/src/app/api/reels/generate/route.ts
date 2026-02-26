import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ReelGenerateRequest, ReelGenerateResponse } from "@/types/instagram";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request): Promise<NextResponse<ReelGenerateResponse>> {
  try {
    const body: ReelGenerateRequest = await request.json();
    const {
      prompt,
      durationSeconds = 8,
      model = "veo-3.0-generate-001",
      audience,
      brandColors,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Missing required field: prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY not configured" },
        { status: 503 }
      );
    }

    // Build an enriched prompt with audience and brand context
    const parts: string[] = [prompt];
    if (audience) {
      const genderLabel =
        audience.gender === "female" ? "women" : audience.gender === "male" ? "men" : "everyone";
      const audienceDesc = [genderLabel, audience.region, audience.interests]
        .filter(Boolean)
        .join(", ");
      parts.push(`Target audience: ${audienceDesc}.`);
    }
    if (brandColors) {
      parts.push(
        `Brand colors: primary ${brandColors.primary}, accent ${brandColors.accent}. Use these as dominant tones.`
      );
    }
    const enrichedPrompt = parts.join("\n");

    const ai = new GoogleGenAI({ apiKey });

    type GenerateVideosParams = Parameters<typeof ai.models.generateVideos>[0];

    // Note: numberOfVideos and videoBytes (reference clips) are not supported by Veo 3
    // and trigger an `encoding` error from the API. Keep config minimal.
    const config: GenerateVideosParams = {
      model,
      prompt: enrichedPrompt,
      config: {
        aspectRatio: "9:16",
        durationSeconds: Math.min(Math.max(durationSeconds, 5), 8),
      },
    };

    // Start video generation operation
    let op = await ai.models.generateVideos(config);

    // Poll until done or timeout (~110s)
    const deadline = Date.now() + 110_000;
    while (!op.done && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      op = await ai.operations.getVideosOperation({ operation: op });
    }

    if (!op.done) {
      return NextResponse.json({ success: false, error: "Generation timed out" }, { status: 504 });
    }

    const generatedVideo = op.response?.generatedVideos?.[0]?.video;
    if (!generatedVideo) {
      // Log full response for debugging
      console.error("Veo response:", JSON.stringify(op.response, null, 2));
      return NextResponse.json(
        { success: false, error: "No video data returned" },
        { status: 500 }
      );
    }

    const mimeType = generatedVideo.mimeType ?? "video/mp4";

    // Case 1: inline bytes
    if (generatedVideo.videoBytes) {
      return NextResponse.json({
        success: true,
        video: `data:${mimeType};base64,${generatedVideo.videoBytes}`,
      });
    }

    // Case 2: video returned as a downloadable URI (Veo 3 default)
    const videoUri = (generatedVideo as Record<string, unknown>).uri as string | undefined;
    if (videoUri) {
      // If it's a public HTTPS URI, proxy it as base64 so the client can embed it
      if (videoUri.startsWith("https://")) {
        // Some Veo 3 URIs require the API key for access; try with it first
        const fetchWithKey = (uri: string) => fetch(uri, { headers: { "x-goog-api-key": apiKey } });

        let resp = await fetchWithKey(videoUri);

        // If 403, wait 3 seconds and retry once (GCS eventual-consistency after generation)
        if (resp.status === 403) {
          await new Promise((r) => setTimeout(r, 3000));
          resp = await fetchWithKey(videoUri);
        }

        if (!resp.ok) {
          console.error(`Video URI fetch failed: ${resp.status} — ${videoUri}`);
          return NextResponse.json(
            {
              success: false,
              error: `Could not retrieve generated video (HTTP ${resp.status}). Veo 3 may not be enabled for this API key, or the signed link expired.`,
            },
            { status: 502 }
          );
        }
        const contentType = resp.headers.get("content-type") ?? "";
        if (!contentType.startsWith("video/") && !contentType.startsWith("application/octet")) {
          const preview = await resp.text();
          console.error(
            "Video URI returned non-video content:",
            contentType,
            preview.slice(0, 200)
          );
          return NextResponse.json(
            {
              success: false,
              error: "Video URL returned unexpected content — the signed link may have expired",
            },
            { status: 502 }
          );
        }
        const buf = await resp.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        const videoMime = contentType.split(";")[0].trim() || mimeType;
        return NextResponse.json({
          success: true,
          video: `data:${videoMime};base64,${b64}`,
        });
      }
      // gs:// URIs or other non-public URIs: return the URI itself; client can use it
      return NextResponse.json({ success: true, video: videoUri });
    }

    return NextResponse.json({ success: false, error: "No video data returned" }, { status: 500 });
  } catch (error) {
    console.error("Error in /api/reels/generate:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de la génération du reel";
    // Common causes: Veo 3 not enabled for this API key, quota exceeded, invalid model
    const isAccessError =
      message.includes("not found") ||
      message.includes("permission") ||
      message.includes("403") ||
      message.includes("not supported") ||
      message.includes("does not exist");
    return NextResponse.json(
      {
        success: false,
        error: isAccessError
          ? "Veo 3 n'est pas disponible pour cette clé API. Vérifiez que le modèle est activé dans Google AI Studio."
          : message,
      },
      { status: isAccessError ? 503 : 500 }
    );
  }
}
