"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const STEPS = [
  { key: "step1" as const, docsUrl: "https://business.instagram.com/" },
  { key: "step2" as const, docsUrl: "https://developers.facebook.com/apps/" },
  { key: "step3" as const, docsUrl: "https://developers.facebook.com/tools/explorer/" },
  { key: "step4" as const, docsUrl: null },
];

export default function ConnectPage() {
  const t = useT();

  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  const [username, setUsername] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("ig_access_token");
      const storedId = localStorage.getItem("ig_account_id");
      const storedUser = localStorage.getItem("ig_username");
      if (storedToken && storedId) {
        setIsConnected(true);
        setUsername(storedUser ?? null);
      }
    }
  }, []);

  async function handleValidate() {
    if (!token.trim() || !accountId.trim()) return;
    setStatus("validating");
    setErrorMsg("");
    try {
      const res = await fetch("/api/instagram/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), accountId: accountId.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        localStorage.setItem("ig_access_token", token.trim());
        localStorage.setItem("ig_account_id", accountId.trim());
        localStorage.setItem("ig_username", json.username ?? "");
        setUsername(json.username ?? null);
        setIsConnected(true);
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(json.error ?? t("connect.error"));
      }
    } catch {
      setStatus("error");
      setErrorMsg(t("connect.error"));
    }
  }

  function handleDisconnect() {
    localStorage.removeItem("ig_access_token");
    localStorage.removeItem("ig_account_id");
    localStorage.removeItem("ig_username");
    setIsConnected(false);
    setUsername(null);
    setToken("");
    setAccountId("");
    setStatus("idle");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header mode="creator" />

      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        {/* Title */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("connect.title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("connect.subtitle")}</p>
        </div>

        {/* Connected state */}
        {isConnected ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-400" />
            <p className="mb-1 text-sm font-semibold text-green-300">{t("connect.success")}</p>
            {username && <p className="mb-4 text-xs text-muted-foreground">@{username}</p>}
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDisconnect} className="gap-2">
                <Link2Off className="h-3.5 w-3.5" />
                {t("connect.disconnect")}
              </Button>
              <Button size="sm" asChild className="gap-2">
                <a href="/creator/dashboard">
                  <Link2 className="h-3.5 w-3.5" />
                  Dashboard
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Steps */}
            <div className="mb-8 space-y-4">
              {STEPS.map((step, i) => (
                <div
                  key={step.key}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {i < 3 ? (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-primary/60" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {i + 1}. {t(`connect.${step.key}.title` as Parameters<typeof t>[0])}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(`connect.${step.key}.desc` as Parameters<typeof t>[0])}
                    </p>
                    {step.docsUrl && (
                      <a
                        href={step.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Ouvrir <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Token form */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <div>
                <label
                  htmlFor="ig-token"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  {t("connect.token.label")}
                </label>
                <textarea
                  id="ig-token"
                  rows={3}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t("connect.token.placeholder")}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label
                  htmlFor="ig-account-id"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  {t("connect.accountId.label")}
                </label>
                <input
                  id="ig-account-id"
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder={t("connect.accountId.placeholder")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("connect.howToGet")}{" "}
                  <a
                    href="https://developers.facebook.com/tools/explorer/?method=GET&path=me%3Ffields%3Did%2Cusername&version=v22.0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Graph API Explorer →
                  </a>
                </p>
              </div>

              {status === "error" && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errorMsg}
                </p>
              )}

              <Button
                onClick={handleValidate}
                disabled={!token.trim() || !accountId.trim() || status === "validating"}
                className="w-full gap-2"
              >
                {status === "validating" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("connect.validating")}
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    {t("connect.validate")}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
