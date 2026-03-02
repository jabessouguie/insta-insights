"use client";

import { useEffect, useRef, useState } from "react";
import { X, Copy, Check, Download, Trash2, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScheduledItem, ContentType } from "@/types/instagram";
import { useT } from "@/lib/i18n";

interface ReadyToPostPanelProps {
  item: ScheduledItem;
  onClose: () => void;
  onPublished: (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_COLORS: Record<ContentType, string> = {
  post: "bg-blue-500/20 text-blue-400",
  carousel: "bg-violet-500/20 text-violet-400",
  story: "bg-pink-500/20 text-pink-400",
  reel: "bg-amber-500/20 text-amber-400",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted transition-colors"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-400" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={copied ? "text-green-400" : "text-muted-foreground"}>
        {copied ? "Copié !" : t("calendar.panel.copy")}
      </span>
    </button>
  );
}

/** Extract first frame from a video data URL as a JPEG data URL */
function useVideoThumbnail(videoSrc: string): string | null {
  const [thumb, setThumb] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoSrc.startsWith("data:video")) return;

    const video = document.createElement("video");
    videoRef.current = video;
    video.muted = true;
    video.preload = "metadata";
    video.crossOrigin = "anonymous";

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 360;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumb(canvas.toDataURL("image/jpeg", 0.8));
    };

    video.src = videoSrc;
  }, [videoSrc]);

  return thumb;
}

function AssetCard({ src, index }: { src: string; index: number }) {
  const isVideo = src.startsWith("data:video");
  const thumbnail = useVideoThumbnail(isVideo ? src : "");

  function download() {
    const ext = isVideo ? "mp4" : "jpg";
    const a = document.createElement("a");
    a.href = src;
    a.download = `asset-${index + 1}.${ext}`;
    a.click();
  }

  return (
    <div className="group relative rounded-lg overflow-hidden ring-1 ring-border">
      {isVideo ? (
        thumbnail ? (
          <img src={thumbnail} alt={`asset ${index + 1}`} className="aspect-square w-full object-cover" />
        ) : (
          <div className="aspect-square w-full flex items-center justify-center bg-muted text-2xl">🎬</div>
        )
      ) : (
        <img src={src} alt={`asset ${index + 1}`} className="aspect-square w-full object-cover" />
      )}
      <button
        onClick={download}
        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Download className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}

export function ReadyToPostPanel({
  item,
  onClose,
  onPublished,
  onDelete,
}: ReadyToPostPanelProps) {
  const t = useT();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const scheduledDate = new Date(item.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  function toggleSticker(sticker: string) {
    setChecklist((prev) => ({ ...prev, [sticker]: !prev[sticker] }));
  }

  function downloadAll() {
    item.assets.forEach((src, i) => {
      const isVideo = src.startsWith("data:video");
      const ext = isVideo ? "mp4" : "jpg";
      const a = document.createElement("a");
      a.href = src;
      a.download = `${item.type}-${item.id}-${i + 1}.${ext}`;
      // Stagger downloads slightly
      setTimeout(() => a.click(), i * 200);
    });
  }

  const allHashtagsText = item.hashtags.join(" ");
  const stickers = item.igInstructions?.stickers ?? [];

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge className={`${TYPE_COLORS[item.type]} border-0 capitalize text-xs`}>
            {item.type}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">{formattedDate}</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 p-4">
        {/* Assets */}
        {item.assets.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("calendar.panel.assets")}
              </h3>
              {item.assets.length > 1 && (
                <button
                  onClick={downloadAll}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Download className="h-3 w-3" />
                  {t("calendar.panel.download")}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {item.assets.map((src, i) => (
                <AssetCard key={i} src={src} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Caption */}
        {item.caption && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("calendar.panel.caption")}
              </h3>
              <CopyButton text={item.caption} />
            </div>
            <textarea
              readOnly
              value={item.caption}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground focus:outline-none"
            />
          </section>
        )}

        {/* Hashtags */}
        {item.hashtags.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hashtags
              </h3>
              <CopyButton text={allHashtagsText} />
            </div>
            <div className="flex flex-wrap gap-1">
              {item.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Checklist */}
        {stickers.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("calendar.panel.checklist")}
            </h3>
            <ul className="space-y-1.5">
              {stickers.map((sticker) => (
                <li
                  key={sticker}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
                  onClick={() => toggleSticker(sticker)}
                >
                  {checklist[sticker] ? (
                    <CheckSquare className="h-4 w-4 text-green-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={`text-xs ${
                      checklist[sticker] ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {sticker}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 border-t border-border bg-card p-4 space-y-2">
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => onPublished(item.id)}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          {t("calendar.panel.published")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Supprimer
        </Button>
      </div>
    </aside>
  );
}
