/**
 * Interaction Analysis Module
 * Analyses Instagram export data to identify:
 * - Followers who have never interacted with your posts
 * - Accounts to DM (you follow, they don't follow back, never interacted)
 * - Accounts to unfollow (you follow, they don't follow back, DM sent > 1 month ago)
 *
 * Supports both HTML and JSON Instagram export formats.
 */

import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { InteractionAnalysis, UnfollowCandidate, InstagramFollower } from "@/types/instagram";

// ─── Path helpers ─────────────────────────────────────────────────────────────

function getDataRoot(): string {
  return process.env.INSTAGRAM_DATA_PATH ?? path.join(process.cwd(), "..", "data");
}

function findExportFolder(): string | null {
  const root = getDataRoot();
  if (!fs.existsSync(root)) return null;
  const entries = fs.readdirSync(root);
  const folder = entries.find((e) => {
    const full = path.join(root, e);
    return fs.statSync(full).isDirectory() && e.startsWith("instagram-");
  });
  return folder ? path.join(root, folder) : null;
}

function loadHtml(filePath: string): cheerio.CheerioAPI | null {
  if (!fs.existsSync(filePath)) return null;
  const html = fs.readFileSync(filePath, "utf-8");
  return cheerio.load(html);
}

// ─── Format detection ─────────────────────────────────────────────────────────

function checkIsJsonExport(exportFolder: string): boolean {
  return (
    fs.existsSync(
      path.join(exportFolder, "connections", "followers_and_following", "followers_1.json")
    ) ||
    fs.existsSync(
      path.join(
        exportFolder,
        "personal_information",
        "personal_information",
        "personal_information.json"
      )
    )
  );
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}



interface JsonMessage {
  sender_name: string;
  timestamp_ms: number;
}

interface JsonMessageFile {
  messages?: JsonMessage[];
}

// ─── JSON-format parsers ──────────────────────────────────────────────────────

function parseFollowersJsonAnalyser(exportFolder: string): Map<string, Date> {
  const dir = path.join(exportFolder, "connections", "followers_and_following");
  const result = new Map<string, Date>();
  if (!fs.existsSync(dir)) return result;

  const files = fs.readdirSync(dir).filter((f) => f.startsWith("followers") && f.endsWith(".json"));

  for (const file of files) {
    const data = readJsonFile<any>(path.join(dir, file));
    if (!data) continue;

    // Handle both { relationships_followers: [...] } and top-level [...]
    const entries = Array.isArray(data) ? data : data.relationships_followers || [];

    for (const entry of entries) {
      const items = entry?.string_list_data ?? [];
      for (const item of items) {
        if (!item.value) continue;
        result.set(
          item.value.toLowerCase(),
          item.timestamp ? new Date(item.timestamp * 1000) : new Date(0)
        );
      }
    }
  }
  return result;
}

function parseFollowingJsonAnalyser(exportFolder: string): Map<string, Date> {
  const dir = path.join(exportFolder, "connections", "followers_and_following");
  const result = new Map<string, Date>();
  if (!fs.existsSync(dir)) return result;

  const file = path.join(dir, "following.json");
  const data = readJsonFile<any>(file);
  if (!data) return result;

  // Following JSON usually contains a "relationships_following" key which is an array
  const arr = data.relationships_following || (Array.isArray(data) ? data : []);

  for (const entry of arr) {
    // In following.json, username is usually in "title"
    const username = entry?.title?.toLowerCase();
    const items = entry?.string_list_data ?? [];

    for (const item of items) {
      const finalUsername = item.value?.toLowerCase() || username;
      if (!finalUsername) continue;

      result.set(finalUsername, item.timestamp ? new Date(item.timestamp * 1000) : new Date(0));
    }
  }
  return result;
}

/**
 * Parse DM conversations from JSON export inbox.
 * Returns a Map<username, { username, lastSentAt }> where lastSentAt is the
 * most recent message timestamp in the conversation (regardless of direction).
 * Inbox conversations = ones we're part of (bidirectional or initiated by us).
 */
function parseSentDmsJson(exportFolder: string): Map<string, DMRecord> {
  const dms = new Map<string, DMRecord>();
  const inboxDir = path.join(exportFolder, "your_instagram_activity", "messages", "inbox");
  if (!fs.existsSync(inboxDir)) return dms;

  for (const convDir of fs.readdirSync(inboxDir)) {
    const fullPath = path.join(inboxDir, convDir);
    if (!fs.statSync(fullPath).isDirectory()) continue;

    // Extract username from folder name: {username}_{numeric_id} or just numeric_id
    const match = convDir.match(/^(.+)_\d+$/);
    const username = match ? match[1].toLowerCase() : null;

    // Read the most recent message file
    const msgFile = path.join(fullPath, "message_1.json");
    const data = readJsonFile<JsonMessageFile>(msgFile);
    if (!data?.messages?.length) continue;

    // If folder name didn't give us a username, we could theoretically try to find it in participants,
    // but without knowing the owner's name reliably in all exports, it's hard.
    // However, the folder name pattern usually covers direct DMs.
    if (!username) continue;

    const latestTs = Math.max(...data.messages.map((m) => m.timestamp_ms));
    const lastDate = new Date(latestTs);

    const existing = dms.get(username);
    if (!existing || existing.lastSentAt.getTime() < lastDate.getTime()) {
      dms.set(username, { username, lastSentAt: lastDate });
    }
  }

  return dms;
}

// ─── HTML-format parsers ──────────────────────────────────────────────────────

function parseCommenters(exportFolder: string): Set<string> {
  const commenters = new Set<string>();

  const dirs = [
    path.join(exportFolder, "your_instagram_activity", "comments"),
    path.join(exportFolder, "your_instagram_activity", "media"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html") && f.includes("comment"));
    for (const file of files) {
      const $ = loadHtml(path.join(dir, file));
      if (!$) continue;
      $("div._a706, table tr td a").each((_: number, el: AnyNode) => {
        const text = $(el).text().trim();
        if (text && text.length > 1 && !text.includes(" ")) {
          commenters.add(text.toLowerCase());
        }
      });
    }
  }

  return commenters;
}

function parseLikers(exportFolder: string): Set<string> {
  const likers = new Set<string>();
  const likesDir = path.join(exportFolder, "your_instagram_activity", "likes");
  if (!fs.existsSync(likesDir)) return likers;

  const files = fs.readdirSync(likesDir).filter((f) => f.endsWith(".html"));
  for (const file of files) {
    const $ = loadHtml(path.join(likesDir, file));
    if (!$) continue;
    $("a[href*='instagram.com']").each((_: number, el: AnyNode) => {
      const href = $(el).attr("href") ?? "";
      const match =
        href.match(/instagram\.com\/_u\/([^/?#]+)/) ?? href.match(/instagram\.com\/([^/?#]+)/);
      if (match) likers.add(match[1].toLowerCase());
    });
  }

  return likers;
}

// ─── DM record type & HTML DM parser ──────────────────────────────────────────

interface DMRecord {
  username: string;
  lastSentAt: Date;
}

function parseSentDMs(exportFolder: string): Map<string, DMRecord> {
  const dms = new Map<string, DMRecord>();
  const dmDirs = [
    path.join(exportFolder, "your_instagram_activity", "direct"),
    path.join(exportFolder, "your_instagram_activity", "messages"),
  ];

  for (const dmDir of dmDirs) {
    if (!fs.existsSync(dmDir)) continue;
    const files = fs.readdirSync(dmDir).filter((f) => f.endsWith(".html"));

    for (const file of files) {
      const $ = loadHtml(path.join(dmDir, file));
      if (!$) continue;

      const title = $("title").text().trim().toLowerCase().replace(/\s+/g, "_");
      if (!title || title.includes("group")) continue;

      let lastDate: Date | null = null;
      $("div._a706, table tr").each((_: number, el: AnyNode) => {
        const text = $(el).text().trim();
        const dateMatch = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        if (dateMatch) {
          const d = new Date(dateMatch[0]);
          if (!lastDate || d > lastDate) lastDate = d;
        }
      });

      if (lastDate) {
        const username = title.split("_")[0];
        if (!dms.has(username)) {
          dms.set(username, { username, lastSentAt: lastDate });
        } else {
          const existing = dms.get(username)!;
          if (existing.lastSentAt.getTime() < (lastDate as Date).getTime()) {
            dms.set(username, { username, lastSentAt: lastDate });
          }
        }
      }
    }
  }

  return dms;
}

// ─── French date parser ────────────────────────────────────────────────────────

const FR_MONTHS: Record<string, number> = {
  janv: 0,
  jan: 0,
  janvier: 0,
  févr: 1,
  fév: 1,
  feb: 1,
  février: 1,
  mars: 2,
  mar: 2,
  avr: 3,
  avril: 3,
  mai: 4,
  juin: 5,
  juil: 6,
  juillet: 6,
  août: 7,
  aout: 7,
  sept: 8,
  sep: 8,
  septembre: 8,
  oct: 9,
  octobre: 9,
  nov: 10,
  novembre: 10,
  déc: 11,
  dec: 11,
  décembre: 11,
};

function parseFrDate(text: string): Date | null {
  if (!text) return null;
  const m = text
    .trim()
    .match(/^([a-zéûôàèùâêîäëïöü]+)\.?\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) return null;
  const month = FR_MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  let hour = parseInt(m[4]);
  const min = parseInt(m[5]);
  const ampm = m[6].toLowerCase();
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return new Date(parseInt(m[3]), month, parseInt(m[2]), hour, min);
}

// ─── HTML follower file parser ────────────────────────────────────────────────

function parseFollowerFile(filePath: string): InstagramFollower[] {
  const $ = loadHtml(filePath);
  if (!$) return [];
  const result: InstagramFollower[] = [];

  $("a[href*='instagram.com']").each((_: number, el: AnyNode) => {
    const href = $(el).attr("href") ?? "";
    const match =
      href.match(/instagram\.com\/_u\/([^/?#]+)/) ?? href.match(/instagram\.com\/([^/?#]+)/);
    if (!match) return;
    const username = match[1].toLowerCase();
    if (!username || username.length < 2) return;

    const dateText =
      $(el).parent().next("div").text().trim() ||
      $(el).closest("li, tr").find("div[class*='_a72_']").text().trim();

    result.push({
      username,
      followedAt: parseFrDate(dateText) ?? new Date(0),
      isFollowingBack: false,
      isActive: false,
    });
  });
  return result;
}

// ─── Main analysis function ───────────────────────────────────────────────────

export async function analyseInteractions(): Promise<InteractionAnalysis | null> {
  const exportFolder = findExportFolder();
  if (!exportFolder) return null;

  const ffDir = path.join(exportFolder, "connections", "followers_and_following");
  if (!fs.existsSync(ffDir)) return null;

  const isJson = checkIsJsonExport(exportFolder);

  let followerSet: Set<string>;
  let followerDates: Map<string, Date>;
  let followingSet: Set<string>;
  let followingDates: Map<string, Date>;
  let interactors: Set<string>;
  let sentDMs: Map<string, DMRecord>;

  if (isJson) {
    // ── JSON export ───────────────────────────────────────────────────────────
    const followerMap = parseFollowersJsonAnalyser(exportFolder);
    const followingMap = parseFollowingJsonAnalyser(exportFolder);

    followerSet = new Set(followerMap.keys());
    followerDates = followerMap;
    followingSet = new Set(followingMap.keys());
    followingDates = followingMap;

    // In JSON exports, use inbox conversations as a proxy for "has interacted".
    // Anyone with a DM thread is treated as having been in contact.
    sentDMs = parseSentDmsJson(exportFolder);
    interactors = new Set(sentDMs.keys());
  } else {
    // ── HTML export ───────────────────────────────────────────────────────────
    const followerFiles = fs
      .readdirSync(ffDir)
      .filter((f) => f.startsWith("followers") && f.endsWith(".html"));

    followerSet = new Set<string>();
    followerDates = new Map<string, Date>();
    for (const file of followerFiles) {
      for (const f of parseFollowerFile(path.join(ffDir, file))) {
        followerSet.add(f.username);
        followerDates.set(f.username, f.followedAt);
      }
    }

    followingSet = new Set<string>();
    followingDates = new Map<string, Date>();
    const followingHtml = path.join(ffDir, "following.html");
    if (fs.existsSync(followingHtml)) {
      for (const f of parseFollowerFile(followingHtml)) {
        followingSet.add(f.username);
        followingDates.set(f.username, f.followedAt);
      }
    }

    const commenters = parseCommenters(exportFolder);
    const likers = parseLikers(exportFolder);
    interactors = new Set([...commenters, ...likers]);
    sentDMs = parseSentDMs(exportFolder);
  }

  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Tab 1: mutual follows who have never interacted (liked/commented or DM'd)
  const neverInteracted: UnfollowCandidate[] = [];
  // Tab 2: you follow, they don't follow back, never had any DM conversation
  const dmSuggestions: Array<{
    username: string;
    profileUrl: string;
    followedSince: Date;
    reason: string;
  }> = [];
  // Tab 3: you follow, they don't follow back, last DM > 1 month ago
  const unfollowCandidates: UnfollowCandidate[] = [];

  for (const username of followingSet) {
    const followedSince = followingDates.get(username) ?? new Date(0);
    const profileUrl = `https://www.instagram.com/${username}`;
    const theyFollowBack = followerSet.has(username);
    const neverInteractedWith = !interactors.has(username);

    // Tab 1: mutual follows who never interacted
    if (theyFollowBack && neverInteractedWith) {
      neverInteracted.push({ username, followedSince, profileUrl });
    }

    // Tab 2 + 3: they don't follow back
    if (!theyFollowBack) {
      const dmRecord = sentDMs.get(username);
      if (dmRecord && now - dmRecord.lastSentAt.getTime() > ONE_MONTH_MS) {
        // Conversation exists but last message > 1 month ago → unfollow candidate
        unfollowCandidates.push({
          username,
          followedSince,
          profileUrl,
          lastDmSentAt: dmRecord.lastSentAt,
        });
      } else if (!dmRecord) {
        // No conversation at all → suggest reaching out
        dmSuggestions.push({
          username,
          profileUrl,
          followedSince,
          reason:
            followedSince.getTime() > 0
              ? `Tu suis @${username} depuis le ${followedSince.toLocaleDateString("fr-FR")} mais ils ne te suivent pas en retour`
              : `Tu suis @${username} mais ils ne te suivent pas en retour`,
        });
      }
    }
  }

  const byFollowedDesc = (a: UnfollowCandidate, b: UnfollowCandidate) =>
    b.followedSince.getTime() - a.followedSince.getTime();

  return {
    neverInteracted: neverInteracted.sort(byFollowedDesc).slice(0, 200),
    dmSuggestions: dmSuggestions
      .sort((a, b) => b.followedSince.getTime() - a.followedSince.getTime())
      .slice(0, 50)
      .map((s) => ({ ...s, suggestedDm: "" })),
    unfollowCandidates: unfollowCandidates.sort(byFollowedDesc).slice(0, 100),
  };
}
