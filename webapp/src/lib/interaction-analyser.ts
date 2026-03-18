/**
 * Interaction Analysis Module
 * Analyses Instagram JSON export data to identify:
 * - Followers who have never interacted with your posts
 * - Accounts to DM (you follow, they don't follow back, never interacted)
 * - Accounts to unfollow (you follow, they don't follow back, DM sent > 1 month ago)
 *
 * Only the JSON export format is supported.
 */

import fs from "fs";
import path from "path";
import type { InteractionAnalysis, UnfollowCandidate, DMSuggestion } from "@/types/instagram";
import { isJsonExport } from "@/lib/instagram-json-parser";

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
    const data = readJsonFile<unknown>(path.join(dir, file));
    if (!data) continue;

    const entries = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>).relationships_followers as unknown[]) || [];

    for (const entry of entries) {
      const items = (entry as Record<string, unknown>)?.string_list_data ?? [];
      for (const item of items as Array<{ value?: string; timestamp?: number }>) {
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

  const data = readJsonFile<unknown>(path.join(dir, "following.json"));
  if (!data) return result;

  const arr =
    (data as Record<string, unknown>).relationships_following ?? (Array.isArray(data) ? data : []);

  for (const entry of arr as Array<Record<string, unknown>>) {
    const username = (entry?.title as string | undefined)?.toLowerCase();
    const items = (entry?.string_list_data as Array<{ value?: string; timestamp?: number }>) ?? [];

    for (const item of items) {
      const finalUsername = item.value?.toLowerCase() || username;
      if (!finalUsername) continue;
      result.set(finalUsername, item.timestamp ? new Date(item.timestamp * 1000) : new Date(0));
    }
  }
  return result;
}

// ─── DM record type & JSON DM parser ─────────────────────────────────────────

interface DMRecord {
  username: string;
  lastSentAt: Date;
}

function parseSentDmsJson(exportFolder: string): Map<string, DMRecord> {
  const dms = new Map<string, DMRecord>();
  const inboxDir = path.join(exportFolder, "your_instagram_activity", "messages", "inbox");
  if (!fs.existsSync(inboxDir)) return dms;

  for (const convDir of fs.readdirSync(inboxDir)) {
    const fullPath = path.join(inboxDir, convDir);
    if (!fs.statSync(fullPath).isDirectory()) continue;

    const match = convDir.match(/^(.+)_\d+$/);
    const username = match ? match[1].toLowerCase() : null;
    if (!username) continue;

    const msgFile = path.join(fullPath, "message_1.json");
    const data = readJsonFile<JsonMessageFile>(msgFile);
    if (!data?.messages?.length) continue;

    const latestTs = Math.max(...data.messages.map((m) => m.timestamp_ms));
    const lastDate = new Date(latestTs);

    const existing = dms.get(username);
    if (!existing || existing.lastSentAt.getTime() < lastDate.getTime()) {
      dms.set(username, { username, lastSentAt: lastDate });
    }
  }

  return dms;
}

// ─── Main analysis function ───────────────────────────────────────────────────

/**
 * Analyses Instagram interactions from a local JSON export.
 * Only the JSON export format is supported.
 * @returns {Promise<InteractionAnalysis | null>} Analysis results or null if no valid export found.
 */
export async function analyseInteractions(): Promise<InteractionAnalysis | null> {
  const exportFolder = findExportFolder();
  if (!exportFolder) return null;

  if (!isJsonExport(exportFolder)) {
    console.warn("[interaction-analyser] HTML export detected — only JSON format is supported.");
    return null;
  }

  const ffDir = path.join(exportFolder, "connections", "followers_and_following");
  if (!fs.existsSync(ffDir)) return null;

  const followerMap = parseFollowersJsonAnalyser(exportFolder);
  const followingMap = parseFollowingJsonAnalyser(exportFolder);

  const followerSet = new Set(followerMap.keys());
  const followingSet = new Set(followingMap.keys());
  const followingDates = followingMap;

  // DM inbox = proxy for "has interacted"
  const sentDMs = parseSentDmsJson(exportFolder);
  const interactors = new Set(sentDMs.keys());

  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const neverInteracted: UnfollowCandidate[] = [];
  const dmSuggestionsNoFollowBack: DMSuggestion[] = [];
  const dmSuggestionsMutual: DMSuggestion[] = [];
  const unfollowCandidates: UnfollowCandidate[] = [];

  for (const username of followingSet) {
    const followedSince = followingDates.get(username) ?? new Date(0);
    const profileUrl = `https://www.instagram.com/${username}`;
    const theyFollowBack = followerSet.has(username);
    const neverInteractedWith = !interactors.has(username);
    const hasDmRecord = sentDMs.has(username);
    const dmRecord = sentDMs.get(username);

    if (theyFollowBack) {
      if (neverInteractedWith) {
        neverInteracted.push({ username, followedSince, profileUrl });
      }
      if (!hasDmRecord) {
        dmSuggestionsMutual.push({
          username,
          followedSince,
          profileUrl,
          reason: "Vous vous suivez mutuellement mais n'avez jamais échangé de message",
        });
      }
    } else {
      if (!hasDmRecord) {
        dmSuggestionsNoFollowBack.push({
          username,
          followedSince,
          profileUrl,
          reason: "Vous les suivez mais ils ne vous suivent pas encore — un DM pourrait changer ça",
        });
      } else if (dmRecord && now - dmRecord.lastSentAt.getTime() > ONE_MONTH_MS) {
        unfollowCandidates.push({
          username,
          followedSince,
          profileUrl,
          lastDmSentAt: dmRecord.lastSentAt,
        });
      }
    }
  }

  const byFollowedDesc = (
    a: UnfollowCandidate | DMSuggestion,
    b: UnfollowCandidate | DMSuggestion
  ) => b.followedSince.getTime() - a.followedSince.getTime();

  return {
    neverInteracted: (neverInteracted as (UnfollowCandidate | DMSuggestion)[])
      .sort(byFollowedDesc)
      .slice(0, 200) as UnfollowCandidate[],
    dmSuggestionsNoFollowBack: (dmSuggestionsNoFollowBack as (UnfollowCandidate | DMSuggestion)[])
      .sort(byFollowedDesc)
      .slice(0, 100) as DMSuggestion[],
    dmSuggestionsMutual: (dmSuggestionsMutual as (UnfollowCandidate | DMSuggestion)[])
      .sort(byFollowedDesc)
      .slice(0, 100) as DMSuggestion[],
    unfollowCandidates: (unfollowCandidates as (UnfollowCandidate | DMSuggestion)[])
      .sort(byFollowedDesc)
      .slice(0, 100) as UnfollowCandidate[],
    dataSource: "export" as const,
  };
}

// ─── Graph API path (when export not available) ───────────────────────────────

/**
 * Build an InteractionAnalysis from real Graph API comment data.
 * neverInteracted / unfollowCandidates: not available via API (privacy restriction)
 */
export async function analyseInteractionsFromAPI(
  _token: string,
  _accountId: string
): Promise<InteractionAnalysis> {
  return {
    neverInteracted: [],
    dmSuggestionsNoFollowBack: [],
    dmSuggestionsMutual: [],
    unfollowCandidates: [],
    dataSource: "api" as const,
  };
}
