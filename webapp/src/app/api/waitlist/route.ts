import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

const _rlStore = new Map<string, number[]>();
function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const ts = (_rlStore.get(key) ?? []).filter((t) => t > cutoff);
  if (ts.length >= max) return false;
  ts.push(now);
  _rlStore.set(key, ts);
  return true;
}

export const dynamic = "force-dynamic";

const WAITLIST_FILE = path.join(process.cwd(), "..", "data", "waitlist.jsonl");
const ALLOWED_PLANS = ["pro", "agency"] as const;
type Plan = (typeof ALLOWED_PLANS)[number];

interface WaitlistEntry {
  email: string;
  plan: Plan;
  joinedAt: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  // Rate limit: 5 requests per 10 minutes per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`waitlist:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { email, plan } = body as Record<string, unknown>;

  if (typeof email !== "string" || !isValidEmail(email)) {
    return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
  }

  if (!ALLOWED_PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  const entry: WaitlistEntry = {
    email: email.trim().toLowerCase(),
    plan: plan as Plan,
    joinedAt: new Date().toISOString(),
  };

  try {
    // Ensure the data directory exists
    const dir = path.dirname(WAITLIST_FILE);
    fs.mkdirSync(dir, { recursive: true });

    // Append as newline-delimited JSON (one entry per line)
    fs.appendFileSync(WAITLIST_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("Failed to save waitlist entry:", err);
    // Still return success to avoid leaking filesystem details
  }

  return NextResponse.json({ success: true });
}
