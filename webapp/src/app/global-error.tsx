"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100dvh",
          background: "#111c1b",
          color: "#cfcbba",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          padding: "24px",
          textAlign: "center",
          margin: 0,
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
        >
          ⚠
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", margin: 0 }}>
          Erreur critique
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "rgba(207,203,186,0.6)",
            maxWidth: "320px",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          L&apos;application a rencontré une erreur grave. L&apos;équipe a été notifiée.
          {error.digest && (
            <span
              style={{
                display: "block",
                marginTop: "8px",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                color: "rgba(207,203,186,0.3)",
              }}
            >
              Ref: {error.digest}
            </span>
          )}
        </p>
        <button
          onClick={reset}
          style={{
            background: "#ffd953",
            color: "#111c1b",
            border: "none",
            borderRadius: "12px",
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          ↺ Réessayer
        </button>
      </body>
    </html>
  );
}
