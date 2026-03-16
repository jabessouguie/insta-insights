"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#111c1b] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Une erreur est survenue</h1>
        <p className="max-w-sm text-sm text-[#cfcbba]/60">
          Quelque chose s&apos;est mal passé. L&apos;équipe a été notifiée automatiquement.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-[#cfcbba]/30">Ref: {error.digest}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl bg-[#ffd953] px-5 py-2.5 text-sm font-semibold text-[#111c1b] transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-[#cfcbba] transition-colors hover:border-white/20 hover:text-white"
        >
          <Home className="h-3.5 w-3.5" />
          Accueil
        </Link>
      </div>
    </div>
  );
}
