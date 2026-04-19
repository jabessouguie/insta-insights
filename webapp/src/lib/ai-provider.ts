/**
 * Multi-provider AI text generation abstraction.
 *
 * Configuration via environment variables:
 *
 *   AI_PROVIDER  = "gemini" | "anthropic" | "openai" | "openai-compatible"
 *                  Auto-detects from available API keys when not set.
 *   AI_MODEL     = Optional model override (e.g. "claude-opus-4-6", "gpt-4o-mini", "llama3")
 *
 *   GEMINI_API_KEY      — Google Gemini (default provider)
 *   ANTHROPIC_API_KEY   — Anthropic Claude
 *   OPENAI_API_KEY      — OpenAI GPT
 *   OPENAI_BASE_URL     — OpenAI-compatible endpoint for local/self-hosted models
 *                         (Ollama: http://localhost:11434/v1, Together.ai, etc.)
 *
 * Vision (image analysis) and media generation (audio/video via Veo/Lyria) are
 * Gemini-specific and handled separately via callGeminiVision().
 */

export type AIProvider = "gemini" | "anthropic" | "openai" | "openai-compatible";

const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: "gemini-3-flash-preview",
  anthropic: "claude-3-7-sonnet-20250219",
  openai: "gpt-4o",
  "openai-compatible": "llama3",
};

/** Gemini model aliases — pass as `options.model` to override the default. */
export const GEMINI_FLASH = "gemini-3-flash-preview"; // Gemini 3.0 — fast, efficient (default)
export const GEMINI_FLASH_31 = "gemini-3.1-flash-preview"; // Gemini 3.1 Flash — faster, smarter
export const GEMINI_FLASH_LITE = "gemini-3.1-flash-lite-preview"; // Gemini 3.1 Lite — cost-efficient
export const GEMINI_PRO = "gemini-3.1-pro-preview"; // Gemini 3.1 Pro — most capable

/** Detect which provider to use, based on env vars and requested model. */
export function getActiveProvider(requestedModel?: string): AIProvider {
  if (requestedModel) {
    if (requestedModel.startsWith("claude") && process.env.ANTHROPIC_API_KEY) return "anthropic";
    if (
      (requestedModel.startsWith("gpt") || /^o\d/.test(requestedModel)) &&
      process.env.OPENAI_API_KEY
    )
      return "openai";
    if (
      (requestedModel.startsWith("gpt") || /^o\d/.test(requestedModel)) &&
      process.env.OPENAI_BASE_URL
    )
      return "openai-compatible";
    if (requestedModel.startsWith("gemini") && process.env.GEMINI_API_KEY) return "gemini";
  }

  const explicit = process.env.AI_PROVIDER as AIProvider | undefined;
  if (explicit && explicit in DEFAULT_MODELS) return explicit;
  // Auto-detect from available keys (priority order)
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.OPENAI_BASE_URL) return "openai-compatible";
  return "gemini";
}

/** Return the model name to use (respects AI_MODEL override). */
export function getDefaultModel(provider?: AIProvider): string {
  return process.env.AI_MODEL ?? DEFAULT_MODELS[provider ?? getActiveProvider()];
}

/**
 * Returns true if `model` looks compatible with `provider`.
 * Prevents cross-provider model names from being forwarded to the wrong API.
 */
function isModelCompatible(model: string, provider: AIProvider): boolean {
  switch (provider) {
    case "gemini":
      return model.startsWith("gemini");
    case "anthropic":
      return model.startsWith("claude");
    case "openai":
      return model.startsWith("gpt") || /^o\d/.test(model);
    case "openai-compatible":
      return true; // self-hosted: accept any model name
  }
}

/** True if at least one AI provider is configured. */
export function isAIConfigured(): boolean {
  return !!(
    process.env.GEMINI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_BASE_URL
  );
}

export interface GenerateTextOptions {
  /** Override the model for this call (e.g. "gemini-2.5-pro" for heavier tasks). */
  model?: string;
  /** Maximum output tokens (default: 4096). */
  maxTokens?: number;
}

/**
 * Generate text from the configured AI provider.
 * The prompt is plain text. JSON parsing and cleanup is the caller's responsibility.
 */
export async function generateText(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  const requested = options.model;
  const provider = getActiveProvider(requested);
  const model =
    requested && isModelCompatible(requested, provider) ? requested : getDefaultModel(provider);
  const maxTokens = options.maxTokens ?? 4096;

  switch (provider) {
    case "gemini": {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY is not configured");
      const genAI = new GoogleGenerativeAI(key);
      try {
        const m = genAI.getGenerativeModel({ model });
        const result = await m.generateContent(prompt);
        return result.response.text().trim();
      } catch (e) {
        const msg = String(e);
        // Preview model names may be rejected (404) — fall back to stable Flash
        if (msg.includes("404") || msg.includes("not found") || msg.includes("preview")) {
          console.error(
            `[ai-provider] model "${model}" rejected, falling back to gemini-2.5-flash:`,
            msg
          );
          const fallback = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await fallback.generateContent(prompt);
          return result.response.text().trim();
        }
        throw e;
      }
    }

    case "anthropic": {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
      const client = new Anthropic({ apiKey: key });
      const msg = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });
      const block = msg.content[0];
      return block.type === "text" ? block.text.trim() : "";
    }

    case "openai":
    case "openai-compatible": {
      const { default: OpenAI } = await import("openai");
      // Ollama and some self-hosted endpoints don't require a real key
      const key = process.env.OPENAI_API_KEY ?? "ollama";
      const baseURL = process.env.OPENAI_BASE_URL;
      const client = new OpenAI({ apiKey: key, ...(baseURL ? { baseURL } : {}) });
      // o-series reasoning models (o1, o3, o4-mini, etc.) require max_completion_tokens
      const isReasoningModel = /^o\d/.test(model);
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        ...(isReasoningModel ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
      });
      return (completion.choices[0]?.message?.content ?? "").trim();
    }
  }
}

/** Strip markdown code fences from an AI response (needed for non-JSON-MIME providers). */
export function stripJsonFences(text: string): string {
  return text
    .replace(/^```json?\s*/im, "")
    .replace(/\s*```$/im, "")
    .trim();
}

/**
 * Gemini-only: generate text with multipart contents (images + text).
 * Falls back to plain text prompt if no images provided.
 * Only available when Gemini is configured.
 */
export async function callGeminiVision(
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
  options: GenerateTextOptions = {}
): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured for vision tasks");
  const model = options.model ?? GEMINI_FLASH;
  const genAI = new GoogleGenerativeAI(key);
  try {
    const m = genAI.getGenerativeModel({ model });
    const result = await m.generateContent(parts);
    return result.response.text().trim();
  } catch (e) {
    const msg = String(e);
    // Preview model names may be rejected (404) — fall back to stable Flash
    if (msg.includes("404") || msg.includes("not found") || msg.includes("preview")) {
      console.error(
        `[ai-provider] vision model "${model}" rejected, falling back to gemini-2.5-flash:`,
        msg
      );
      const fallback = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await fallback.generateContent(parts);
      return result.response.text().trim();
    }
    throw e;
  }
}

/**
 * Gemini-only: generate text as a ReadableStream (for SSE / streaming UI).
 * Falls back to a single-chunk stream when the active provider is not Gemini.
 */
export async function generateTextStream(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const provider = getActiveProvider(options.model);

  if (provider === "gemini") {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");
    const model = options.model ?? getDefaultModel("gemini");
    const genAI = new GoogleGenerativeAI(key);

    const getStream = async () => {
      try {
        const m = genAI.getGenerativeModel({ model });
        return await m.generateContentStream(prompt);
      } catch (e) {
        const msg = String(e);
        if (msg.includes("404") || msg.includes("not found") || msg.includes("preview")) {
          console.error(
            `[ai-provider] stream model "${model}" rejected, falling back to gemini-2.5-flash:`,
            msg
          );
          const fallback = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          return await fallback.generateContentStream(prompt);
        }
        throw e;
      }
    };

    const stream = await getStream();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        for await (const chunk of stream.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });
  }

  // Non-Gemini: buffer the full response into a single-chunk stream
  const text = await generateText(prompt, options);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}
