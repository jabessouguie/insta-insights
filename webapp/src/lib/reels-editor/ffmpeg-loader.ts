"use client";

import type { FFmpeg } from "@ffmpeg/ffmpeg";

// ─── Singleton ────────────────────────────────────────────────────────────────

let instance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

const CORE_VERSION = "0.12.6";
const BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

/**
 * Returns a ready-to-use FFmpeg instance (lazy, cached).
 * Downloads the WASM core (~30 MB) on first call.
 *
 * @param onLoadProgress - callback fired while the core is downloading (0–100)
 */
export async function getFFmpeg(onLoadProgress?: (pct: number) => void): Promise<FFmpeg> {
  if (instance) return instance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    if (onLoadProgress) {
      ffmpeg.on("progress", ({ progress }) =>
        onLoadProgress(Math.min(99, Math.round(progress * 100)))
      );
    }

    await ffmpeg.load({
      coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    instance = ffmpeg;
    return ffmpeg;
  })();

  return loadingPromise;
}

/** Force-reset the FFmpeg singleton (useful for error recovery). */
export function resetFFmpeg(): void {
  instance = null;
  loadingPromise = null;
}
