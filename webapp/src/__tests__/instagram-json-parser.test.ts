/**
 * Unit tests for instagram-json-parser.ts
 * Focuses on format detection (isJsonExport) and pure helper logic.
 */

import { isJsonExport } from "@/lib/instagram-json-parser";
import fs from "fs";
import path from "path";

jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

beforeEach(() => {
  jest.resetAllMocks();
  mockFs.existsSync.mockReturnValue(false);
});

// ─── isJsonExport ─────────────────────────────────────────────────────────────

describe("isJsonExport", () => {
  const folder = "/mock/instagram-test";

  it("returns true for a full JSON export (personal_information.json present)", () => {
    // JSON export — no html indicators, some json files
    mockFs.existsSync.mockImplementation((p) => String(p).endsWith("personal_information.json"));
    expect(isJsonExport(folder)).toBe(true);
  });

  it("returns true for a partial JSON ZIP with no indicator files (e.g. media-only)", () => {
    // No html indicators, no json indicators either — partial ZIP
    mockFs.existsSync.mockReturnValue(false);
    expect(isJsonExport(folder)).toBe(true);
  });

  it("returns false when followers_1.html is present (old HTML format)", () => {
    mockFs.existsSync.mockImplementation((p) => String(p).endsWith("followers_1.html"));
    expect(isJsonExport(folder)).toBe(false);
  });

  it("returns false when following.html is present (old HTML format)", () => {
    mockFs.existsSync.mockImplementation((p) => String(p).endsWith("following.html"));
    expect(isJsonExport(folder)).toBe(false);
  });

  it("returns false when audience_insights.html is present (old HTML format)", () => {
    mockFs.existsSync.mockImplementation((p) => String(p).endsWith("audience_insights.html"));
    expect(isJsonExport(folder)).toBe(false);
  });

  it("returns false when content_interactions.html is present (old HTML format)", () => {
    mockFs.existsSync.mockImplementation((p) => String(p).endsWith("content_interactions.html"));
    expect(isJsonExport(folder)).toBe(false);
  });

  it("checks the html indicator paths inside the export folder", () => {
    const followersHtmlPath = path.join(
      folder,
      "connections",
      "followers_and_following",
      "followers_1.html"
    );
    mockFs.existsSync.mockReturnValue(false);
    isJsonExport(folder);
    expect(mockFs.existsSync).toHaveBeenCalledWith(followersHtmlPath);
  });
});
