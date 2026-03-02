"use client";

import { useRef, useState } from "react";
import {
  BarChart2,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Lock,
  Send,
  AlertTriangle,
  Star,
  Lightbulb,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useInstagramData } from "@/hooks/useInstagramData";
import type { ExecutiveReport, ReportGenerateResponse } from "@/types/instagram";
import { useT } from "@/lib/i18n";

// ─── NLP Query ────────────────────────────────────────────────────────────────

function QuerySection({ t }: { t: ReturnType<typeof useT> }) {
  const { data } = useInstagramData();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!question.trim() || !data) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: {
            profile: data.profile,
            metrics: data.metrics,
            audienceInsights: data.audienceInsights,
            contentInteractions: data.contentInteractions,
            reachInsights: data.reachInsights,
            recentPosts: data.posts.slice(0, 20).map((p) => ({
              caption: p.caption,
              timestamp: new Date(p.timestamp).toISOString(),
              mediaType: p.mediaType,
              likes: p.likes,
              comments: p.comments,
            })),
          },
        }),
      });
      const json: { success: boolean; answer?: string; error?: string } = await res.json();
      if (json.success && json.answer) {
        setAnswer(json.answer);
      } else {
        setError(json.error ?? t("reports.query.asking"));
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{t("reports.query.title")}</h2>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder={t("reports.query.placeholder")}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <Button
          onClick={handleAsk}
          disabled={!question.trim() || loading || !data}
          size="sm"
          className="gap-2"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("reports.query.ask")}
        </Button>
      </div>

      {answer && (
        <div className="whitespace-pre-wrap rounded-xl bg-muted/40 px-4 py-3 text-sm leading-relaxed">
          {answer}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Executive Report ─────────────────────────────────────────────────────────

function ReportCard({ report, t }: { report: ExecutiveReport; t: ReturnType<typeof useT> }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl bg-muted/40 px-4 py-3">
        <p className="text-sm leading-relaxed text-foreground">{report.executiveSummary}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Key wins */}
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-green-400" />
            <p className="text-xs font-semibold text-green-300">{t("reports.exec.wins")}</p>
          </div>
          <ul className="space-y-1.5">
            {report.keyWins.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                {w}
              </li>
            ))}
          </ul>
        </div>

        {/* Key alerts */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs font-semibold text-amber-300">{t("reports.exec.alerts")}</p>
          </div>
          <ul className="space-y-1.5">
            {report.keyAlerts.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Content + audience */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("reports.exec.content")}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {report.contentPerformance}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("reports.exec.audience")}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{report.audienceTrends}</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold text-primary">{t("reports.exec.reco")}</p>
        </div>
        <ul className="space-y-1.5">
          {report.nextMonthRecommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                {i + 1}
              </span>
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Locked Feature Card ───────────────────────────────────────────────────────

function LockedCard({ title, desc, cta }: { title: string; desc: string; cta: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5">
      <div className="flex items-start gap-3 opacity-40">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <a
        href="/creator/connect"
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
      >
        <Lock className="h-3 w-3" />
        {cta}
      </a>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const t = useT();
  const { data } = useInstagramData();

  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  async function handleGenerate() {
    if (!data) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ReportGenerateResponse = await res.json();
      if (json.success && json.report) {
        setReport(json.report);
      } else {
        setError(json.error ?? "Erreur");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf() {
    if (!reportRef.current || !report) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#0a0a0a",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let y = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();
    while (y < imgHeight) {
      pdf.addImage(imgData, "PNG", 0, -y, pdfWidth, imgHeight);
      y += pageHeight;
      if (y < imgHeight) pdf.addPage();
    }

    const filename = `rapport-${report.period.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    pdf.save(filename);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header mode="creator" />

      <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
        {/* Title */}
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <BarChart2 className="h-5 w-5 text-primary" />
            {t("reports.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("reports.subtitle")}</p>
        </div>

        {/* NLP Query */}
        <QuerySection t={t} />

        {/* Executive Report */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{t("reports.exec.title")}</h2>
            </div>
            <div className="flex gap-2">
              {report && (
                <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2">
                  <Download className="h-3.5 w-3.5" />
                  {t("reports.export_pdf")}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={loading || !data}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("reports.exec.generating")}
                  </>
                ) : (
                  t("reports.exec.generate")
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {report ? (
            <div ref={reportRef} className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold">{report.period}</h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(report.generatedAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <ReportCard report={report} t={t} />
            </div>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("reports.exec.generate")}</p>
            </div>
          ) : null}
        </div>

        {/* Locked features */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fonctionnalités avancées
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <LockedCard
              title={t("reports.locked.skiprate.title")}
              desc={t("reports.locked.skiprate.desc")}
              cta={t("reports.locked.cta")}
            />
            <LockedCard
              title={t("reports.locked.competitive.title")}
              desc={t("reports.locked.competitive.desc")}
              cta={t("reports.locked.cta")}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
