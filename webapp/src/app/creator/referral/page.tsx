"use client";

import { useState, useEffect } from "react";
import { Gift, Copy, Check, Users, Star } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInstagramData } from "@/hooks/useInstagramData";
import { getOrCreateReferral, addReferral, daysUnlocked } from "@/lib/referral-store";
import type { ReferralData } from "@/lib/referral-store";
import { useT } from "@/lib/i18n";

const REWARD_THRESHOLD = 1; // referrals needed to unlock Pro reward

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
        {step}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const { data } = useInstagramData();
  const t = useT();

  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setReferral(getOrCreateReferral());
  }, []);

  if (!referral) return null;

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/ref/${referral.code}`
      : `https://instainsights.app/ref/${referral.code}`;

  const days = daysUnlocked(referral.referralCount);
  const rewardUnlocked = referral.referralCount >= REWARD_THRESHOLD;

  function copyCode() {
    void navigator.clipboard.writeText(referral!.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  }

  function copyLink() {
    void navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  }

  // Demo helper — simulate a referral registration
  function simulateReferral() {
    setReferral(addReferral(referral!));
  }

  return (
    <div className="min-h-screen bg-background">
      <Header profile={data?.profile} mode="creator" />

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8 md:px-6">
        {/* Page header */}
        <div>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">{t("referral.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("referral.subtitle")}</p>
        </div>

        {/* Referral code card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("referral.yourCode")}
          </p>
          <p className="mb-4 font-mono text-4xl font-bold tracking-widest text-primary">
            {referral.code}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" className="gap-2" onClick={copyCode}>
              {copiedCode ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedCode ? t("referral.copied") : referral.code}
            </Button>
            <Button className="gap-2" onClick={copyLink}>
              {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedLink ? t("referral.copied") : t("referral.copy")}
            </Button>
          </div>
          <p className="mt-3 break-all text-xs text-muted-foreground">{shareLink}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">{t("referral.referrals")}</p>
            </div>
            <p className="mt-2 text-3xl font-bold">{referral.referralCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <Star className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">Pro</p>
            </div>
            <p className="mt-2 text-3xl font-bold">{days}j</p>
            <p className="text-xs text-muted-foreground">débloqués</p>
          </div>
        </div>

        {/* Reward status */}
        <div
          className={`rounded-xl border p-4 text-center text-sm ${
            rewardUnlocked
              ? "border-green-500/30 bg-green-500/5 text-green-400"
              : "border-border/40 bg-muted/20 text-muted-foreground"
          }`}
        >
          {rewardUnlocked ? (
            <div className="flex items-center justify-center gap-2">
              <Star className="h-4 w-4" />
              <span className="font-semibold">{t("referral.rewardUnlocked")}</span>
            </div>
          ) : (
            <span>
              {t("referral.rewardLocked").replace(
                "{n}",
                String(REWARD_THRESHOLD - referral.referralCount)
              )}
            </span>
          )}
        </div>

        {/* How it works */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">{t("referral.howItWorks")}</h2>
          <div className="space-y-3">
            <StepCard step={1} label={t("referral.step1")} />
            <StepCard step={2} label={t("referral.step2")} />
            <StepCard step={3} label={t("referral.step3")} />
          </div>
        </section>

        {/* Demo helper */}
        <div className="rounded-xl border border-dashed border-border/40 p-4 text-center">
          <p className="mb-2 text-xs text-muted-foreground">Mode démo — simule un parrainage</p>
          <Badge
            variant="outline"
            className="cursor-pointer text-xs hover:bg-muted"
            onClick={simulateReferral}
          >
            + Simuler un parrainage
          </Badge>
        </div>
      </main>
    </div>
  );
}
