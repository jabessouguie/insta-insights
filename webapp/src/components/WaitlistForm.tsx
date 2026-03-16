"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { addToWaitlist, isOnWaitlist } from "@/lib/waitlist-store";
import { captureEvent } from "@/lib/posthog";

interface WaitlistFormProps {
  plan?: "pro" | "agency";
  /** Compact single-line variant (for inline use inside pricing cards) */
  compact?: boolean;
}

type Status = "idle" | "loading" | "success" | "already" | "error";

/**
 * Email capture form for the Pro/Agency waitlist.
 * Calls /api/waitlist/join and stores locally via waitlist-store.
 */
export function WaitlistForm({ plan = "pro", compact = false }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    // Quick client-side check
    if (isOnWaitlist(trimmed)) {
      setStatus("already");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, plan }),
      });
      const json = (await res.json()) as {
        success: boolean;
        alreadyRegistered?: boolean;
        error?: string;
      };

      if (!res.ok || !json.success) {
        setStatus("error");
        setErrorMsg(json.error ?? "Une erreur est survenue");
        return;
      }

      if (json.alreadyRegistered) {
        setStatus("already");
      } else {
        addToWaitlist(trimmed, plan);
        captureEvent("waitlist_joined", { plan });
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Erreur réseau. Réessaie dans quelques instants.");
    }
  };

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-2 text-emerald-400 ${compact ? "text-sm" : "text-base"}`}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Tu es sur la liste ! On te contacte dès le lancement.</span>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div
        className={`flex items-center gap-2 text-[#ffd953] ${compact ? "text-sm" : "text-base"}`}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Tu es déjà inscrit(e) sur la liste d&apos;attente.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`flex ${compact ? "flex-col gap-2" : "flex-col gap-3 sm:flex-row"}`}>
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cfcbba]/40" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            aria-label="Adresse email pour la liste d'attente"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-[#cfcbba]/40 outline-none transition-colors focus:border-[#ffd953]/40 focus:ring-1 focus:ring-[#ffd953]/20 disabled:opacity-50"
            disabled={status === "loading"}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#ffd953] px-5 py-2.5 text-sm font-semibold text-[#111c1b] transition-all hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Rejoindre
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
      {status === "error" && <p className="mt-2 text-xs text-red-400">{errorMsg}</p>}
    </form>
  );
}
