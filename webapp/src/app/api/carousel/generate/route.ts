import { NextResponse } from "next/server";
import { generateText, isAIConfigured, stripJsonFences, GEMINI_FLASH } from "@/lib/ai-provider";
import type {
  CarouselGenerateRequest,
  CarouselGenerateResponse,
  CarouselSlideContent,
} from "@/types/instagram";

export const dynamic = "force-dynamic";

function buildCarouselPrompt(req: CarouselGenerateRequest): string {
  const {
    subject,
    audience,
    fonts,
    numSlides,
    previousCaptions,
    language = "en",
    promptContext,
  } = req;

  const lang = language === "fr" ? "French" : "English";

  const captionsSection =
    previousCaptions.length > 0
      ? `### Creator's previous captions (analyse voice, tone, style — mirror it)\n${previousCaptions
          .slice(0, 15)
          .map((c, i) => `${i + 1}. "${c.substring(0, 200)}"`)
          .join("\n")}`
      : "";

  const genderLabel =
    audience.gender === "female" ? "women" : audience.gender === "male" ? "men" : "everyone";

  const ageLabel = audience.ageRanges?.length ? `ages ${audience.ageRanges.join(" & ")}` : null;

  const audienceDesc =
    audience.mode === "optimized"
      ? "AI-determined optimal audience for this specific post topic (choose the audience that will be most engaged and reactive)"
      : [genderLabel, ageLabel, audience.regions?.join(", "), audience.interests?.join(", ")]
          .filter(Boolean)
          .join(", ");

  const audienceInstruction =
    audience.mode === "optimized"
      ? `### Target audience\nDetermine yourself the optimal audience for this specific post topic. Adapt all content (vocabulary, examples, tone, references) to maximise engagement for that audience. Briefly mention the chosen target in the Instagram description.\n`
      : `### Target audience\n${audienceDesc}\n`;

  return `You are an experienced solo adventure traveler and Instagram carousel content creator.

Generate the text content for a ${numSlides}-slide Instagram carousel in ${lang}.

### Subject
${subject}

${audienceInstruction}

### Fonts in use
- Title: ${fonts.title}
- Subtitle: ${fonts.subtitle}
- Body: ${fonts.body}

${captionsSection}

### Slide content rules
- Write every word in ${lang}. No other language.
- Slide 1: scroll-stopping hook — bold statement or surprising truth (title max 7 words, no full stop)
- Slides 2–${numSlides - 1}: one key insight or tip per slide, written from personal experience
- Slide ${numSlides}: clear CTA (save, share, follow, comment)
- Title: max 7 words, sentence case (only first word capitalised, no caps after colons)
- Subtitle: max 14 words, sentence case
- Body: max 28 words, conversational, no corporate buzzwords
- Tone: funny, slightly sarcastic, bold, authentic — human, not influencer-perfect
- NEVER capitalise common nouns mid-sentence (e.g. write "the best travel tips", not "the best Travel Tips")
- NEVER capitalise after a colon (e.g. "what worked: keep it simple", not "what worked: Keep It Simple")
- No exclamation marks in titles unless genuinely needed
- photoIndex: choose the photo that best matches the slide content (0-based index into available photos). If no photos are available, use -1. DO NOT just rotate — pick the most relevant photo for each slide's topic.

### Text style rules (textStyle per slide)
- bg: "none" | "highlight" | "pill" | "glass"
  - "none": clean text, add shadow:true for readability over photos
  - "highlight": semi-transparent color band behind each text line — bold, editorial look
  - "pill": rounded badge around each line — modern, graphic
  - "glass": frosted glass card over the entire title block — premium, magazine feel
- bgColor: hex color — use primary or accent; omit to fall back to accent
- bgOpacity: 0.7–0.92 (default 0.85)
- shadow: true adds drop shadow — always set true when bg is "none"
- glow: true adds a colored halo — dramatic, use on at most 1 slide
- rotation: float –2 to +2 (subtle organic tilt). ALWAYS set 0 on the CTA slide.
- autoScale: set true when the title has more than 5 words
- Vary styles across slides — never repeat the same bg on more than 40% of slides.

### Instagram description rules (also in ${lang})
- Structure: scroll-stopping hook (1 sentence) → 1–2 lines of context or strong opinion → 1–3 practical tips → CTA
- Tone: funny, sarcastic, slightly bold, authentic — written from POV of someone who's been there
- Max 3 emojis total
- No generic phrases ("don't miss this", "check it out", "amazing content")
- As long as possible — deliver real value, don't pad
- 3–5 lowercase hashtags at the end (no hashtag stuffing)

${promptContext ? `### Performance insights from your analytics\n${promptContext}\n` : ""}
Reply ONLY with this JSON (no markdown fences, no extra text):
{
  "slides": [
    {
      "title": "Hook that stops the scroll",
      "subtitle": "One line of context",
      "body": "Short punchy insight from experience",
      "photoIndex": 0,
      "textStyle": {
        "bg": "highlight",
        "bgColor": "#e91e8c",
        "bgOpacity": 0.85,
        "shadow": true,
        "rotation": 1.2,
        "autoScale": false
      }
    }
  ],
  "instagramDescription": "Full optimised caption ready to post...",
  "hashtags": ["#tag1", "#tag2"]
}`;
}

export async function POST(request: Request): Promise<NextResponse<CarouselGenerateResponse>> {
  try {
    const body: CarouselGenerateRequest = await request.json();

    if (!body.subject || !body.numSlides) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: subject, numSlides" },
        { status: 400 }
      );
    }

    if (!isAIConfigured()) {
      // Return mock response when no AI provider is configured
      const isFr = body.language === "fr";
      const mockSlides: CarouselSlideContent[] = Array.from({ length: body.numSlides }, (_, i) => ({
        title: i === 0 ? body.subject : isFr ? `Point ${i + 1}` : `Tip ${i + 1}`,
        subtitle:
          i === body.numSlides - 1
            ? isFr
              ? "Rejoins la communauté"
              : "Join the community"
            : isFr
              ? "Ce que personne ne te dit"
              : "What nobody tells you",
        body:
          i === 0
            ? isFr
              ? "Ce que tu dois absolument savoir sur ce sujet."
              : "What you actually need to know about this."
            : i === body.numSlides - 1
              ? isFr
                ? "Enregistre et partage si ça t'a aidé."
                : "Save this and share it if it helped."
              : isFr
                ? "Un insight clé que peu de gens connaissent."
                : "A key insight most people overlook.",
        photoIndex: i % Math.max(body.photos.length, 1),
      }));
      return NextResponse.json({
        success: true,
        slides: mockSlides,
        instagramDescription: isFr
          ? `${body.subject}\n\nCe que personne ne t'a dit. Enregistre ce post pour y revenir.`
          : `${body.subject}\n\nHonest take from someone who's been there. Save this for later.`,
        hashtags: isFr
          ? ["#instagram", "#créateur", "#conseil", "#france", "#viral"]
          : ["#instagram", "#travel", "#realtalk", "#creator", "#viral"],
      });
    }

    // If photos are provided and provider is Gemini, use vision for aesthetic analysis
    const { getActiveProvider, callGeminiVision } = await import("@/lib/ai-provider");
    const activeProvider = getActiveProvider();

    let rawText: string;

    if (body.photos.length > 0 && activeProvider === "gemini") {
      // Use Gemini Vision to analyze photos and generate carousel content
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        {
          text: `Here are ${body.photos.length} photos provided by the creator (indexed 0 to ${body.photos.length - 1}). Photo 0 is the cover (first slide). For each slide, you MUST set photoIndex to the specific photo that best matches THAT slide's topic, mood, and visual content. Analyse each photo carefully. Never assign the same photoIndex to all slides — distribute photos meaningfully across slides.\n`,
        },
      ];
      for (const photo of body.photos.slice(0, 6)) {
        const match = photo.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1]!, data: match[2]! } });
        }
      }
      parts.push({ text: "\n" + buildCarouselPrompt(body) });
      rawText = await callGeminiVision(parts, { model: body.model ?? GEMINI_FLASH });
    } else {
      // Text-only generation (works for Gemini, Anthropic, OpenAI)
      rawText = await generateText(buildCarouselPrompt(body), {
        model: body.model ?? GEMINI_FLASH,
      });
    }

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
    console.error("Error in /api/carousel/generate:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du carrousel" },
      { status: 500 }
    );
  }
}
