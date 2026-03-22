"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Plus, Trash2, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useT } from "@/lib/i18n";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  loadCampaigns,
  saveCampaign,
  deleteCampaign,
  createCampaign,
  summarize,
  roi,
  cpe,
} from "@/lib/campaign-store";
import type { Campaign } from "@/lib/campaign-store";

// ─── Form ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  brand: "",
  revenue: "",
  cost: "",
  reach: "",
  engagements: "",
  notes: "",
};

function parseNum(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function formatRoi(r: number): string {
  if (!isFinite(r)) return "∞";
  return `${r >= 0 ? "+" : ""}${r.toFixed(0)}%`;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const swrFetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((r) => r.items ?? []);

export default function CampaignsPage() {
  const { data } = useInstagramData();
  const t = useT();
  const { data: session } = useSession();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: remoteCampaigns } = useSWR<Campaign[]>(
    session?.user?.id ? "/api/user/campaigns" : null,
    swrFetcher
  );

  useEffect(() => {
    if (remoteCampaigns) setCampaigns(remoteCampaigns);
    else if (!session?.user?.id) setCampaigns(loadCampaigns());
  }, [remoteCampaigns, session]);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(c: Campaign) {
    setForm({
      brand: c.brand,
      revenue: String(c.revenue),
      cost: String(c.cost),
      reach: String(c.reach),
      engagements: String(c.engagements),
      notes: c.notes,
    });
    setEditId(c.id);
    setShowForm(true);
  }

  function syncToSupabase(campaign: Campaign) {
    if (!session?.user?.id) return;
    fetch("/api/user/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campaign),
    });
  }

  function handleSave() {
    if (!form.brand.trim()) return;
    let saved: Campaign;
    if (editId) {
      saved = {
        id: editId,
        brand: form.brand.trim(),
        date: campaigns.find((c) => c.id === editId)?.date ?? new Date().toISOString().slice(0, 10),
        revenue: parseNum(form.revenue),
        cost: parseNum(form.cost),
        reach: parseNum(form.reach),
        engagements: parseNum(form.engagements),
        notes: form.notes.trim(),
      };
      saveCampaign(saved);
    } else {
      saved = createCampaign({
        brand: form.brand.trim(),
        revenue: parseNum(form.revenue),
        cost: parseNum(form.cost),
        reach: parseNum(form.reach),
        engagements: parseNum(form.engagements),
        notes: form.notes.trim(),
      });
      saveCampaign(saved);
    }
    syncToSupabase(saved);
    setCampaigns(loadCampaigns());
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditId(null);
  }

  function handleDelete(id: string) {
    deleteCampaign(id);
    if (session?.user?.id) {
      fetch(`/api/user/campaigns?id=${id}`, { method: "DELETE" });
    }
    setCampaigns(loadCampaigns());
    if (editId === id) setShowForm(false);
  }

  const summary = summarize(campaigns);

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold">{t("campaigns.title")}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("campaigns.subtitle")}</p>
          </div>
          <Button onClick={openNew} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            {t("campaigns.new")}
          </Button>
        </div>

        {/* Summary cards */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("campaigns.totalCampaigns")}
              </p>
              <p className="mt-2 text-3xl font-bold">{summary.totalCampaigns}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("campaigns.totalRevenue")}
              </p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("campaigns.avgRoi")}
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  summary.avgRoi >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {formatRoi(summary.avgRoi)}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {editId ? t("campaigns.save") : t("campaigns.new")}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t("campaigns.brand")}
                </label>
                <input
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={t("campaigns.brandPlaceholder")}
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              {(
                [
                  ["revenue", "campaigns.revenue"],
                  ["cost", "campaigns.cost"],
                  ["reach", "campaigns.reach"],
                  ["engagements", "campaigns.engagements"],
                ] as const
              ).map(([field, key]) => (
                <div key={field}>
                  <label className="mb-1 block text-xs text-muted-foreground">{t(key)}</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t("campaigns.notes")}
                </label>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSave} disabled={!form.brand.trim()}>
                {t("campaigns.save")}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t("captions.copy")}
              </Button>
            </div>
          </div>
        )}

        {/* Campaign list */}
        {campaigns.length === 0 && !showForm ? (
          <p className="rounded-xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
            {t("campaigns.empty")}
          </p>
        ) : campaigns.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {[
                    "campaigns.brand",
                    "campaigns.date",
                    "campaigns.revenue",
                    "campaigns.roi",
                    "campaigns.cpe",
                  ].map((k) => (
                    <th
                      key={k}
                      className="px-4 py-2 text-left text-xs font-medium text-muted-foreground first:text-left last:text-right"
                    >
                      {t(k as Parameters<typeof t>[0])}
                    </th>
                  ))}
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {[...campaigns]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((c) => {
                    const r = roi(c.revenue, c.cost);
                    const e = cpe(c.cost, c.engagements);
                    return (
                      <tr
                        key={c.id}
                        className="cursor-pointer border-b border-border/30 last:border-0 hover:bg-muted/10"
                        onClick={() => openEdit(c)}
                      >
                        <td className="px-4 py-3 font-medium">{c.brand}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.date}</td>
                        <td className="px-4 py-3">{formatCurrency(c.revenue)}</td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            r >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {formatRoi(r)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {e === 0 ? "—" : `€${e.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleDelete(c.id);
                            }}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  );
}
