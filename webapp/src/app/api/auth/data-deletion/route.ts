/**
 * Meta / Facebook Data Deletion Callback
 *
 * Required by Meta for apps that use the Instagram Graph API.
 * When a user removes the app from their Facebook settings, Meta sends a
 * signed POST request here. We acknowledge it and return a confirmation URL.
 *
 * Spec: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Signed request format:
 *   base64url(HMAC-SHA256(payload, APP_SECRET)).base64url(payload)
 * Payload JSON: { user_id, algorithm, issued_at }
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://instainsights.app";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64urlDecode(str: string): Buffer {
  // Convert base64url to base64
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

interface SignedPayload {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
}

function parseSignedRequest(signedRequest: string, appSecret: string): SignedPayload | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;

  const [encodedSig, encodedPayload] = parts as [string, string];

  // Verify HMAC-SHA256 signature
  const sig = base64urlDecode(encodedSig);
  const expectedSig = createHmac("sha256", appSecret).update(encodedPayload).digest();

  if (sig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(sig, expectedSig)) return null;

  // Decode payload
  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8")) as SignedPayload;
    if (payload.algorithm?.toUpperCase() !== "HMAC-SHA256") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Generate a short confirmation code from the user_id */
function confirmationCode(userId: string): string {
  const hash = createHmac("sha256", APP_SECRET || "instainsights-deletion")
    .update(userId + Date.now().toString())
    .digest("hex");
  return hash.substring(0, 12);
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    // Meta sends signed_request as application/x-www-form-urlencoded
    const contentType = request.headers.get("content-type") ?? "";
    let signedRequest: string | null = null;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      signedRequest = formData.get("signed_request") as string | null;
    } else if (contentType.includes("application/json")) {
      const json = (await request.json()) as { signed_request?: string };
      signedRequest = json.signed_request ?? null;
    }

    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request parameter" }, { status: 400 });
    }

    // Parse & verify signed request
    let userId = "unknown";
    if (APP_SECRET) {
      const payload = parseSignedRequest(signedRequest, APP_SECRET);
      if (!payload) {
        return NextResponse.json({ error: "Invalid signed_request signature" }, { status: 400 });
      }
      userId = payload.user_id ?? "unknown";
    } else {
      // No secret configured — still acknowledge the request in dev mode
      console.warn(
        "[data-deletion] FACEBOOK_APP_SECRET not set — skipping signature verification (dev mode)"
      );
      // Attempt to decode payload anyway (without verification)
      const parts = signedRequest.split(".");
      if (parts.length === 2) {
        try {
          const raw = JSON.parse(base64urlDecode(parts[1]!).toString("utf8")) as SignedPayload;
          userId = raw.user_id ?? "unknown";
        } catch {
          // ignore decode errors in dev mode
        }
      }
    }

    // ── Data deletion logic ──────────────────────────────────────────────────
    //
    // InstaInsights is a stateless application: user data is stored exclusively
    // in the user's own browser (localStorage) or in their own Instagram export
    // files, NOT on our servers. Therefore:
    //
    //   • We have no server-side database of user data to delete.
    //   • Access tokens are never persisted — they exist only in browser memory
    //     for the duration of the session.
    //   • If the user has data in localStorage, it is cleared automatically
    //     when the browser session ends or manually via the Settings page.
    //
    // We log the request for audit purposes and return the required confirmation.
    console.warn(
      `[data-deletion] Received deletion request for user_id=${userId} at ${new Date().toISOString()}`
    );

    const code = confirmationCode(userId);
    const statusUrl = `${APP_URL}/deletion?id=${code}`;

    // Required response format per Meta spec
    return NextResponse.json(
      {
        url: statusUrl,
        confirmation_code: code,
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[data-deletion] Error processing deletion request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET handler — human-readable info page ───────────────────────────────────

export async function GET(): Promise<Response> {
  return NextResponse.json(
    {
      endpoint: "InstaInsights Data Deletion Callback",
      method: "POST",
      description:
        "This endpoint processes Meta/Facebook data deletion requests. " +
        "Send a POST request with the signed_request parameter from Meta.",
      documentation:
        "https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback",
      privacy_policy: `${APP_URL}/privacy`,
    },
    { status: 200 }
  );
}
