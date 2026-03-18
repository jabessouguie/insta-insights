/** Invoice and devis (quote) management — localStorage persistence. */

const STORAGE_KEY = "instainsights_invoices";

export type InvoiceStatus = "draft" | "sent" | "paid";
export type InvoiceCurrency = "EUR" | "USD" | "GBP";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: string; // "YYYY-MM-DD"
  dueDate: string; // "YYYY-MM-DD"
  status: InvoiceStatus;
  /** Brand or client receiving the invoice */
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  /** VAT rate as a percentage (0, 20, etc.) */
  vatRate: number;
  currency: InvoiceCurrency;
  notes: string;
}

// ─── Calculations ──────────────────────────────────────────────────────────────

/** Sum of (quantity × unitPrice) for all line items. */
export function subtotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

/** Total amount including VAT. */
export function totalWithVat(items: InvoiceItem[], vatRate: number): number {
  return subtotal(items) * (1 + vatRate / 100);
}

// ─── Number generation ─────────────────────────────────────────────────────────

/**
 * Generate the next sequential invoice number for the current year.
 * Format: INV-{YYYY}-{NNN}
 */
export function generateInvoiceNumber(existing: Invoice[]): string {
  const year = new Date().getFullYear();
  const yearPrefix = `INV-${year}-`;
  const count = existing.filter((inv) => inv.invoiceNumber.startsWith(yearPrefix)).length + 1;
  return `${yearPrefix}${String(count).padStart(3, "0")}`;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export function loadInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Invoice[];
  } catch {
    return [];
  }
}

export function saveInvoice(invoice: Invoice): void {
  if (typeof window === "undefined") return;
  const existing = loadInvoices();
  const idx = existing.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) {
    existing[idx] = invoice;
  } else {
    existing.push(invoice);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function deleteInvoice(id: string): void {
  if (typeof window === "undefined") return;
  const existing = loadInvoices().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/** Create a new invoice with auto-generated number and today's date. */
export function createInvoice(
  partial: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "status">
): Invoice {
  const existing = loadInvoices();
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...partial,
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(existing),
    createdAt: today,
    status: "draft",
  };
}
