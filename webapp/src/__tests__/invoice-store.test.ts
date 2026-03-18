/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for the invoice store module.
 *
 * Covers:
 * - subtotal: line items calculation
 * - totalWithVat: VAT application
 * - generateInvoiceNumber: sequential numbering per year
 * - createInvoice: auto-fields (id, number, date, status)
 * - CRUD: save, load, delete (localStorage mocked)
 */

import {
  subtotal,
  totalWithVat,
  generateInvoiceNumber,
  createInvoice,
  loadInvoices,
  saveInvoice,
  deleteInvoice,
} from "@/lib/invoice-store";
import type { Invoice, InvoiceItem } from "@/lib/invoice-store";

// ─── Setup ────────────────────────────────────────────────────────────────────

let counter = 0;

beforeEach(() => {
  // jsdom provides a working localStorage — clear it between tests
  localStorage.clear();
  counter = 0;
  // jsdom does not expose crypto.randomUUID — polyfill it
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => `test-uuid-${++counter}` },
    configurable: true,
    writable: true,
  });
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeItem(description: string, quantity: number, unitPrice: number): InvoiceItem {
  return { id: "item-1", description, quantity, unitPrice };
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    invoiceNumber: "INV-2024-001",
    createdAt: "2024-03-01",
    dueDate: "2024-03-31",
    status: "draft",
    clientName: "Acme Corp",
    clientEmail: "billing@acme.com",
    items: [makeItem("Post Instagram", 2, 300)],
    vatRate: 20,
    currency: "EUR",
    notes: "",
    ...overrides,
  };
}

// ─── subtotal ─────────────────────────────────────────────────────────────────

describe("subtotal", () => {
  it("returns 0 for empty items", () => {
    expect(subtotal([])).toBe(0);
  });

  it("computes single item correctly", () => {
    expect(subtotal([makeItem("Service", 1, 500)])).toBe(500);
  });

  it("multiplies quantity by unit price", () => {
    expect(subtotal([makeItem("Story", 3, 150)])).toBe(450);
  });

  it("sums multiple items", () => {
    const items = [makeItem("Post", 2, 300), makeItem("Story", 5, 100)];
    expect(subtotal(items)).toBe(1100);
  });

  it("handles zero unit price", () => {
    expect(subtotal([makeItem("Free", 10, 0)])).toBe(0);
  });
});

// ─── totalWithVat ─────────────────────────────────────────────────────────────

describe("totalWithVat", () => {
  it("returns same as subtotal when VAT is 0", () => {
    const items = [makeItem("Service", 1, 1000)];
    expect(totalWithVat(items, 0)).toBe(1000);
  });

  it("applies 20% VAT correctly", () => {
    const items = [makeItem("Service", 1, 1000)];
    expect(totalWithVat(items, 20)).toBe(1200);
  });

  it("applies 5.5% VAT correctly", () => {
    const items = [makeItem("Service", 1, 1000)];
    expect(totalWithVat(items, 5.5)).toBeCloseTo(1055, 2);
  });

  it("returns 0 for empty items regardless of VAT", () => {
    expect(totalWithVat([], 20)).toBe(0);
  });
});

// ─── generateInvoiceNumber ────────────────────────────────────────────────────

describe("generateInvoiceNumber", () => {
  it("returns INV-{year}-001 when no existing invoices", () => {
    const year = new Date().getFullYear();
    expect(generateInvoiceNumber([])).toBe(`INV-${year}-001`);
  });

  it("increments to 002 when one invoice exists for the year", () => {
    const year = new Date().getFullYear();
    const existing: Invoice[] = [makeInvoice({ invoiceNumber: `INV-${year}-001` })];
    expect(generateInvoiceNumber(existing)).toBe(`INV-${year}-002`);
  });

  it("pads number to 3 digits", () => {
    const year = new Date().getFullYear();
    const existing: Invoice[] = Array.from({ length: 9 }, (_, i) =>
      makeInvoice({ invoiceNumber: `INV-${year}-00${i + 1}` })
    );
    expect(generateInvoiceNumber(existing)).toBe(`INV-${year}-010`);
  });

  it("ignores invoices from a different year", () => {
    const year = new Date().getFullYear();
    const existingOtherYear: Invoice[] = [makeInvoice({ invoiceNumber: "INV-2020-001" })];
    expect(generateInvoiceNumber(existingOtherYear)).toBe(`INV-${year}-001`);
  });
});

// ─── createInvoice ────────────────────────────────────────────────────────────

describe("createInvoice", () => {
  it("sets status to draft", () => {
    const inv = createInvoice({
      clientName: "Test",
      clientEmail: "",
      dueDate: "2024-12-31",
      currency: "EUR",
      vatRate: 0,
      notes: "",
      items: [],
    });
    expect(inv.status).toBe("draft");
  });

  it("auto-generates invoice number", () => {
    const year = new Date().getFullYear();
    const inv = createInvoice({
      clientName: "Test",
      clientEmail: "",
      dueDate: "2024-12-31",
      currency: "EUR",
      vatRate: 0,
      notes: "",
      items: [],
    });
    expect(inv.invoiceNumber).toMatch(new RegExp(`^INV-${year}-\\d{3}$`));
  });

  it("sets createdAt to today", () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const inv = createInvoice({
      clientName: "Test",
      clientEmail: "",
      dueDate: "2024-12-31",
      currency: "EUR",
      vatRate: 0,
      notes: "",
      items: [],
    });
    expect(inv.createdAt).toBe(todayStr);
  });

  it("assigns a unique id", () => {
    const inv1 = createInvoice({
      clientName: "A",
      clientEmail: "",
      dueDate: "2024-12-31",
      currency: "EUR",
      vatRate: 0,
      notes: "",
      items: [],
    });
    const inv2 = createInvoice({
      clientName: "B",
      clientEmail: "",
      dueDate: "2024-12-31",
      currency: "EUR",
      vatRate: 0,
      notes: "",
      items: [],
    });
    expect(inv1.id).not.toBe(inv2.id);
  });
});

// ─── CRUD (localStorage) ─────────────────────────────────────────────────────

describe("CRUD operations", () => {
  it("loadInvoices returns [] when storage is empty", () => {
    expect(loadInvoices()).toEqual([]);
  });

  it("saveInvoice persists an invoice", () => {
    const inv = makeInvoice();
    saveInvoice(inv);
    const loaded = loadInvoices();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(inv.id);
  });

  it("saveInvoice updates an existing invoice", () => {
    const inv = makeInvoice();
    saveInvoice(inv);
    const updated = { ...inv, clientName: "Updated Corp" };
    saveInvoice(updated);
    const loaded = loadInvoices();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].clientName).toBe("Updated Corp");
  });

  it("saveInvoice appends a new invoice", () => {
    saveInvoice(makeInvoice({ id: "a" }));
    saveInvoice(makeInvoice({ id: "b" }));
    expect(loadInvoices()).toHaveLength(2);
  });

  it("deleteInvoice removes the correct invoice", () => {
    saveInvoice(makeInvoice({ id: "keep" }));
    saveInvoice(makeInvoice({ id: "remove" }));
    deleteInvoice("remove");
    const loaded = loadInvoices();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("keep");
  });

  it("deleteInvoice on non-existent id leaves list unchanged", () => {
    saveInvoice(makeInvoice({ id: "existing" }));
    deleteInvoice("ghost");
    expect(loadInvoices()).toHaveLength(1);
  });
});
