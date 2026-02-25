import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  CarouselGenerateRequest,
  CarouselGenerateResponse,
  CarouselSlideContent,
} from "@/types/instagram";

export const dynamic = "force-dynamic";

const MODEL_NAME = "gemini-2.5-flash";

function buildCarouselPrompt(req: CarouselGenerateRequest): string {
  const { subject, audience, fonts, numSlides, previousCaptions, language = "en" } = req;

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

  const audienceDesc = [genderLabel, audience.region, audience.interests]
    .filter(Boolean)
    .join(", ");

  return `You are an experienced solo adventure traveler and Instagram carousel content creator.

Generate the text content for a ${numSlides}-slide Instagram carousel in ${lang}.

### Subject
${subject}

### Target audience
${audienceDesc}

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
- photoIndex: rotate 0, 1, 2… (modulo number of available photos)

### Instagram description rules (also in ${lang})
- Structure: scroll-stopping hook (1 sentence) → 1–2 lines of context or strong opinion → 1–3 practical tips → CTA
- Tone: funny, sarcastic, slightly bold, authentic — written from POV of someone who's been there
- Max 3 emojis total
- No generic phrases ("don't miss this", "check it out", "amazing content")
- As long as possible — deliver real value, don't pad
- 3–5 lowercase hashtags at the end (no hashtag stuffing)

Reply ONLY with this JSON (no markdown fences, no extra text):
{
  "slides": [
    {
      "title": "Hook that stops the scroll",
      "subtitle": "One line of context",
      "body": "Short punchy insight from experience",
      "photoIndex": 0
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return mock response when API key is missing
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

    const genAI = new GoogleGenerativeAI(apiKey);

    // If photos are provided, use vision model to analyze them for aesthetic context
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (body.photos.length > 0) {
      parts.push({
        text: "Voici les photos fournies par le créateur pour le carrousel. Analyse leur style visuel (couleurs dominantes, ambiance, composition) pour aligner le contenu textuel.\n",
      });
      // Send up to 3 photos to Gemini for visual analysis
      for (const photo of body.photos.slice(0, 3)) {
        const match = photo.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }
      parts.push({ text: "\n" + buildCarouselPrompt(body) });
    } else {
      parts.push({ text: buildCarouselPrompt(body) });
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(parts);
    const text = result.response
      .text()
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(text) as {
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
