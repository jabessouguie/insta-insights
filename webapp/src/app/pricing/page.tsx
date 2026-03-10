import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, XCircle, Sparkles, ArrowRight, Shield, Zap, Building2 } from "lucide-react";
import WaitlistForm from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Tarifs — InstaInsights",
  description:
    "Découvrez les plans InstaInsights : Gratuit, Pro et Agence. Commencez gratuitement, sans carte bancaire.",
};

interface PlanFeature {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  agency: boolean | string;
}

const FEATURES: PlanFeature[] = [
  {
    label: "Dashboard analytics (30/90/365 j)",
    free: true,
    pro: true,
    agency: true,
  },
  {
    label: "Courbe de croissance abonnés",
    free: true,
    pro: true,
    agency: true,
  },
  {
    label: "Insights IA (Gemini / Claude / GPT)",
    free: "3 / mois",
    pro: "Illimités",
    agency: "Illimités",
  },
  {
    label: "Media Kit PDF bilingue FR/EN",
    free: "1 thème",
    pro: "Tous les thèmes",
    agency: "Tous les thèmes",
  },
  {
    label: "Collab Finder",
    free: "5 recherches / mois",
    pro: "Illimitées",
    agency: "Illimitées",
  },
  {
    label: "Suivi des collaborations",
    free: true,
    pro: true,
    agency: true,
  },
  {
    label: "Calendrier éditorial + export iCal",
    free: true,
    pro: true,
    agency: true,
  },
  {
    label: "Générateur carousel & réels IA",
    free: "5 / mois",
    pro: "Illimités",
    agency: "Illimités",
  },
  {
    label: "Export PDF rapports mensuels",
    free: false,
    pro: true,
    agency: true,
  },
  {
    label: "Portfolio multi-créateurs",
    free: false,
    pro: false,
    agency: true,
  },
  {
    label: "Comparaison de performances",
    free: false,
    pro: false,
    agency: true,
  },
  {
    label: "Score qualité d'audience",
    free: false,
    pro: false,
    agency: true,
  },
  {
    label: "Rapports PDF agence mensuels",
    free: false,
    pro: false,
    agency: true,
  },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle className="mx-auto h-4 w-4 text-emerald-400" />;
  if (value === false) return <XCircle className="mx-auto h-4 w-4 text-slate-700" />;
  return <span className="text-xs font-medium text-slate-300">{value}</span>;
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold text-white">
          InstaInsights
        </Link>
        <Link
          href="/creator/dashboard"
          className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          Démarrer gratuitement
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-12 pt-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
          Des plans pour chaque{" "}
          <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            créateur
          </span>
        </h1>
        <p className="text-lg text-slate-400">
          Commencez gratuitement. Passez à Pro quand vous êtes prêt à scaler.
        </p>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
            <div className="mb-5">
              <p className="mb-1 text-sm font-medium text-slate-400">Gratuit</p>
              <p className="text-4xl font-bold text-white">
                0 €<span className="text-base font-normal text-slate-500">/mois</span>
              </p>
              <p className="mt-2 text-sm text-slate-500">Pour démarrer sans engagement</p>
            </div>
            <ul className="mb-8 flex-1 space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                Dashboard analytics complet
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />3 insights IA
                / mois
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />1 thème media
                kit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />5 Collab
                Finder / mois
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                Calendrier éditorial iCal
              </li>
            </ul>
            <Link
              href="/creator/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-500 hover:text-white"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border border-violet-500/60 bg-slate-900/80 p-7 shadow-2xl shadow-violet-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                <Sparkles className="h-3 w-3" />
                Populaire
              </span>
            </div>
            <div className="mb-5">
              <p className="mb-1 text-sm font-medium text-violet-300">Pro</p>
              <div className="flex items-baseline gap-1">
                <p className="text-4xl font-bold text-white">9 €</p>
                <span className="text-base font-normal text-slate-500">/mois</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Pour les créateurs qui scalent</p>
            </div>
            <ul className="mb-8 flex-1 space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                Tout le plan Gratuit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                Insights IA illimités
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                Tous les thèmes media kit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                Collab Finder illimité
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                Carousels & réels IA illimités
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                Export PDF rapports mensuels
              </li>
            </ul>
            <WaitlistForm plan="pro" />
          </div>

          {/* Agency */}
          <div className="flex flex-col rounded-2xl border border-pink-500/30 bg-slate-900/60 p-7">
            <div className="mb-5">
              <div className="mb-1 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-pink-400" />
                <p className="text-sm font-medium text-pink-300">Agence</p>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-4xl font-bold text-white">29 €</p>
                <span className="text-base font-normal text-slate-500">/mois</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Pour les agences d&apos;influence</p>
            </div>
            <ul className="mb-8 flex-1 space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-pink-400" />
                Tout le plan Pro
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-pink-400" />
                Portfolio multi-créateurs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-pink-400" />
                Comparaison de performances
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-pink-400" />
                Score qualité d&apos;audience
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-pink-400" />
                Rapports PDF agence
              </li>
            </ul>
            <WaitlistForm plan="agency" />
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">Comparaison détaillée</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                <th className="px-5 py-4 text-left font-medium text-slate-400">Fonctionnalité</th>
                <th className="px-4 py-4 text-center font-medium text-slate-400">Gratuit</th>
                <th className="px-4 py-4 text-center font-semibold text-violet-300">Pro</th>
                <th className="px-4 py-4 text-center font-medium text-pink-300">Agence</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr
                  key={f.label}
                  className={`border-b border-slate-800/60 ${
                    i % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"
                  }`}
                >
                  <td className="px-5 py-3.5 text-slate-300">{f.label}</td>
                  <td className="px-4 py-3.5 text-center">
                    <FeatureCell value={f.free} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <FeatureCell value={f.pro} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <FeatureCell value={f.agency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">Questions fréquentes</h2>
        <div className="space-y-4">
          {[
            {
              q: "Dois-je fournir une carte bancaire pour le plan Gratuit ?",
              a: "Non. Le plan Gratuit est accessible immédiatement, sans carte bancaire ni engagement.",
            },
            {
              q: "Mes données restent-elles privées ?",
              a: "Oui, 100 %. InstaInsights fonctionne entièrement en local : vos données Instagram ne quittent jamais votre appareil.",
            },
            {
              q: "Quand les plans Pro et Agence seront-ils disponibles ?",
              a: "Les plans payants sont en cours de développement. Rejoignez la liste d'attente pour être notifié en premier et bénéficier d'une offre de lancement.",
            },
            {
              q: "Puis-je annuler à tout moment ?",
              a: "Oui. Les abonnements seront mensuels, sans engagement, résiliables à tout moment depuis votre espace.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="mb-2 font-medium text-white">{q}</p>
              <p className="text-sm text-slate-400">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-16 text-center">
        <div className="rounded-2xl border border-violet-500/20 bg-slate-900/60 p-10">
          <Zap className="mx-auto mb-4 h-8 w-8 text-violet-400" />
          <h2 className="text-2xl font-bold text-white">Commencez gratuitement dès maintenant</h2>
          <p className="mt-3 text-slate-400">
            Aucune carte bancaire requise. Accès immédiat à toutes les fonctionnalités de base.
          </p>
          <Link
            href="/creator/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:bg-violet-500"
          >
            <Sparkles className="h-4 w-4" />
            Accéder au dashboard
          </Link>
        </div>
      </section>

      {/* Trust */}
      <div className="mx-auto mb-12 flex flex-wrap items-center justify-center gap-8 px-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-500" />
          100% local — vos données restent sur votre appareil
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-600">
        <p>
          © {new Date().getFullYear()} InstaInsights
          {" · "}
          <Link href="/" className="underline transition-colors hover:text-slate-400">
            Accueil
          </Link>
          {" · "}
          <Link href="/privacy" className="underline transition-colors hover:text-slate-400">
            Politique de confidentialité
          </Link>
        </p>
      </footer>
    </main>
  );
}
