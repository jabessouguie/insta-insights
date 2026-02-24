/**
 * DM Response Composer
 * Scans the Instagram export for unanswered DM conversations
 * (where the last message was NOT sent by the creator).
 */

import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnansweredDM {
  username: string;
  lastMessage: string;
  lastMessageAt: Date;
  profileUrl: string;
  conversationPath: string; // relative path inside export folder
}

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

// ─── Username extraction ───────────────────────────────────────────────────────

/**
 * Extract the creator's username from personal_information.html.
 * Fallback to the export folder name.
 */
function getCreatorUsername(exportFolder: string): string {
  const piFile = path.join(
    exportFolder,
    "personal_information",
    "personal_information",
    "personal_information.html"
  );
  const $ = loadHtml(piFile);
  if ($) {
    let found = "";
    $("table tr").each((_: number, el: AnyNode) => {
      const label = $(el).find("td").eq(0).text().trim().toLowerCase();
      const value = $(el).find("td").eq(1).text().trim();
      if ((label.includes("username") || label.includes("nom d'utilisateur")) && value) {
        found = value.toLowerCase();
      }
    });
    if (found) return found;
  }
  // Fallback: extract from folder name (instagram-USERNAME-TIMESTAMP)
  const folderName = path.basename(exportFolder);
  const match = folderName.match(/instagram-([^-]+)-/);
  return match ? match[1].toLowerCase() : "unknown";
}

// ─── Parse a single conversation folder ───────────────────────────────────────

interface ParsedMessage {
  sender: string;
  content: string;
  timestamp: Date;
}

function parseConversation(convFolder: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  if (!fs.existsSync(convFolder)) return messages;

  const files = fs
    .readdirSync(convFolder)
    .filter((f) => f.endsWith(".html"))
    .sort(); // message_1.html, message_2.html, etc.

  for (const file of files) {
    const $ = loadHtml(path.join(convFolder, file));
    if (!$) continue;

    // Each message block: sender in <h2 class="_a6-h _a6-i">, content in <div class="_a6-p">,
    // timestamp in <div class="_a6-o">
    $("div._a6-h, div[class*='pam']").each((_: number, el: AnyNode) => {
      const $block = $(el);

      // Try to find sender (h2 sibling or nearby h2)
      let sender = "";
      const $parent = $block.parent();
      $parent.find("h2._a6-h._a6-i, h2[class*='_a6-h']").each((_i: number, h2: AnyNode) => {
        if (!sender) sender = $(h2).text().trim().toLowerCase();
      });
      if (!sender) {
        sender = $block.find("h2").first().text().trim().toLowerCase();
      }

      const content = $block.find("div._a6-p").first().text().trim();
      const timestampText = $block.find("div._a6-o").first().text().trim();

      if (content && sender) {
        const timestamp = timestampText ? new Date(timestampText) : new Date(0);
        messages.push({ sender, content, timestamp });
      }
    });
  }

  // Sort by timestamp ascending
  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Scan DM conversations and return those where the last message
 * was NOT sent by the creator (i.e., the creator hasn't replied).
 */
export function listUnansweredDMs(exportFolder?: string): UnansweredDM[] {
  const folder = exportFolder ?? findExportFolder();
  if (!folder) return [];

  const creatorUsername = getCreatorUsername(folder);

  const inboxDir = path.join(folder, "your_instagram_activity", "messages", "inbox");
  if (!fs.existsSync(inboxDir)) return [];

  const unanswered: UnansweredDM[] = [];

  const convFolders = fs
    .readdirSync(inboxDir)
    .filter((e) => fs.statSync(path.join(inboxDir, e)).isDirectory());

  for (const convFolderName of convFolders) {
    const convPath = path.join(inboxDir, convFolderName);
    const messages = parseConversation(convPath);

    if (messages.length === 0) continue;

    const lastMsg = messages[messages.length - 1];
    // If the last message was sent by the creator, conversation is answered
    if (lastMsg.sender === creatorUsername) continue;
    // Skip very old messages (> 6 months)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    if (lastMsg.timestamp < sixMonthsAgo && lastMsg.timestamp.getTime() > 0) continue;

    // Extract username from folder name (format: username_userid)
    const username = convFolderName.replace(/_\d+$/, "").toLowerCase();

    unanswered.push({
      username,
      lastMessage: lastMsg.content.slice(0, 200),
      lastMessageAt: lastMsg.timestamp,
      profileUrl: `https://instagram.com/${username}`,
      conversationPath: path.relative(folder, convPath),
    });
  }

  // Sort by most recent first
  return unanswered
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
    .slice(0, 100);
}
