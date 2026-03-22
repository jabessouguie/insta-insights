/**
 * Unit tests for /api/user/* routes.
 * Mocks `auth()` from @/auth and `getSupabase()` from @/lib/supabase.
 */

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { GET as getCampaigns, POST as postCampaign } from "@/app/api/user/campaigns/route";
import { GET as getInvoices, POST as postInvoice } from "@/app/api/user/invoices/route";
import { GET as getCollabs, POST as postCollab } from "@/app/api/user/collabs/route";
import { GET as getProfile, PUT as putProfile } from "@/app/api/user/profile/route";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

const SESSION = { user: { id: "user-123", name: "Test", email: "test@test.com" } };

function makeRequest(body?: unknown, search?: string): Request {
  const url = `http://localhost/api/user/test${search ? `?${search}` : ""}`;
  return new Request(url, body ? { method: "POST", body: JSON.stringify(body) } : {});
}

function makeSupabase(items: unknown[] = [], error: unknown = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: items[0] ?? null, error }),
    upsert: jest.fn().mockResolvedValue({ error: null }),
    delete: jest.fn().mockReturnThis(),
  };
  // .order() and .eq() return the chain; final call resolves
  (chain.order as jest.Mock).mockResolvedValue({ data: items.map((d) => ({ data: d })), error });
  (chain.delete as jest.Mock).mockReturnValue({
    eq: jest.fn().mockReturnThis(),
    mockResolvedValue: jest.fn().mockResolvedValue({ error: null }),
  });
  // Make delete.eq().eq() resolve
  const deleteEq1 = { eq: jest.fn().mockResolvedValue({ error: null }) };
  (chain.delete as jest.Mock).mockReturnValue({ eq: jest.fn().mockReturnValue(deleteEq1) });
  return { from: jest.fn().mockReturnValue(chain), _chain: chain };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── No auth / no Supabase guards ─────────────────────────────────────────────

describe("auth guard", () => {
  test("GET /api/user/campaigns returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getCampaigns();
    expect(res.status).toBe(401);
  });

  test("GET /api/user/invoices returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getInvoices();
    expect(res.status).toBe(401);
  });

  test("GET /api/user/collabs returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getCollabs();
    expect(res.status).toBe(401);
  });

  test("GET /api/user/profile returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await getProfile();
    expect(res.status).toBe(401);
  });
});

describe("supabase not configured", () => {
  test("GET /api/user/campaigns returns 501 when Supabase not configured", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    mockGetSupabase.mockReturnValue(null);
    const res = await getCampaigns();
    expect(res.status).toBe(501);
  });

  test("GET /api/user/profile returns 501 when Supabase not configured", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    mockGetSupabase.mockReturnValue(null);
    const res = await getProfile();
    expect(res.status).toBe(501);
  });
});

// ─── Campaigns ────────────────────────────────────────────────────────────────

describe("GET /api/user/campaigns", () => {
  test("returns items array when authenticated and Supabase configured", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    const campaign = {
      id: "c1",
      brand: "ACME",
      date: "2025-01-01",
      revenue: 100,
      cost: 50,
      reach: 1000,
      engagements: 50,
      notes: "",
    };
    const sb = makeSupabase([campaign]);
    mockGetSupabase.mockReturnValue(sb as never);

    const res = await getCampaigns();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].brand).toBe("ACME");
  });
});

describe("POST /api/user/campaigns", () => {
  test("upserts campaign and returns success", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    const sb = makeSupabase();
    mockGetSupabase.mockReturnValue(sb as never);

    const campaign = {
      id: "c1",
      brand: "Test",
      date: "2025-01-01",
      revenue: 0,
      cost: 0,
      reach: 0,
      engagements: 0,
      notes: "",
    };
    const req = makeRequest(campaign);
    const res = await postCampaign(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("returns 400 when campaign has no id", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    mockGetSupabase.mockReturnValue(makeSupabase() as never);
    const req = makeRequest({ brand: "No ID" });
    const res = await postCampaign(req);
    expect(res.status).toBe(400);
  });
});

// ─── Invoices ─────────────────────────────────────────────────────────────────

describe("POST /api/user/invoices", () => {
  test("returns 400 when invoice has no id", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    mockGetSupabase.mockReturnValue(makeSupabase() as never);
    const req = makeRequest({ clientName: "Bob" });
    const res = await postInvoice(req);
    expect(res.status).toBe(400);
  });

  test("upserts invoice and returns success", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    mockGetSupabase.mockReturnValue(makeSupabase() as never);
    const inv = {
      id: "inv-1",
      invoiceNumber: "INV-2025-001",
      clientName: "Bob",
      clientEmail: "",
      createdAt: "2025-01-01",
      dueDate: "2025-02-01",
      status: "draft",
      items: [],
      vatRate: 0,
      currency: "EUR",
      notes: "",
    };
    const req = makeRequest(inv);
    const res = await postInvoice(req);
    expect(res.status).toBe(200);
  });
});

// ─── Collabs ──────────────────────────────────────────────────────────────────

describe("POST /api/user/collabs", () => {
  test("returns 400 when collabId is missing", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    mockGetSupabase.mockReturnValue(makeSupabase() as never);
    const req = makeRequest({ collabName: "Test" });
    const res = await postCollab(req);
    expect(res.status).toBe(400);
  });

  test("upserts collab and returns success", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    mockGetSupabase.mockReturnValue(makeSupabase() as never);
    const tracking = { collabId: "c-1", collabName: "Test Brand", status: "not_contacted" };
    const req = makeRequest(tracking);
    const res = await postCollab(req);
    expect(res.status).toBe(200);
  });
});

// ─── Profile ──────────────────────────────────────────────────────────────────

describe("GET /api/user/profile", () => {
  test("returns null profile when no row exists", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    const sb = makeSupabase();
    // Single returns PGRST116 (no rows)
    sb._chain.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockGetSupabase.mockReturnValue(sb as never);

    const res = await getProfile();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile).toBeNull();
  });

  test("returns profile data when row exists", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    const sb = makeSupabase();
    const profileData = {
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@test.com",
      phone: "",
      profilePhotoBase64: "",
      savedAt: "2025-01-01",
    };
    sb._chain.single.mockResolvedValue({ data: { data: profileData }, error: null });
    mockGetSupabase.mockReturnValue(sb as never);

    const res = await getProfile();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.profile?.firstName).toBe("Alice");
  });
});

describe("PUT /api/user/profile", () => {
  test("upserts profile and returns success", async () => {
    mockAuth.mockResolvedValue(SESSION as never);
    mockGetSupabase.mockReturnValue(makeSupabase() as never);
    const profile = {
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@test.com",
      phone: "",
      profilePhotoBase64: "",
      savedAt: "2025-01-01",
    };
    const req = new Request("http://localhost/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
    const res = await putProfile(req);
    expect(res.status).toBe(200);
  });
});
