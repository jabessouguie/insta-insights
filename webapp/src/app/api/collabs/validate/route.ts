import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/email-validator";
import type { EmailValidationReason } from "@/lib/email-validator";

export const dynamic = "force-dynamic";

export interface ValidateContactRequest {
  instagramHandle?: string;
  email?: string;
}

export type { EmailValidationReason };

export interface ValidateContactResponse {
  success: boolean;
  emailValid: boolean | null;
  /** Granular reason for the email validation result */
  emailReason: EmailValidationReason;
  instagramValid: boolean | null;
}

async function checkInstagram(handle: string): Promise<boolean | null> {
  const clean = handle.replace(/^@/, "").trim();
  if (!clean) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(clean)}/`, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok || res.status === 301 || res.status === 302;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse<ValidateContactResponse>> {
  try {
    const body: ValidateContactRequest = await request.json();
    const { instagramHandle, email } = body;

    const [emailResult, instagramValid] = await Promise.all([
      email
        ? validateEmail(email)
        : Promise.resolve({ valid: null, reason: null as EmailValidationReason }),
      instagramHandle ? checkInstagram(instagramHandle) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      emailValid: emailResult.valid,
      emailReason: emailResult.reason,
      instagramValid,
    });
  } catch {
    return NextResponse.json(
      { success: false, emailValid: null, emailReason: null, instagramValid: null },
      { status: 500 }
    );
  }
}
