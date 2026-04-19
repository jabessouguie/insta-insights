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

  return `You are an experienced solo adventure traveler and Instagram content creator in the style of @jeanseestheworld.
Your reference for this carousel is a viral post with the following structure and aesthetic:
- Slide 1 hook: short, clivant, 3–5 words in a large serif font (e.g. "I never expected this", "Trade cityscapes for forest magic")
- Each slide: a bold 3–5 word poetic/clivant TITLE + 2–3 descriptive lines in a smaller font that feel personal and specific
- Final slide: an open question to generate comments (e.g. "Ready to be surprised?")
- Description: starts with a personal confession/opinion (e.g. "Okay, I have a confession:"), then delivers specific, vivid travel insights, ends with a direct conversational question

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
- Slide 1 — SCROLL-STOPPING HOOK:
  • Title: 3–5 words max, poetic or clivant (bold truth, unexpected contrast, or confession fragment). Inspired by: "I never expected this", "They lied to you", "Nobody talks about this".
  • FORBIDDEN: "Voici comment", "Discover", "Here's how", "Learn how", "Amazing", "The ultimate guide", "Top X tips"
  • Body (under the title): 2–3 lines that deliver a personal/surprising statement to hook the reader — no listicle, pure narrative
- Slides 2–${numSlides - 1}: each slide = one poetic title (3–5 words, sounds like a magazine headline or a revealed secret) + 2–3 lines of vivid personal first-person storytelling. Be specific: mention actual names, sensations, or details (e.g. "Mossy rocks, winding paths" / "The cable car changed everything")
- Slide ${numSlides}: open conversational question as the title (e.g. "Prêt à être surpris ?" / "Et toi, tu savais ?") + 1 short CTA line
- Title: max 5 words, sentence case (only first word capitalised)
- Body: max 25 words, conversational, personal, specific — NO corporate buzzwords, NO generic tips
- Tone: authentic travel storyteller, slightly confessional, warm and personal — like a trusted friend sharing a discovery
- NEVER capitalise common nouns mid-sentence
- No exclamation marks in titles
- photoIndex: choose the photo that best matches the slide content (0-based index). DO NOT just rotate — pick the most relevant photo for each slide.
- layout: choose a visual layout for each slide based on its content and emotional tone:
  • "center" — oversized title centered over a full-bleed photo. USE THIS for slides 1 and the CTA slide — it's the signature layout of this style.
  • "classic" — text at bottom-left behind a dark gradient, good fallback for mid-carousel slides
  • "card" — frosted glass card over photo at bottom, best for detail-rich body text
  • "split" — photo on top half, solid brand color band on bottom half, for data/list slides
  Vary layouts for visual rhythm. Prefer "center" for slide 1.

### Instagram description rules (also in ${lang})
- Opening: start with a personal confession or strong opinion (e.g. "Okay, j'ai un aveu : j'ai complètement sous-estimé X." or "Soyons honnêtes — personne ne parle de ça.")
- Body: narrative and vivid. Describe specific places, moments, or sensations. Write as if texting a friend who's about to make the same trip.
- End with a direct conversational question to invite comments (e.g. "Tu y es déjà allé ? Ton spot préféré ? 👇")
- Max 3 emojis total, used sparingly for emotional punctuation only
- No generic phrases ("don't miss this", "amazing content", etc.)
- Make it long — deliver real value and atmosphere
- Max 5 lowercase hashtags at the end, highly targeted to the content

${promptContext ? `### Performance insights from your analytics\n${promptContext}\n` : ""}
Reply ONLY with this JSON (no markdown fences, no extra text):
{
  "slides": [
    {
      "title": "Hook that stops the scroll",
      "subtitle": "One line of context",
      "body": "Short punchy insight from experience",
      "photoIndex": 0,
      "layout": "center"
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
    const activeProvider = getActiveProvider(body.model);

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
