/**
 * Email validation utilities.
 *
 * Performs two-stage validation:
 * 1. RFC-5322 syntax check (regex)
 * 2. DNS MX record lookup — verifies the domain can actually receive mail
 *
 * This prevents hard bounces caused by non-existent or mail-less domains,
 * which damage sender reputation (failed delivery subsystem errors).
 */

import dns from "dns";

export type EmailValidationReason = "format" | "no_mx" | "dns_error" | "valid" | null;

export interface EmailValidationResult {
  valid: boolean | null;
  reason: EmailValidationReason;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Timeout for DNS lookups in milliseconds. */
export const DNS_TIMEOUT_MS = 5000;

/**
 * Validate an email address by checking its syntax and the domain's MX records.
 *
 * Returns:
 * - `{ valid: true, reason: "valid" }` — syntax OK + MX records found
 * - `{ valid: false, reason: "format" }` — malformed syntax
 * - `{ valid: false, reason: "no_mx" }` — domain exists but has no MX records (or doesn't exist)
 * - `{ valid: null, reason: "dns_error" }` — DNS timeout / network unreachable (unknown)
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const trimmed = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, reason: "format" };
  }

  const domain = trimmed.split("@")[1];
  if (!domain) return { valid: false, reason: "format" };

  try {
    const records = await new Promise<dns.MxRecord[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), DNS_TIMEOUT_MS);
      dns.resolveMx(domain, (err, addresses) => {
        clearTimeout(timer);
        if (err) reject(err);
        else resolve(addresses);
      });
    });

    if (records.length === 0) {
      return { valid: false, reason: "no_mx" };
    }
    return { valid: true, reason: "valid" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("ENOTFOUND") ||
      message.includes("ENODATA") ||
      message.includes("ESERVFAIL") ||
      message.includes("ENORECORDS")
    ) {
      return { valid: false, reason: "no_mx" };
    }
    return { valid: null, reason: "dns_error" };
  }
}
