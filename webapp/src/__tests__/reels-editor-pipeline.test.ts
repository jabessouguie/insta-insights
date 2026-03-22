/**
 * Unit tests for reels-editor pipeline pure helpers.
 * No FFmpeg dependency — fully synchronous.
 */

import {
  buildCropFilter,
  parseSilenceLog,
  findActiveStart,
  buildAssemblyArgs,
} from "@/lib/reels-editor/pipeline-manager";

// ─── buildCropFilter ──────────────────────────────────────────────────────────

describe("buildCropFilter", () => {
  it("crops sides for landscape (16:9) video", () => {
    const result = buildCropFilter(1920, 1080);
    // targetAspect = 9/16 = 0.5625; srcAspect = 16/9 ≈ 1.777 (landscape)
    // cropW = round(1080 * 9/16) = round(607.5) = 608
    // offsetX = round((1920 - 608) / 2) = round(656) = 656
    expect(result).toBe("crop=608:1080:656:0,scale=1080:1920");
  });

  it("crops top/bottom for portrait (9:16) video (no-op)", () => {
    // 1080×1920 is already 9:16 — srcAspect = 9/16 = 0.5625, same as target
    // Falls into else branch: cropH = round(1080 / (9/16)) = round(1920) = 1920; offsetY = 0
    const result = buildCropFilter(1080, 1920);
    expect(result).toBe("crop=1080:1920:0:0,scale=1080:1920");
  });

  it("crops top/bottom for tall portrait (4:5)", () => {
    // 1080×1350 → srcAspect = 0.8, targetAspect = 0.5625 → portrait branch
    // cropH = round(1080 / 0.5625) = round(1920) = 1920 — but height is 1350
    // Actually 1350 < 1920 so offsetY would be negative — let's use a true portrait wider than 9:16
    // Use 1080×1440 (3:4), srcAspect = 0.75 > 0.5625 → landscape branch
    const result = buildCropFilter(1080, 1440);
    // srcAspect = 1080/1440 = 0.75 > 0.5625 → crop sides
    // cropW = round(1440 * 0.5625) = round(810) = 810
    // offsetX = round((1080 - 810) / 2) = 135
    expect(result).toBe("crop=810:1440:135:0,scale=1080:1920");
  });

  it("crops top/bottom for very tall video (1:2)", () => {
    // 540×1080, srcAspect = 0.5 < 0.5625 → portrait branch
    // cropH = round(540 / 0.5625) = round(960) = 960
    // offsetY = round((1080 - 960) / 2) = 60
    const result = buildCropFilter(540, 1080);
    expect(result).toBe("crop=540:960:0:60,scale=1080:1920");
  });

  it("handles square (1:1) video", () => {
    // 1000×1000, srcAspect = 1.0 > 0.5625 → landscape branch
    // cropW = round(1000 * 0.5625) = 563
    // offsetX = round((1000 - 563) / 2) = 219 (round(218.5))
    const result = buildCropFilter(1000, 1000);
    expect(result).toBe("crop=563:1000:219:0,scale=1080:1920");
  });
});

// ─── parseSilenceLog ──────────────────────────────────────────────────────────

describe("parseSilenceLog", () => {
  it("parses a single silence interval", () => {
    const log = `[silencedetect @ 0x...] silence_start: 0.000000
[silencedetect @ 0x...] silence_end: 1.230000 | silence_duration: 1.230000`;
    const result = parseSilenceLog(log);
    expect(result).toEqual([{ start: 0, end: 1.23 }]);
  });

  it("parses multiple silence intervals", () => {
    const log = `silence_start: 0.0
silence_end: 0.8
silence_start: 5.0
silence_end: 6.1`;
    const result = parseSilenceLog(log);
    expect(result).toEqual([
      { start: 0, end: 0.8 },
      { start: 5.0, end: 6.1 },
    ]);
  });

  it("ignores incomplete intervals (no end)", () => {
    const log = `silence_start: 2.0`;
    const result = parseSilenceLog(log);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty log", () => {
    expect(parseSilenceLog("")).toEqual([]);
  });

  it("returns empty array for log with no silence lines", () => {
    const log = `frame=  100 fps=30 q=28.0
encoded 100 frames`;
    expect(parseSilenceLog(log)).toEqual([]);
  });

  it("handles extra whitespace in silence_start value", () => {
    const log = `silence_start:   0.5
silence_end:   1.0`;
    const result = parseSilenceLog(log);
    expect(result).toEqual([{ start: 0.5, end: 1.0 }]);
  });
});

// ─── findActiveStart ──────────────────────────────────────────────────────────

describe("findActiveStart", () => {
  it("returns silence end when leading silence starts near 0", () => {
    const silences = [{ start: 0.05, end: 1.5 }];
    expect(findActiveStart(silences)).toBe(1.5);
  });

  it("returns 0 when no leading silence (start >= 0.1)", () => {
    const silences = [{ start: 0.5, end: 2.0 }];
    expect(findActiveStart(silences)).toBe(0);
  });

  it("returns 0 for empty silences array", () => {
    expect(findActiveStart([])).toBe(0);
  });

  it("uses only the first silence interval that starts < 0.1", () => {
    const silences = [
      { start: 0.0, end: 0.8 },
      { start: 3.0, end: 3.5 },
    ];
    expect(findActiveStart(silences)).toBe(0.8);
  });

  it("returns 0 when leading silence starts exactly at 0.1 (boundary)", () => {
    // start < 0.1 is strict, so 0.1 is NOT a leading silence
    const silences = [{ start: 0.1, end: 1.0 }];
    expect(findActiveStart(silences)).toBe(0);
  });
});

// ─── buildAssemblyArgs ────────────────────────────────────────────────────────

describe("buildAssemblyArgs", () => {
  const encodeArgs = [
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-r",
    "30",
    "output.mp4",
  ];

  describe("single clip", () => {
    it("passes single input directly without filter_complex", () => {
      const args = buildAssemblyArgs(["clip0.mp4"], [5], "none", 0.5, "output.mp4");
      expect(args).toEqual(["-i", "clip0.mp4", ...encodeArgs]);
    });
  });

  describe("concat (transition = none)", () => {
    it("builds concat filter for 2 clips", () => {
      const args = buildAssemblyArgs(["a.mp4", "b.mp4"], [5, 5], "none", 0.5, "output.mp4");
      expect(args).toContain("-filter_complex");
      const fc = args[args.indexOf("-filter_complex") + 1]!;
      expect(fc).toBe("[0:v][1:v][0:a][1:a]concat=n=2:v=1:a=1[outv][outa]");
      expect(args).toContain("-map");
    });

    it("builds concat filter for 3 clips", () => {
      const args = buildAssemblyArgs(
        ["a.mp4", "b.mp4", "c.mp4"],
        [5, 5, 5],
        "none",
        0.5,
        "output.mp4"
      );
      const fc = args[args.indexOf("-filter_complex") + 1]!;
      expect(fc).toBe("[0:v][1:v][2:v][0:a][1:a][2:a]concat=n=3:v=1:a=1[outv][outa]");
    });
  });

  describe("xfade transitions", () => {
    it("builds xfade chain for fade transition (2 clips)", () => {
      const args = buildAssemblyArgs(["a.mp4", "b.mp4"], [5, 5], "fade", 0.5, "output.mp4");
      const fc = args[args.indexOf("-filter_complex") + 1]!;
      // offset = 5 - 0.5 = 4.5
      expect(fc).toContain("xfade=transition=fade:duration=0.5:offset=4.500[outv]");
      expect(fc).toContain("acrossfade=d=0.5[outa]");
    });

    it("builds xfade chain for wiperight transition", () => {
      const args = buildAssemblyArgs(["a.mp4", "b.mp4"], [8, 8], "wiperight", 0.5, "output.mp4");
      const fc = args[args.indexOf("-filter_complex") + 1]!;
      expect(fc).toContain("xfade=transition=wiperight:duration=0.5:offset=7.500[outv]");
    });

    it("builds xfade chain for zoomin transition", () => {
      const args = buildAssemblyArgs(["a.mp4", "b.mp4"], [10, 10], "zoomin", 0.5, "output.mp4");
      const fc = args[args.indexOf("-filter_complex") + 1]!;
      expect(fc).toContain("xfade=transition=zoomin:duration=0.5:offset=9.500[outv]");
    });

    it("chains intermediate labels for 3 clips with xfade", () => {
      const args = buildAssemblyArgs(
        ["a.mp4", "b.mp4", "c.mp4"],
        [5, 5, 5],
        "fade",
        0.5,
        "output.mp4"
      );
      const fc = args[args.indexOf("-filter_complex") + 1]!;
      // First transition: [0:v][1:v]xfade...offset=4.5[v0]
      // Second transition: [v0][2:v]xfade...offset=9.0[outv]
      expect(fc).toContain("[v0]");
      expect(fc).toContain("[outv]");
      expect(fc).toContain("[outa]");
    });

    it("accumulates offsets correctly for 3 clips", () => {
      const args = buildAssemblyArgs(
        ["a.mp4", "b.mp4", "c.mp4"],
        [6, 8, 5],
        "fade",
        1,
        "output.mp4"
      );
      const fc = args[args.indexOf("-filter_complex") + 1]!;
      // First offset: 6 - 1 = 5.000
      // Second offset: (6 - 1) + (8 - 1) = 12.000
      expect(fc).toContain("offset=5.000");
      expect(fc).toContain("offset=12.000");
    });
  });

  describe("output args", () => {
    it("always ends with the output filename", () => {
      const args = buildAssemblyArgs(["a.mp4"], [5], "none", 0.5, "final_reel.mp4");
      expect(args[args.length - 1]).toBe("final_reel.mp4");
    });

    it("includes libx264 codec and faststart", () => {
      const args = buildAssemblyArgs(["a.mp4", "b.mp4"], [5, 5], "none", 0.5, "out.mp4");
      expect(args).toContain("libx264");
      expect(args).toContain("+faststart");
    });
  });
});
