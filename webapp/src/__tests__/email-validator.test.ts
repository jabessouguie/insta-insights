/**
 * Unit tests for email-validator.ts
 *
 * Covers:
 * - Syntax validation (format checks)
 * - MX record lookup: valid domain, no MX records, non-existent domain
 * - Timeout / network error → dns_error
 * - Edge cases: empty input, missing domain, null values
 */

import dns from "dns";
import { validateEmail } from "@/lib/email-validator";

// ─── Mock dns module ──────────────────────────────────────────────────────────

jest.mock("dns");
const mockResolveMx = dns.resolveMx as jest.MockedFunction<typeof dns.resolveMx>;

function mockMx(records: dns.MxRecord[] | Error) {
  mockResolveMx.mockImplementation((_domain, callback) => {
    if (records instanceof Error) {
      callback(records as NodeJS.ErrnoException, []);
    } else {
      callback(null as unknown as NodeJS.ErrnoException, records);
    }
  });
}

// ─── Syntax validation ────────────────────────────────────────────────────────

describe("validateEmail — syntax", () => {
  it("rejects email without @ symbol", async () => {
    const result = await validateEmail("notanemail");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("format");
  });

  it("rejects email with no domain TLD", async () => {
    const result = await validateEmail("user@domain");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("format");
  });

  it("rejects email starting with @", async () => {
    const result = await validateEmail("@domain.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("format");
  });

  it("rejects empty string", async () => {
    const result = await validateEmail("");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("format");
  });

  it("rejects string with spaces around @", async () => {
    // trimmed internally — but spaces IN the local part are invalid
    const result = await validateEmail("user @domain.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("format");
  });
});

// ─── MX record validation ─────────────────────────────────────────────────────

describe("validateEmail — DNS MX lookup", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns valid=true when MX records exist", async () => {
    mockMx([{ priority: 10, exchange: "mail.example.com" }]);
    const result = await validateEmail("user@example.com");
    expect(result.valid).toBe(true);
    expect(result.reason).toBe("valid");
  });

  it("returns valid=false with no_mx when MX records array is empty", async () => {
    mockMx([]);
    const result = await validateEmail("user@nomx.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("no_mx");
  });

  it("returns valid=false with no_mx on ENOTFOUND (domain does not exist)", async () => {
    const err = Object.assign(new Error("queryMx ENOTFOUND fakexyz12345.com"), {
      code: "ENOTFOUND",
    });
    mockMx(err);
    const result = await validateEmail("user@fakexyz12345.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("no_mx");
  });

  it("returns valid=false with no_mx on ENODATA (domain has no MX records)", async () => {
    const err = Object.assign(new Error("queryMx ENODATA nodns.example.com"), {
      code: "ENODATA",
    });
    mockMx(err);
    const result = await validateEmail("user@nodns.example.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("no_mx");
  });

  it("returns valid=false with no_mx on ESERVFAIL", async () => {
    const err = Object.assign(new Error("queryMx ESERVFAIL"), { code: "ESERVFAIL" });
    mockMx(err);
    const result = await validateEmail("user@broken.example.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("no_mx");
  });

  it("returns valid=null with dns_error on timeout", async () => {
    const err = new Error("timeout");
    mockMx(err);
    const result = await validateEmail("user@slow-dns.com");
    expect(result.valid).toBeNull();
    expect(result.reason).toBe("dns_error");
  });

  it("returns valid=null with dns_error on generic network error", async () => {
    const err = new Error("network unreachable");
    mockMx(err);
    const result = await validateEmail("user@offline.com");
    expect(result.valid).toBeNull();
    expect(result.reason).toBe("dns_error");
  });

  it("normalises email to lowercase before checking domain", async () => {
    mockMx([{ priority: 5, exchange: "mail.gmail.com" }]);
    const result = await validateEmail("User@GMAIL.COM");
    expect(result.valid).toBe(true);
    // Check DNS was called with lowercase domain
    expect(mockResolveMx).toHaveBeenCalledWith("gmail.com", expect.any(Function));
  });
});
