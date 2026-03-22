"use client";

import { getFFmpeg } from "./ffmpeg-loader";
import type {
  VideoClipMetadata,
  ReelsEditorConfig,
  ReelsPipelineProgress,
  ReelsTransition,
} from "@/types/instagram";

// ─── Pure helpers (fully unit-testable, no FFmpeg dependency) ─────────────────

/**
 * Build an FFmpeg crop+scale filter string to convert any aspect ratio to 9:16.
 * Center-crop: trim the wider dimension, then scale to 1080×1920.
 */
export function buildCropFilter(width: number, height: number): string {
  const targetAspect = 9 / 16;
  const srcAspect = width / height;

  if (srcAspect > targetAspect) {
    // Landscape / wider than 9:16 → crop sides
    const cropW = Math.round(height * targetAspect);
    const offsetX = Math.round((width - cropW) / 2);
    return `crop=${cropW}:${height}:${offsetX}:0,scale=1080:1920`;
  } else {
    // Portrait / taller than 9:16 → crop top + bottom
    const cropH = Math.round(width / targetAspect);
    const offsetY = Math.round((height - cropH) / 2);
    return `crop=${width}:${cropH}:0:${offsetY},scale=1080:1920`;
  }
}

/**
 * Parse FFmpeg silencedetect log output into silence intervals.
 */
export function parseSilenceLog(log: string): Array<{ start: number; end: number }> {
  const intervals: Array<{ start: number; end?: number }> = [];

  for (const line of log.split("\n")) {
    const sm = line.match(/silence_start:\s*([\d.]+)/);
    const em = line.match(/silence_end:\s*([\d.]+)/);
    if (sm) {
      intervals.push({ start: parseFloat(sm[1]) });
    } else if (em && intervals.length > 0) {
      const last = intervals[intervals.length - 1]!;
      if (last.end === undefined) last.end = parseFloat(em[1]);
    }
  }

  return intervals.filter((i): i is { start: number; end: number } => i.end !== undefined);
}

/**
 * Return the timestamp (seconds) where audio first becomes active.
 * Skips any leading silence block that starts within 0.1 s of the file start.
 */
export function findActiveStart(silences: Array<{ start: number; end: number }>): number {
  const initial = silences.find((s) => s.start < 0.1);
  return initial ? initial.end : 0;
}

/**
 * Build the FFmpeg argument array for assembling N processed clips.
 * Uses concat filter (no transition) or xfade chain (fade / wiperight / zoomin).
 */
export function buildAssemblyArgs(
  clipFiles: string[],
  durations: number[],
  transition: ReelsTransition,
  transitionDuration: number,
  outputName: string
): string[] {
  const n = clipFiles.length;
  const inputs = clipFiles.flatMap((f) => ["-i", f]);
  const encodeArgs = [
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-r",
    "30",
    outputName,
  ];

  if (n === 1) {
    return ["-i", clipFiles[0]!, ...encodeArgs];
  }

  if (transition === "none") {
    const vStreams = Array.from({ length: n }, (_, i) => `[${i}:v]`).join("");
    const aStreams = Array.from({ length: n }, (_, i) => `[${i}:a]`).join("");
    const fc = `${vStreams}${aStreams}concat=n=${n}:v=1:a=1[outv][outa]`;
    return [...inputs, "-filter_complex", fc, "-map", "[outv]", "-map", "[outa]", ...encodeArgs];
  }

  // xfade chain
  const xfType =
    transition === "fade" ? "fade" : transition === "wiperight" ? "wiperight" : "zoomin";

  const vFilters: string[] = [];
  const aFilters: string[] = [];
  let vLabel = "[0:v]";
  let aLabel = "[0:a]";
  let offset = 0;

  for (let i = 0; i < n - 1; i++) {
    const isLast = i === n - 2;
    const outV = isLast ? "[outv]" : `[v${i}]`;
    const outA = isLast ? "[outa]" : `[a${i}]`;
    offset += durations[i]! - transitionDuration;
    vFilters.push(
      `${vLabel}[${i + 1}:v]xfade=transition=${xfType}:duration=${transitionDuration}:offset=${offset.toFixed(3)}${outV}`
    );
    aFilters.push(`${aLabel}[${i + 1}:a]acrossfade=d=${transitionDuration}${outA}`);
    vLabel = outV;
    aLabel = outA;
  }

  const fc = [...vFilters, ...aFilters].join(";");
  return [...inputs, "-filter_complex", fc, "-map", "[outv]", "-map", "[outa]", ...encodeArgs];
}

// ─── Probe via HTML5 Video API (no FFmpeg needed) ─────────────────────────────

/**
 * Extract duration and dimensions from a video file using the browser's native
 * HTMLVideoElement — fast, no WASM required.
 */
export function probeClip(file: File): Promise<VideoClipMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        name: file.name,
        duration: video.duration,
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        hasAudio: true, // Assumed; AudioContext detection is out of scope for MVP
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Impossible de lire les métadonnées de "${file.name}"`));
    };

    video.preload = "metadata";
    video.src = url;
  });
}

// ─── Pipeline orchestrator ────────────────────────────────────────────────────

/**
 * Run the full video processing pipeline:
 *   1. Load FFmpeg WASM (once, cached)
 *   2. For each clip: detect silence start (optional) → crop 9:16 → trim
 *   3. Assemble clips with optional transition
 *   4. Return a blob:// URL of the final MP4
 */
export async function runPipeline(
  files: File[],
  metas: VideoClipMetadata[],
  config: ReelsEditorConfig,
  onProgress: (p: ReelsPipelineProgress) => void
): Promise<string> {
  // ── Stage 1: Load FFmpeg ──────────────────────────────────────────────────
  onProgress({ stage: "loading_ffmpeg", percent: 0, message: "Chargement de l'éditeur (~30 MB)…" });

  const ffmpeg = await getFFmpeg((pct) =>
    onProgress({ stage: "loading_ffmpeg", percent: pct, message: "Chargement de l'éditeur…" })
  );

  // Capture all FFmpeg log output into a mutable buffer
  const logLines: string[] = [];
  ffmpeg.on("log", ({ message }) => logLines.push(message));

  const processedFiles: string[] = [];
  const processedDurations: number[] = [];

  // ── Stage 2: Process each clip ────────────────────────────────────────────
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const meta = metas[i]!;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const inputName = `input_${i}.${ext}`;
    const outputName = `processed_${i}.mp4`;

    onProgress({
      stage: "processing",
      percent: 5 + Math.round((i / files.length) * 55),
      message: `Traitement clip ${i + 1}/${files.length} — ${meta.name}`,
    });

    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Silence detection pass (optional)
    let startTime = 0;
    if (config.cutMode === "silence") {
      logLines.length = 0;
      try {
        await ffmpeg.exec([
          "-i",
          inputName,
          "-af",
          `silencedetect=noise=${config.silenceThreshold}dB:duration=0.5`,
          "-f",
          "null",
          "-",
        ]);
      } catch {
        // Expected: ffmpeg exits non-zero for -f null, but logs contain the data
      }
      const silences = parseSilenceLog(logLines.join("\n"));
      startTime = findActiveStart(silences);
    }

    // Crop + trim pass
    const cropFilter = buildCropFilter(meta.width, meta.height);
    logLines.length = 0;

    const baseArgs = meta.hasAudio
      ? [
          "-ss",
          startTime.toFixed(3),
          "-i",
          inputName,
          "-t",
          config.clipDuration.toFixed(3),
          "-vf",
          cropFilter,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "26",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-ar",
          "44100",
          "-ac",
          "2",
          outputName,
        ]
      : [
          "-ss",
          startTime.toFixed(3),
          "-i",
          inputName,
          "-f",
          "lavfi",
          "-i",
          "anullsrc=channel_layout=stereo:sample_rate=44100",
          "-map",
          "0:v",
          "-map",
          "1:a",
          "-t",
          config.clipDuration.toFixed(3),
          "-vf",
          cropFilter,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "26",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-shortest",
          outputName,
        ];

    await ffmpeg.exec(baseArgs);
    await ffmpeg.deleteFile(inputName);

    processedFiles.push(outputName);
    processedDurations.push(config.clipDuration);
  }

  // ── Stage 3: Assemble + encode ────────────────────────────────────────────
  onProgress({ stage: "assembling", percent: 65, message: "Assemblage des clips…" });

  const finalName = "final_reel.mp4";
  const assemblyArgs = buildAssemblyArgs(
    processedFiles,
    processedDurations,
    config.transition,
    config.transitionDuration,
    finalName
  );

  await ffmpeg.exec(assemblyArgs);

  for (const f of processedFiles) {
    await ffmpeg.deleteFile(f);
  }

  // ── Stage 4: Read output ──────────────────────────────────────────────────
  onProgress({ stage: "exporting", percent: 92, message: "Préparation du fichier final…" });

  const raw = await ffmpeg.readFile(finalName);
  await ffmpeg.deleteFile(finalName);

  const data = typeof raw === "string" ? new TextEncoder().encode(raw) : (raw as Uint8Array);
  const blob = new Blob([data.buffer.slice(0) as ArrayBuffer], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);

  onProgress({ stage: "done", percent: 100, message: "Reel prêt à télécharger !" });

  return url;
}
