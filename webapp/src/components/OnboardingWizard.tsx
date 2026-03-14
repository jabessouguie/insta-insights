"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Sparkles,
  UploadCloud,
  LayoutPanelLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Handshake,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isOnboardingCompleted, markStepSeen, completeOnboarding } from "@/lib/onboarding-store";
import { captureEvent } from "@/lib/posthog";

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "welcome" as const,
    label: "Bienvenue",
    icon: Sparkles,
    title: "Bienvenue sur InstaInsights 👋",
    description:
      "La plateforme d'analytics Instagram propulsée par l'IA. Tes données restent 100% locales — aucun accès à ton compte n'est nécessaire.",
    cta: "Commencer",
    items: [
      { icon: LayoutPanelLeft, text: "Génère des carrousels professionnels avec l'IA" },
      { icon: FileText, text: "Crée un Media Kit exportable en PDF" },
      { icon: Handshake, text: "Trouve des collabs et pitche les marques en un clic" },
      { icon: BookOpen, text: "Transforme tes notes en guides PDF structurés" },
    ],
  },
  {
    id: "import" as const,
    label: "Import",
    icon: UploadCloud,
    title: "Importe tes données Instagram",
    description:
      "Pour analyser tes vraies stats, tu as besoin de ton export Instagram. C'est simple et ça prend moins de 2 minutes.",
    cta: "Compris !",
    steps: [
      'Ouvre Instagram → Paramètres → Activité → "Télécharger tes informations"',
      "Sélectionne HTML (pas JSON), toutes les données, clique Envoyer la demande",
      "Instagram t'envoie un email avec un lien (quelques minutes à quelques heures)",
      "Reviens sur InstaInsights et glisse ton fichier ZIP dans le dashboard",
    ],
    note: "💡 Tu peux continuer à explorer avec les données de démonstration en attendant.",
  },
  {
    id: "features" as const,
    label: "Fonctionnalités",
    icon: LayoutPanelLeft,
    title: "Explore les modules",
    description: "InstaInsights a 20+ modules. Voici les incontournables pour commencer.",
    cta: "C'est parti !",
    modules: [
      { href: "/creator/dashboard", label: "Dashboard", desc: "Tes métriques en un coup d'œil" },
      { href: "/creator/carousel", label: "Carrousel IA", desc: "Génère des posts en secondes" },
      { href: "/creator/mediakit", label: "Media Kit", desc: "Impressionne les marques" },
      { href: "/creator/collabs", label: "Collabs", desc: "Trouve et pitche des partenaires" },
    ],
  },
] as const;

// ── Wizard component ──────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isOnboardingCompleted()) {
      const id = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(id);
    }
  }, []);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const handleNext = () => {
    markStepSeen(step.id);
    captureEvent("onboarding_step_completed", { step: step.id, stepIndex });
    if (isLast) {
      completeOnboarding();
      captureEvent("onboarding_completed");
      setOpen(false);
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    captureEvent("onboarding_skipped", { atStep: step.id, stepIndex });
    completeOnboarding();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Onboarding — ${step.title}`}
        className="animate-in zoom-in-95 relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl duration-200"
      >
        {/* Close */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Passer l'introduction"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress dots */}
        <div className="mb-6 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? "w-6 bg-primary"
                  : i < stepIndex
                    ? "w-3 bg-primary/50"
                    : "w-3 bg-muted"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>

        {/* Icon */}
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <step.icon className="h-6 w-6 text-primary" />
        </div>

        {/* Title + description */}
        <h2 className="mb-2 text-lg font-bold">{step.title}</h2>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>

        {/* Step-specific content */}
        {"items" in step && (
          <ul className="mb-5 space-y-2">
            {step.items.map((item) => (
              <li key={item.text} className="flex items-center gap-2.5 text-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                {item.text}
              </li>
            ))}
          </ul>
        )}

        {"steps" in step && (
          <div className="mb-5 space-y-2.5">
            {step.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </div>
                <span className="text-muted-foreground">{s}</span>
              </div>
            ))}
            {"note" in step && (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {step.note}
              </p>
            )}
          </div>
        )}

        {"modules" in step && (
          <div className="mb-5 grid grid-cols-2 gap-2">
            {step.modules.map((mod) => (
              <Link
                key={mod.href}
                href={mod.href}
                onClick={() => completeOnboarding()}
                className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/30 p-3 text-sm transition-colors hover:bg-muted/60"
              >
                <span className="font-medium">{mod.label}</span>
                <span className="text-xs text-muted-foreground">{mod.desc}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Passer
          </button>
          <Button onClick={handleNext} className="gap-1.5">
            {isLast ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {step.cta}
              </>
            ) : (
              <>
                {step.cta}
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
