"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  plan: "pro" | "agency";
}

const STORAGE_KEY = "insta_waitlist";

function loadWaitlist(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveWaitlist(entry: Record<string, string>): void {
  const existing = loadWaitlist();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...entry }));
}

export default function WaitlistForm({ plan }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Check if already on waitlist for this plan
  const alreadyJoined = (() => {
    if (typeof window === "undefined") return false;
    return !!loadWaitlist()[plan];
  })();

  if (alreadyJoined || status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        Vous êtes sur la liste d&apos;attente&nbsp;!
      </div>
    );
  }

  const label = plan === "pro" ? "Pro" : "Agence";
  const color =
    plan === "pro"
      ? "bg-violet-600 hover:bg-violet-500 shadow-violet-900/40"
      : "bg-pink-600 hover:bg-pink-500 shadow-pink-900/40";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Adresse email invalide.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, plan }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur serveur");
      }

      saveWaitlist({ [plan]: trimmed });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.com"
        className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
        disabled={status === "loading"}
        required
      />
      {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all ${color} disabled:opacity-60`}
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Rejoindre la liste {label}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
