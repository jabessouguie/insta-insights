import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface AudioRequest {
  musicPrompt: string;
  durationSeconds?: number;
  bpm?: number;
  temperature?: number;
}

interface AudioResponse {
  success: boolean;
  audio?: string; // base64 data URL "data:audio/wav;base64,..."
  error?: string;
}

/**
 * Generates background music using Google Lyria Realtime.
 * Collects PCM16 stereo chunks via WebSocket, prepends a WAV header,
 * and returns the result as a base64 data URL.
 */
export async function POST(request: Request): Promise<NextResponse<AudioResponse>> {
  try {
    const body: AudioRequest = await request.json();
    const { musicPrompt, durationSeconds = 10, bpm = 120, temperature = 1.0 } = body;

    if (!musicPrompt) {
      return NextResponse.json(
        { success: false, error: "Missing required field: musicPrompt" },
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

    // Lyria Realtime requires v1alpha API version
    const ai = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });

    const audioChunks: Buffer[] = [];

    const session = await (ai as any).live.music.connect({
      model: "models/lyria-realtime-exp",
      callbacks: {
        onmessage: (message: any) => {
          if (message.serverContent?.audioChunks) {
            for (const chunk of message.serverContent.audioChunks) {
              audioChunks.push(Buffer.from(chunk.data, "base64"));
            }
          }
        },
        onerror: (error: any) => {
          console.error("Lyria session error:", error);
        },
        onclose: () => {
          // Closed
        },
      },
    });

    // Configure music generation
    await session.setMusicGenerationConfig({
      musicGenerationConfig: {
        bpm,
        temperature,
        density: 0.5,
        brightness: 0.5,
        audioFormat: "pcm16",
        sampleRateHz: 48000,
      },
    });

    // Set the prompt
    await session.setWeightedPrompts({
      weightedPrompts: [{ text: musicPrompt, weight: 1.0 }],
    });

    // Start playback
    await session.play();

    // Collect audio for the requested duration + 2s buffer for latency
    const collectMs = (durationSeconds + 2) * 1000;
    await new Promise((r) => setTimeout(r, collectMs));

    // Stop and close the session
    try {
      await session.stop();
    } catch {
      // Session may already be closed
    }

    if (audioChunks.length === 0) {
      return NextResponse.json(
        { success: false, error: "No audio data received from Lyria" },
        { status: 500 }
      );
    }

    // Concatenate all PCM chunks
    const pcmData = Buffer.concat(audioChunks);

    // Trim to exact duration (48kHz stereo 16-bit = 192000 bytes/sec)
    const bytesPerSecond = 48000 * 2 * 2; // sampleRate * channels * bytesPerSample
    const targetBytes = durationSeconds * bytesPerSecond;
    const trimmedPcm = pcmData.subarray(0, Math.min(pcmData.length, targetBytes));

    // Build WAV header
    const wavBuffer = buildWavBuffer(trimmedPcm, 48000, 2, 16);
    const base64 = wavBuffer.toString("base64");

    return NextResponse.json({
      success: true,
      audio: `data:audio/wav;base64,${base64}`,
    });
  } catch (error) {
    console.error("Error in /api/reels/audio:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération audio" },
      { status: 500 }
    );
  }
}

/** Prepend a standard WAV header to raw PCM data. */
function buildWavBuffer(
  pcmData: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // sub-chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, headerSize);

  return buffer;
}
