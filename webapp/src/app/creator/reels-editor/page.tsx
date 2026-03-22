"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Clapperboard,
  Upload,
  X,
  Play,
  Download,
  Loader2,
  Film,
  AlertCircle,
  CheckCircle2,
  Clock,
  Scissors,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useInstagramData } from "@/hooks/useInstagramData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { probeClip, runPipeline, buildCropFilter } from "@/lib/reels-editor/pipeline-manager";
import { resetFFmpeg } from "@/lib/reels-editor/ffmpeg-loader";
import type {
  VideoClipMetadata,
  ReelsEditorConfig,
  ReelsPipelineProgress,
  ReelsPipelineStage,
  ReelsTransition,
  ReelsCutMode,
} from "@/types/instagram";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 150;
const MAX_CLIPS = 6;
const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm", "video/avi", "video/x-msvideo"];

const PIPELINE_STAGES: Array<{ id: ReelsPipelineStage; label: string }> = [
  { id: "loading_ffmpeg", label: "Chargement éditeur" },
  { id: "processing", label: "Traitement clips" },
  { id: "assembling", label: "Assemblage" },
  { id: "exporting", label: "Export final" },
];

const STAGE_ORDER: ReelsPipelineStage[] = [
  "idle",
  "loading_ffmpeg",
  "processing",
  "assembling",
  "exporting",
  "done",
];

const DEFAULT_CONFIG: ReelsEditorConfig = {
  cutMode: "fixed",
  clipDuration: 8,
  silenceThreshold: -30,
  transition: "fade",
  transitionDuration: 0.5,
};

// ─── Clip entry ───────────────────────────────────────────────────────────────

interface ClipEntry {
  id: string;
  file: File;
  metadata: VideoClipMetadata | null;
  probeStatus: "probing" | "ready" | "error";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function stageIndex(stage: ReelsPipelineStage): number {
  return STAGE_ORDER.indexOf(stage);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TransitionButton({
  value,
  current,
  label,
  onClick,
}: {
  value: ReelsTransition;
  current: ReelsTransition;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs transition-colors",
        current === value
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function CutModeButton({
  value,
  current,
  label,
  desc,
  onClick,
}: {
  value: ReelsCutMode;
  current: ReelsCutMode;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
        current === value
          ? "bg-primary/8 border-primary text-foreground"
          : "border-border text-muted-foreground hover:border-primary/40"
      )}
    >
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs opacity-75">{desc}</span>
    </button>
  );
}

function StageIndicator({
  id,
  label,
  currentStage,
}: {
  id: ReelsPipelineStage;
  label: string;
  currentStage: ReelsPipelineStage;
}) {
  const currentIdx = stageIndex(currentStage);
  const thisIdx = stageIndex(id);
  const done = currentIdx > thisIdx && currentStage !== "error";
  const active = currentStage === id;
  const error = currentStage === "error" && active;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
          done
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
            : active && !error
              ? "border-primary bg-primary/20 text-primary"
              : error
                ? "border-red-500 bg-red-500/20 text-red-400"
                : "border-border text-muted-foreground"
        )}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : thisIdx + 1}
      </div>
      <span
        className={cn(
          "text-sm",
          done
            ? "text-emerald-400"
            : active
              ? "font-medium text-foreground"
              : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {active && !error && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-primary" />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReelsEditorPage() {
  const { data: instagramData } = useInstagramData();

  const [clips, setClips] = useState<ClipEntry[]>([]);
  const [config, setConfig] = useState<ReelsEditorConfig>(DEFAULT_CONFIG);
  const [progress, setProgress] = useState<ReelsPipelineProgress>({
    stage: "idle",
    percent: 0,
    message: "",
  });
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke previous output URL on new generation
  useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  // ── File handling ───────────────────────────────────────────────────────────

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (!ACCEPTED.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;
      return true;
    });

    const newEntries: ClipEntry[] = valid.slice(0, MAX_CLIPS).map((f) => ({
      id: `${f.name}-${f.size}`,
      file: f,
      metadata: null,
      probeStatus: "probing" as const,
    }));

    setClips((prev) => [...prev, ...newEntries].slice(0, MAX_CLIPS));

    // Probe metadata for each new entry
    for (const entry of newEntries) {
      try {
        const meta = await probeClip(entry.file);
        setClips((prev) =>
          prev.map((c) => (c.id === entry.id ? { ...c, metadata: meta, probeStatus: "ready" } : c))
        );
      } catch {
        setClips((prev) =>
          prev.map((c) => (c.id === entry.id ? { ...c, probeStatus: "error" } : c))
        );
      }
    }
  }, []);

  const removeClip = (id: string) => setClips((prev) => prev.filter((c) => c.id !== id));

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  // ── Pipeline ────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const readyClips = clips.filter((c) => c.probeStatus === "ready" && c.metadata);
    if (!readyClips.length) return;

    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
    }

    try {
      const url = await runPipeline(
        readyClips.map((c) => c.file),
        readyClips.map((c) => c.metadata!),
        config,
        (p) => setProgress(p)
      );
      setOutputUrl(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setProgress({ stage: "error", percent: 0, message: "", error: msg });
      resetFFmpeg();
    }
  };

  const handleReset = () => {
    setProgress({ stage: "idle", percent: 0, message: "" });
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  };

  const isProcessing =
    progress.stage !== "idle" && progress.stage !== "done" && progress.stage !== "error";

  const readyCount = clips.filter((c) => c.probeStatus === "ready").length;
  const totalDuration = readyCount * config.clipDuration;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header profile={instagramData?.profile} mode="creator" />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Clapperboard className="h-6 w-6 text-violet-400" />
            Éditeur de réels
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline automatique : cadrage 9:16, découpe, assemblage et export Instagram-ready.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ── Left panel: config ──────────────────────────────────────────── */}
          <div className="space-y-5 lg:col-span-2">
            {/* Drop zone */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Film className="h-4 w-4 text-violet-400" />
                  Clips vidéo
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {clips.length}/{MAX_CLIPS}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  MP4, MOV, WebM — max {MAX_FILE_SIZE_MB} MB par clip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 transition-colors",
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                    clips.length >= MAX_CLIPS && "pointer-events-none opacity-40"
                  )}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Glisser des vidéos ici ou <span className="text-primary">parcourir</span>
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />

                {/* Clip list */}
                {clips.length > 0 && (
                  <div className="space-y-1.5">
                    {clips.map((clip, idx) => (
                      <div
                        key={clip.id}
                        className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-xs"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{clip.file.name}</p>
                          {clip.metadata && (
                            <p className="text-muted-foreground">
                              {clip.metadata.width}×{clip.metadata.height} ·{" "}
                              {formatDuration(clip.metadata.duration)}
                              {" · "}
                              {buildCropFilter(
                                clip.metadata.width,
                                clip.metadata.height
                              ).startsWith("crop") && (
                                <span className="text-violet-400/80">→ 9:16</span>
                              )}
                            </p>
                          )}
                          {clip.probeStatus === "probing" && (
                            <p className="text-muted-foreground">Analyse…</p>
                          )}
                          {clip.probeStatus === "error" && (
                            <p className="text-red-400">Format non supporté</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeClip(clip.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Scissors className="h-4 w-4 text-blue-400" />
                  Découpe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cut mode */}
                <div className="grid grid-cols-2 gap-2">
                  <CutModeButton
                    value="fixed"
                    current={config.cutMode}
                    label="Durée fixe"
                    desc="Début du clip"
                    onClick={() => setConfig((c) => ({ ...c, cutMode: "fixed" }))}
                  />
                  <CutModeButton
                    value="silence"
                    current={config.cutMode}
                    label="Coupe silences"
                    desc="Saute l'intro muette"
                    onClick={() => setConfig((c) => ({ ...c, cutMode: "silence" }))}
                  />
                </div>

                {/* Clip duration slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Durée par clip</span>
                    <span className="font-medium text-foreground">{config.clipDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={15}
                    step={1}
                    value={config.clipDuration}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, clipDuration: parseInt(e.target.value) }))
                    }
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5s</span>
                    <span>15s</span>
                  </div>
                </div>

                {/* Estimated total duration */}
                {readyCount > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Durée totale estimée :{" "}
                    <span className="font-medium text-foreground">
                      {formatDuration(totalDuration)}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Transitions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Transition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "none", label: "Aucune" },
                      { value: "fade", label: "Fondu" },
                      { value: "wiperight", label: "Balayage" },
                      { value: "zoomin", label: "Zoom" },
                    ] as Array<{ value: ReelsTransition; label: string }>
                  ).map((t) => (
                    <TransitionButton
                      key={t.value}
                      value={t.value}
                      current={config.transition}
                      label={t.label}
                      onClick={() => setConfig((c) => ({ ...c, transition: t.value }))}
                    />
                  ))}
                </div>

                {config.transition !== "none" && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Durée transition</span>
                      <span className="font-medium">{config.transitionDuration}s</span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={0.8}
                      step={0.1}
                      value={config.transitionDuration}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, transitionDuration: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate button */}
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={readyCount === 0 || isProcessing}
              onClick={handleGenerate}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isProcessing ? "Génération en cours…" : "Générer le reel"}
            </Button>
          </div>

          {/* ── Right panel: progress / result ─────────────────────────────── */}
          <div className="lg:col-span-3">
            {/* Idle empty state */}
            {progress.stage === "idle" && !outputUrl && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Clapperboard className="h-7 w-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Votre reel apparaîtra ici</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Importez des clips et cliquez sur "Générer le reel"
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  {[
                    "Cadrage automatique 9:16",
                    "Découpe des silences ou durée fixe",
                    "Transitions : fondu, balayage ou zoom",
                    "Export MP4 Instagram-ready",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-1.5">
                      <ChevronRight className="h-3 w-3 text-violet-400" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing panel */}
            {isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Génération en cours
                  </CardTitle>
                  <CardDescription className="text-xs">{progress.message}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Overall progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progression globale</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage indicators */}
                  <div className="space-y-3">
                    {PIPELINE_STAGES.map((s) => (
                      <StageIndicator
                        key={s.id}
                        id={s.id}
                        label={s.label}
                        currentStage={progress.stage}
                      />
                    ))}
                  </div>

                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    Le premier lancement télécharge l'éditeur (~30 MB). Les suivants sont
                    instantanés.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Error state */}
            {progress.stage === "error" && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-red-400" />
                  <div>
                    <p className="font-medium text-red-300">Erreur lors de la génération</p>
                    {progress.error && (
                      <p className="mt-1 text-xs text-red-400/80">{progress.error}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Result panel */}
            {outputUrl && progress.stage === "done" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Reel prêt
                    <Badge className="ml-auto bg-emerald-500/20 text-xs text-emerald-400">
                      {readyCount} clip{readyCount > 1 ? "s" : ""} · {formatDuration(totalDuration)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Video preview */}
                  <video
                    src={outputUrl}
                    controls
                    className="max-h-[520px] w-full rounded-lg bg-black"
                    style={{
                      aspectRatio: "9/16",
                      maxWidth: "min(100%, 292px)",
                      margin: "0 auto",
                      display: "block",
                    }}
                  />

                  {/* Actions */}
                  <div className="flex gap-3">
                    <a
                      href={outputUrl}
                      download="reel_instainsights.mp4"
                      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger MP4
                    </a>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      Nouveau reel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
