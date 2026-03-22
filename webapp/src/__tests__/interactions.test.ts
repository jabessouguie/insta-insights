/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for the interaction analyser logic.
 * Tests the business rules for classifying accounts by mocking fs and testing the actual module.
 */

import { analyseInteractions, analyseInteractionsFromAPI } from "@/lib/interaction-analyser";
import fs from "fs";
import path from "path";

jest.mock("fs");

const mockFs = fs as jest.Mocked<typeof fs>;

describe("interaction-analyser", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.INSTAGRAM_DATA_PATH = "/mock/data";

    // Default mocks for non-existent things to avoid errors
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readdirSync.mockReturnValue([] as any);
  });

  describe("analyseInteractionsFromAPI", () => {
    it("returns empty arrays since API does not support interaction analysis", async () => {
      const result = await analyseInteractionsFromAPI("token", "123");
      expect(result).toEqual({
        neverInteracted: [],
        dmSuggestionsNoFollowBack: [],
        dmSuggestionsMutual: [],
        unfollowCandidates: [],
        dataSource: "api",
      });
    });
  });

  describe("analyseInteractions — no export", () => {
    it("returns null if no export folder", async () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = await analyseInteractions();
      expect(result).toBeNull();
    });

    it("returns null for an HTML export (not supported)", async () => {
      // HTML export: followers_1.html present → isJsonExport returns false
      mockFs.existsSync.mockImplementation((p: any) => {
        if (p === "/mock/data") return true;
        if (p === "/mock/data/instagram-test") return true;
        if (String(p).endsWith("followers_1.html")) return true; // HTML indicator
        return false;
      });
      mockFs.readdirSync.mockImplementation((p: any): any => {
        if (p === "/mock/data") return ["instagram-test"];
        return [];
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = await analyseInteractions();
      expect(result).toBeNull();
    });
  });

  describe("analyseInteractions JSON Export", () => {
    it("parses JSON export correctly", async () => {
      mockFs.existsSync.mockImplementation((p: any) => {
        if (typeof p !== "string") return false;
        if (p === "/mock/data") return true;
        if (p === "/mock/data/instagram-test") return true;
        if (p === path.join("/mock/data/instagram-test", "connections", "followers_and_following"))
          return true;
        // isJsonExport detection (personal_information.json)
        if (p.endsWith("personal_information.json")) return true;
        // JSON follower/following files
        if (p.endsWith("followers_1.json")) return true;
        if (p.endsWith("following.json")) return true;
        if (p.endsWith("message_1.json")) return true;
        if (p.includes("your_instagram_activity/messages/inbox")) return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: any): any => {
        if (typeof p !== "string") return [];
        if (p === "/mock/data") return ["instagram-test"];
        if (p.includes("followers_and_following")) return ["followers_1.json", "following.json"];
        if (p.includes("inbox")) return ["dave_123", "eve_124"];
        return [];
      });

      mockFs.statSync.mockImplementation((p: any): any => {
        if (typeof p !== "string") return { isDirectory: () => false };
        if (p === "/mock/data/instagram-test") return { isDirectory: () => true };
        if (p.includes("dave_123")) return { isDirectory: () => true };
        if (p.includes("eve_124")) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockFs.readFileSync.mockImplementation((p: any): any => {
        if (typeof p !== "string") return "";
        if (p.endsWith("followers_1.json")) {
          return JSON.stringify([
            { string_list_data: [{ value: "alice", timestamp: 1700000000 }] },
            { string_list_data: [{ value: "bob" }] }, // missing timestamp
          ]);
        }
        if (p.endsWith("following.json")) {
          return JSON.stringify({
            relationships_following: [
              { title: "alice", string_list_data: [{ value: "alice", timestamp: 1700000000 }] },
              { title: "bob", string_list_data: [{ value: "bob", timestamp: 1700000000 }] },
              { title: "carol", string_list_data: [{ value: "carol", timestamp: 1700000000 }] },
              { title: "dave", string_list_data: [{ value: "dave", timestamp: 1700000000 }] },
            ],
          });
        }
        if (p.includes("dave_123/message_1.json")) {
          // Old timestamp
          return JSON.stringify({
            messages: [{ sender_name: "me", timestamp_ms: new Date("2020-01-01").getTime() }],
          });
        }
        if (p.includes("eve_124/message_1.json")) {
          // Recent timestamp
          return JSON.stringify({ messages: [{ sender_name: "me", timestamp_ms: Date.now() }] });
        }
        return "";
      });

      const result = await analyseInteractions();
      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.dataSource).toBe("export");
      expect(result.neverInteracted.map((s) => s.username)).toContain("alice");
      expect(result.neverInteracted.map((s) => s.username)).toContain("bob");

      expect(result.dmSuggestionsMutual.map((s) => s.username)).toContain("alice");

      expect(result.dmSuggestionsNoFollowBack.map((s) => s.username)).toContain("carol");

      expect(result.unfollowCandidates.map((s) => s.username)).toContain("dave");
    });
  });
});
