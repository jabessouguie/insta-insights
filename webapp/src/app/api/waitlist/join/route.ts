import { NextResponse } from "next/server";

interface WaitlistJoinRequest {
  email: string;
  plan?: "pro" | "agency";
}

interface WaitlistJoinResponse {
  success: boolean;
  alreadyRegistered?: boolean;
  error?: string;
}

// In-memory dedup for the current server process (resets on cold start).
// Pair with Resend/DB for persistence in production.
const registeredEmails = new Set<string>();

/**
 * POST /api/waitlist/join
 *
 * Registers an email address on the waitlist.
 * - Validates email format server-side
 * - Deduplicates within the server process lifetime
 * - Ready for Resend email confirmation (add RESEND_API_KEY to .env.local)
 */
export async function POST(req: Request): Promise<NextResponse<WaitlistJoinResponse>> {
  let body: WaitlistJoinRequest;

  try {
    body = (await req.json()) as WaitlistJoinRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête invalide" },
      { status: 400 }
    );
  }

  const { email, plan = "pro" } = body;

  // Server-side email validation
  if (!email || typeof email !== "string") {
    return NextResponse.json({ success: false, error: "Email requis" }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ success: false, error: "Format d'email invalide" }, { status: 400 });
  }
  if (!["pro", "agency"].includes(plan)) {
    return NextResponse.json({ success: false, error: "Plan invalide" }, { status: 400 });
  }

  const normalised = email.trim().toLowerCase();

  if (registeredEmails.has(normalised)) {
    return NextResponse.json({ success: true, alreadyRegistered: true });
  }

  registeredEmails.add(normalised);

  // ── Optional Resend confirmation email ──────────────────────────────────────
  // const resendKey = process.env.RESEND_API_KEY;
  // if (resendKey) {
  //   await fetch("https://api.resend.com/emails", {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       from: "InstaInsights <hello@instainsights.app>",
  //       to: normalised,
  //       subject: "Tu es sur la liste d'attente InstaInsights Pro !",
  //       html: `<p>Merci de rejoindre la liste d'attente du plan ${plan} ...</p>`,
  //     }),
  //   });
  // }

  return NextResponse.json({ success: true, alreadyRegistered: false });
}
