"use client";

import { useState, useEffect, useCallback } from "react";
import { Receipt, Plus, Trash2, Download, CheckCircle2, Send, PlusCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import {
  loadInvoices,
  saveInvoice,
  deleteInvoice,
  createInvoice,
  subtotal,
  totalWithVat,
} from "@/lib/invoice-store";
import type { Invoice, InvoiceItem, InvoiceCurrency } from "@/lib/invoice-store";
import { useT } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: InvoiceCurrency): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function newItem(): InvoiceItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 };
}

const CURRENCIES: InvoiceCurrency[] = ["EUR", "USD", "GBP"];
const VAT_OPTIONS = [0, 5.5, 10, 20];

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "border-border/50 text-muted-foreground",
  sent: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  paid: "border-green-500/30 bg-green-500/10 text-green-400",
};

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormState {
  clientName: string;
  clientEmail: string;
  dueDate: string;
  currency: InvoiceCurrency;
  vatRate: number;
  notes: string;
  items: InvoiceItem[];
}

function defaultForm(): FormState {
  const todayStr = today();
  return {
    clientName: "",
    clientEmail: "",
    dueDate: addDays(todayStr, 30),
    currency: "EUR",
    vatRate: 0,
    notes: "",
    items: [newItem()],
  };
}

// ─── PDF generation (client-side) ────────────────────────────────────────────

async function downloadPdf(invoice: Invoice) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("FACTURE", margin, y);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.invoiceNumber, margin, y + 7);

  // Right block: dates
  const dateLines = [`Date : ${invoice.createdAt}`, `Échéance : ${invoice.dueDate}`];
  dateLines.forEach((line, i) => {
    pdf.text(line, pageWidth - margin, y + i * 6, { align: "right" });
  });

  y += 20;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Client block
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("CLIENT", margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.clientName, margin, y + 6);
  if (invoice.clientEmail) pdf.text(invoice.clientEmail, margin, y + 12);

  y += 24;

  // Items table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, y, contentWidth, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Description", margin + 2, y + 5.5);
  pdf.text("Qté", margin + contentWidth * 0.62, y + 5.5);
  pdf.text("P.U. HT", margin + contentWidth * 0.72, y + 5.5);
  pdf.text("Total HT", margin + contentWidth * 0.88, y + 5.5, { align: "right" });
  y += 10;

  // Items rows
  pdf.setFont("helvetica", "normal");
  invoice.items.forEach((item) => {
    const lineTotal = item.quantity * item.unitPrice;
    pdf.text(item.description || "-", margin + 2, y + 4);
    pdf.text(String(item.quantity), margin + contentWidth * 0.62, y + 4);
    pdf.text(
      new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(item.unitPrice),
      margin + contentWidth * 0.72,
      y + 4
    );
    pdf.text(
      new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(lineTotal),
      margin + contentWidth * 0.88,
      y + 4,
      { align: "right" }
    );
    y += 8;
    pdf.setDrawColor(230);
    pdf.line(margin, y, pageWidth - margin, y);
  });

  y += 6;

  // Totals (right-aligned)
  const sub = subtotal(invoice.items);
  const vatAmt = sub * (invoice.vatRate / 100);
  const total = sub + vatAmt;

  const totals: [string, number][] = [
    ["Sous-total HT", sub],
    [`TVA ${invoice.vatRate}%`, vatAmt],
  ];
  totals.forEach(([label, value]) => {
    pdf.text(
      `${label} : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: invoice.currency }).format(value)}`,
      pageWidth - margin,
      y,
      { align: "right" }
    );
    y += 6;
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(
    `Total TTC : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: invoice.currency }).format(total)}`,
    pageWidth - margin,
    y,
    { align: "right" }
  );

  // Notes
  if (invoice.notes) {
    y += 14;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Notes :", margin, y);
    pdf.setFont("helvetica", "normal");
    const noteLines = pdf.splitTextToSize(invoice.notes, contentWidth);
    pdf.text(noteLines, margin, y + 6);
  }

  pdf.save(`facture-${invoice.invoiceNumber}.pdf`);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicePage() {
  const { data } = useInstagramData();
  const t = useT();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  useEffect(() => {
    setInvoices(loadInvoices());
  }, []);

  const refreshList = useCallback(() => setInvoices(loadInvoices()), []);

  function handleNewInvoice() {
    setForm(defaultForm());
    setEditId(null);
    setShowForm(true);
  }

  function handleEdit(invoice: Invoice) {
    setForm({
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      vatRate: invoice.vatRate,
      notes: invoice.notes,
      items: invoice.items,
    });
    setEditId(invoice.id);
    setShowForm(true);
  }

  function handleSave() {
    if (!form.clientName || form.items.length === 0) return;

    if (editId) {
      const existing = loadInvoices().find((i) => i.id === editId);
      if (existing) {
        saveInvoice({ ...existing, ...form });
      }
    } else {
      const inv = createInvoice(form);
      saveInvoice(inv);
    }
    refreshList();
    setShowForm(false);
    setEditId(null);
  }

  function handleDelete(id: string) {
    deleteInvoice(id);
    refreshList();
  }

  function handleStatusChange(invoice: Invoice, status: Invoice["status"]) {
    saveInvoice({ ...invoice, status });
    refreshList();
  }

  function handleItemChange(idx: number, field: keyof InvoiceItem, value: string | number) {
    setForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  }

  function handleAddItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem()] }));
  }

  function handleRemoveItem(idx: number) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  }

  const formSub = subtotal(form.items);
  const formTotal = totalWithVat(form.items, form.vatRate);

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold">{t("invoice.title")}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("invoice.subtitle")}</p>
          </div>
          <Button onClick={handleNewInvoice} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("invoice.new")}
          </Button>
        </div>

        {/* Create / edit form */}
        {showForm && (
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Client name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("invoice.form.client_name")}
                </label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Client email */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("invoice.form.client_email")}
                </label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("invoice.form.due_date")}
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Currency + VAT */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("invoice.form.currency")}
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, currency: e.target.value as InvoiceCurrency }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("invoice.form.vat_rate")}
                  </label>
                  <select
                    value={form.vatRate}
                    onChange={(e) => setForm((p) => ({ ...p, vatRate: Number(e.target.value) }))}
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {VAT_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}%
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="mt-5">
              <div className="mb-2 grid grid-cols-[1fr_56px_100px_32px] gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>{t("invoice.form.item_desc")}</span>
                <span className="text-center">{t("invoice.form.item_qty")}</span>
                <span className="text-right">{t("invoice.form.item_price")}</span>
                <span />
              </div>
              {form.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="mb-2 grid grid-cols-[1fr_56px_100px_32px] items-center gap-2"
                >
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                    placeholder={t("invoice.form.item_desc")}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value)))
                    }
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleItemChange(idx, "unitPrice", Math.max(0, Number(e.target.value)))
                    }
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-right text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive/70 hover:text-destructive"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={form.items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-1 gap-1.5 text-xs"
                onClick={handleAddItem}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {t("invoice.form.add_item")}
              </Button>
            </div>

            {/* Totals preview */}
            <div className="mt-4 flex justify-end">
              <div className="space-y-1 text-right text-sm">
                <div className="text-muted-foreground">
                  {t("invoice.subtotal")} :{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(formSub, form.currency)}
                  </span>
                </div>
                {form.vatRate > 0 && (
                  <div className="text-muted-foreground">
                    {t("invoice.vat")} {form.vatRate}% :{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(formSub * (form.vatRate / 100), form.currency)}
                    </span>
                  </div>
                )}
                <div className="text-base font-bold text-foreground">
                  {t("invoice.total")} : {formatCurrency(formTotal, form.currency)}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("invoice.form.notes")}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder={t("invoice.form.notes_placeholder")}
                rows={2}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSave} disabled={!form.clientName}>
                {t("invoice.form.save")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
              >
                {t("invoice.form.cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* Invoice list */}
        {invoices.length === 0 && !showForm && (
          <p className="rounded-xl border border-border/40 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("invoice.empty")}
          </p>
        )}

        {invoices.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 text-left">{t("invoice.col.number")}</th>
                  <th className="px-4 py-3 text-left">{t("invoice.col.client")}</th>
                  <th className="px-4 py-3 text-left">{t("invoice.col.date")}</th>
                  <th className="px-4 py-3 text-right">{t("invoice.col.total")}</th>
                  <th className="px-4 py-3 text-center">{t("invoice.col.status")}</th>
                  <th className="px-4 py-3 text-right">{t("invoice.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer border-b border-border/20 hover:bg-muted/20"
                    onClick={() => handleEdit(inv)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-primary">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 font-medium">{inv.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.createdAt}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(totalWithVat(inv.items, inv.vatRate), inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_COLORS[inv.status]}`}
                      >
                        {t(`invoice.status.${inv.status}` as Parameters<typeof t>[0])}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={t("invoice.mark_sent")}
                            onClick={() => handleStatusChange(inv, "sent")}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {inv.status === "sent" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={t("invoice.mark_paid")}
                            onClick={() => handleStatusChange(inv, "paid")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={t("invoice.download_pdf")}
                          onClick={() => void downloadPdf(inv)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                          title={t("invoice.delete")}
                          onClick={() => handleDelete(inv.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
