import { generateGuideHTML, DEFAULT_GUIDE_CONFIG } from "@/lib/guide-generator";
import type { GuideConfig } from "@/types/instagram";

const BASE_CONFIG: GuideConfig = {
  title: "My Travel Guide",
  type: "travel",
  sections: [
    { title: "Getting There", content: "Take the train." },
    { title: "Where to Stay", content: "Book early." },
  ],
};

describe("generateGuideHTML", () => {
  it("produces a complete HTML document with DOCTYPE", () => {
    const html = generateGuideHTML(BASE_CONFIG);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("</html>");
  });

  it("includes the guide title in the document", () => {
    const html = generateGuideHTML(BASE_CONFIG);
    expect(html).toContain("My Travel Guide");
  });

  it("renders section titles and content", () => {
    const html = generateGuideHTML(BASE_CONFIG);
    expect(html).toContain("Getting There");
    expect(html).toContain("Take the train.");
    expect(html).toContain("Where to Stay");
    expect(html).toContain("Book early.");
  });

  it("numbers sections starting at 01", () => {
    const html = generateGuideHTML(BASE_CONFIG);
    expect(html).toContain(">01<");
    expect(html).toContain(">02<");
  });

  it("uses the correct type label for travel", () => {
    const html = generateGuideHTML(BASE_CONFIG);
    expect(html).toContain("Guide Voyage");
  });

  it("uses the correct type labels for all guide types", () => {
    const cases: Array<[GuideConfig["type"], string]> = [
      ["tutorial", "Tutoriel"],
      ["recipe", "Recette"],
      ["tips", "Conseils"],
      ["general", "Guide"],
      ["travel", "Guide Voyage"],
    ];
    for (const [type, label] of cases) {
      const html = generateGuideHTML({ ...BASE_CONFIG, type });
      expect(html).toContain(label);
    }
  });

  it("renders the subtitle when provided", () => {
    const html = generateGuideHTML({ ...BASE_CONFIG, subtitle: "A subtitle here" });
    expect(html).toContain("A subtitle here");
  });

  it("does not render a subtitle element when omitted", () => {
    const html = generateGuideHTML(BASE_CONFIG);
    expect(html).not.toContain('class="cover-subtitle"');
  });

  it("renders the author name when provided", () => {
    const html = generateGuideHTML({ ...BASE_CONFIG, authorName: "@travelguru" });
    expect(html).toContain("@travelguru");
    expect(html).toContain("Par @travelguru");
  });

  it("does not render author elements when authorName is empty", () => {
    const html = generateGuideHTML({ ...BASE_CONFIG, authorName: "" });
    expect(html).not.toContain('class="cover-author"');
    expect(html).not.toContain('class="guide-footer-author"');
  });

  it("applies the accent color CSS variable", () => {
    const html = generateGuideHTML({ ...BASE_CONFIG, accentColor: "#ff5733" });
    expect(html).toContain("--accent: #ff5733");
  });

  it("falls back to default accent color when accentColor is undefined", () => {
    const config: GuideConfig = { ...BASE_CONFIG };
    delete (config as Partial<GuideConfig>).accentColor;
    const html = generateGuideHTML(config);
    expect(html).toContain("--accent: #6366f1");
  });

  it("escapes HTML special characters in title", () => {
    const html = generateGuideHTML({
      ...BASE_CONFIG,
      title: 'A <script>alert("xss")</script> title',
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML special characters in section content", () => {
    const html = generateGuideHTML({
      ...BASE_CONFIG,
      sections: [{ title: "Safe", content: "Hello & <b>World</b>" }],
    });
    expect(html).not.toContain("<b>World</b>");
    expect(html).toContain("&lt;b&gt;World&lt;/b&gt;");
    expect(html).toContain("Hello &amp;");
  });

  it("converts newlines to <br> in section content", () => {
    const html = generateGuideHTML({
      ...BASE_CONFIG,
      sections: [{ title: "Steps", content: "Step 1\nStep 2\nStep 3" }],
    });
    expect(html).toContain("Step 1<br>Step 2<br>Step 3");
  });

  it("filters out sections with empty title and content", () => {
    const html = generateGuideHTML({
      ...BASE_CONFIG,
      sections: [
        { title: "", content: "" },
        { title: "Real Section", content: "Real content" },
      ],
    });
    // Only 1 real section — number should be 01 not 02
    expect(html).toContain(">01<");
    expect(html).not.toContain(">02<");
    expect(html).toContain("Real Section");
  });

  it("includes a photo tag when photoIndex matches an available photo", () => {
    const html = generateGuideHTML({
      ...BASE_CONFIG,
      photos: ["data:image/png;base64,ABC123"],
      sections: [{ title: "With Photo", content: "Content", photoIndex: 0 }],
    });
    expect(html).toContain("section-photo");
    expect(html).toContain("data:image/png;base64,ABC123");
  });

  it("does not include a photo tag when photoIndex is -1", () => {
    const html = generateGuideHTML({
      ...BASE_CONFIG,
      photos: ["data:image/png;base64,ABC123"],
      sections: [{ title: "No Photo", content: "Content", photoIndex: -1 }],
    });
    expect(html).not.toContain('class="section-photo"');
  });

  it("does not include a photo tag when photoIndex is out of range", () => {
    const html = generateGuideHTML({
      ...BASE_CONFIG,
      photos: ["data:image/png;base64,ABC123"],
      sections: [{ title: "Out of range", content: "Content", photoIndex: 5 }],
    });
    expect(html).not.toContain('class="section-photo"');
  });

  it("alternates section-alt class on even-indexed sections", () => {
    const html = generateGuideHTML({
      ...BASE_CONFIG,
      sections: [
        { title: "S1", content: "c1" },
        { title: "S2", content: "c2" },
        { title: "S3", content: "c3" },
      ],
    });
    // Section index 1 (2nd) gets section-alt, index 0 and 2 do not
    const matches = [...html.matchAll(/class="guide-section(?: section-alt)?"/g)].map((m) => m[0]);
    expect(matches[0]).toBe('class="guide-section"');
    expect(matches[1]).toBe('class="guide-section section-alt"');
    expect(matches[2]).toBe('class="guide-section"');
  });

  it("includes print CSS with A4 page size", () => {
    const html = generateGuideHTML(BASE_CONFIG);
    expect(html).toContain("@media print");
    expect(html).toContain("size: A4 portrait");
  });

  it("renders a footer with the year", () => {
    const html = generateGuideHTML(BASE_CONFIG);
    expect(html).toContain(String(new Date().getFullYear()));
    expect(html).toContain("guide-footer");
  });
});

describe("DEFAULT_GUIDE_CONFIG", () => {
  it("has sensible default values", () => {
    expect(DEFAULT_GUIDE_CONFIG.title).toBe("");
    expect(DEFAULT_GUIDE_CONFIG.type).toBe("general");
    expect(DEFAULT_GUIDE_CONFIG.accentColor).toBe("#6366f1");
    expect(DEFAULT_GUIDE_CONFIG.sections).toHaveLength(1);
    expect(DEFAULT_GUIDE_CONFIG.photos).toHaveLength(0);
  });
});
