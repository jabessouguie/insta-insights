import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, ArrowRight, TrendingUp, Shield, Mail, Sparkles } from "lucide-react";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata: Metadata = {
  title: "Tarifs — InstaInsights",
  description:
    "Plans Free, Pro et Agency pour analyser tes données Instagram avec l'IA. Commence gratuitement, sans carte bancaire.",
  openGraph: {
    title: "Tarifs InstaInsights — Free, Pro & Agency",
    description:
      "Plans Free (0€), Pro (9€/mois) et Agency (29€/mois). Analytics Instagram IA, Media Kit PDF, Carousel. Gratuit sans CB.",
    images: [{ url: "/api/og?page=pricing", width: 1200, height: 630 }],
  },
};

// ── Feature comparison table ──────────────────────────────────────────────────

const COMPARISON: {
  category: string;
  rows: {
    feature: string;
    free: boolean | string;
    pro: boolean | string;
    agency: boolean | string;
  }[];
}[] = [
  {
    category: "Analytics",
    rows: [
      { feature: "Dashboard performances", free: true, pro: true, agency: true },
      { feature: "Métriques d'engagement", free: true, pro: true, agency: true },
      { feature: "Analyse d'audience", free: true, pro: true, agency: true },
      { feature: "Historique étendu", free: "30 jours", pro: "Illimité", agency: "Illimité" },
      { feature: "Story Analytics", free: true, pro: true, agency: true },
      { feature: "Reel Analytics", free: true, pro: true, agency: true },
    ],
  },
  {
    category: "Création de contenu IA",
    rows: [
      { feature: "Carrousel IA", free: "5 / mois", pro: "Illimité", agency: "Illimité" },
      { feature: "Générateur de Guide PDF", free: false, pro: true, agency: true },
      { feature: "A/B test de captions", free: "3 / mois", pro: "Illimité", agency: "Illimité" },
      { feature: "Idées de Réels IA", free: true, pro: true, agency: true },
    ],
  },
  {
    category: "Media Kit & Monétisation",
    rows: [
      { feature: "Media Kit PDF", free: "3 thèmes", pro: "10 thèmes", agency: "10 thèmes" },
      { feature: "Générateur de factures", free: true, pro: true, agency: true },
      { feature: "Suivi campagnes & ROI", free: true, pro: true, agency: true },
      { feature: "Référral program", free: true, pro: true, agency: true },
    ],
  },
  {
    category: "Collabs & Partenariats",
    rows: [
      { feature: "Collab Finder IA", free: "3 / mois", pro: "Illimité", agency: "Illimité" },
      { feature: "Génération d'emails IA", free: "3 / mois", pro: "Illimité", agency: "Illimité" },
      { feature: "Suivi des collaborations", free: true, pro: true, agency: true },
      { feature: "Validation des contacts", free: true, pro: true, agency: true },
    ],
  },
  {
    category: "Agence",
    rows: [
      { feature: "Gestion multi-créateurs", free: false, pro: false, agency: "Jusqu'à 20" },
      { feature: "Vue portfolio comparatif", free: false, pro: false, agency: true },
      { feature: "Rapports exportables", free: false, pro: false, agency: true },
      { feature: "Estimation valeur par post", free: false, pro: false, agency: true },
    ],
  },
  {
    category: "Support",
    rows: [
      { feature: "Support email", free: "72h", pro: "24h", agency: "Dédié" },
      { feature: "Mises à jour", free: true, pro: true, agency: true },
      { feature: "Accès bêta fonctionnalités", free: false, pro: true, agency: true },
    ],
  },
];

// ── Cell helper ───────────────────────────────────────────────────────────────

function Cell({ val, highlight }: { val: boolean | string; highlight?: boolean }) {
  if (val === false) {
    return (
      <td className="px-4 py-3 text-center">
        <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
      </td>
    );
  }
  if (val === true) {
    return (
      <td className="px-4 py-3 text-center">
        <Check className={`mx-auto h-4 w-4 ${highlight ? "text-[#ffd953]" : "text-[#5c91a4]"}`} />
      </td>
    );
  }
  return (
    <td
      className={`px-4 py-3 text-center text-xs font-medium ${highlight ? "text-[#ffd953]" : "text-[#5c91a4]"}`}
    >
      {val}
    </td>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#111c1b] text-[#cfcbba]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#111c1b]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffd953]/10">
              <TrendingUp className="h-4 w-4 text-[#ffd953]" />
            </div>
            <span className="text-lg font-bold text-white">InstaInsights</span>
          </Link>
          <Link
            href="/creator/dashboard"
            className="flex items-center gap-1.5 rounded-lg bg-[#ffd953] px-4 py-2 text-sm font-semibold text-[#111c1b] transition-opacity hover:opacity-90"
          >
            Commencer gratuitement
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-16 text-center">
        <div className="relative mx-auto max-w-3xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#ffd953]/5 blur-[100px]" />
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffd953]/20 bg-[#ffd953]/5 px-4 py-1.5 text-sm font-medium text-[#ffd953]">
            <Sparkles className="h-3.5 w-3.5" />
            Aucune carte bancaire requise pour commencer
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">Choisis ton plan</h1>
          <p className="text-[#cfcbba]/60">
            Commence gratuitement et évolue quand ton activité le demande.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {/* Free */}
          <div className="border-white/8 flex flex-col rounded-2xl border bg-white/[0.03] p-7">
            <div className="mb-5">
              <h2 className="mb-1 text-lg font-bold text-white">Free</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">0€</span>
                <span className="text-sm text-[#cfcbba]/50">pour toujours</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#cfcbba]/55">
                Tout ce qu&apos;il faut pour découvrir InstaInsights et analyser ses premières
                données.
              </p>
            </div>
            <Link
              href="/creator/dashboard"
              className="mb-6 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Commencer gratuitement
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <ul className="flex-1 space-y-2.5 text-sm">
              {[
                "Import ZIP Instagram",
                "Dashboard complet",
                "Media Kit (3 thèmes)",
                "Carrousel IA (5/mois)",
                "Story & Reel analytics",
                "Calendrier de publication",
                "Factures & Campagnes ROI",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[#cfcbba]/70">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#5c91a4]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="from-[#ffd953]/8 relative flex flex-col rounded-2xl border border-[#ffd953]/40 bg-gradient-to-b to-transparent p-7 shadow-xl shadow-[#ffd953]/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#ffd953]/30 bg-[#ffd953]/10 px-3 py-0.5 text-xs font-semibold text-[#ffd953]">
              ⭐ Le plus populaire · Bientôt
            </div>
            <div className="mb-5">
              <h2 className="mb-1 text-lg font-bold text-white">Pro</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">9€</span>
                <span className="text-sm text-[#cfcbba]/50">/ mois</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#cfcbba]/55">
                IA illimitée, tous les modules, support prioritaire.
              </p>
            </div>
            <div className="mb-6">
              <WaitlistForm plan="pro" compact />
            </div>
            <ul className="flex-1 space-y-2.5 text-sm">
              {[
                "Tout ce qui est inclus en Free",
                "IA illimitée (carousel, guide, collabs)",
                "10 thèmes Media Kit",
                "Générateur de Guide PDF",
                "A/B test captions illimité",
                "Collab Finder illimité",
                "Accès bêta nouvelles fonctionnalités",
                "Support prioritaire 24h",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[#cfcbba]/70">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#ffd953]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Agency */}
          <div className="border-white/8 flex flex-col rounded-2xl border bg-white/[0.03] p-7">
            <div className="mb-5">
              <h2 className="mb-1 text-lg font-bold text-white">Agency</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">29€</span>
                <span className="text-sm text-[#cfcbba]/50">/ mois</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#cfcbba]/55">
                Pour les agences qui gèrent plusieurs créateurs.
              </p>
            </div>
            <a
              href="mailto:hello@instainsights.app"
              className="mb-6 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              <Mail className="h-3.5 w-3.5" />
              Contacter l&apos;équipe
            </a>
            <ul className="flex-1 space-y-2.5 text-sm">
              {[
                "Tout ce qui est inclus en Pro",
                "Jusqu'à 20 comptes créateurs",
                "Vue portfolio multi-créateurs",
                "Comparaison de performances",
                "Rapports exportables",
                "Estimation de valeur par post",
                "Support dédié",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[#cfcbba]/70">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#5c91a4]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* GDPR badge */}
      <div className="mx-auto flex max-w-5xl justify-center gap-6 px-6 pb-12 text-xs text-[#cfcbba]/40">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          Données 100% locales — aucun upload serveur
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-[#5c91a4]" />
          Annulation à tout moment
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-[#5c91a4]" />
          Sans carte bancaire (Free)
        </div>
      </div>

      {/* Feature comparison table */}
      <section className="border-t border-white/5 bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-white">Comparaison détaillée</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-4 text-left font-medium text-[#cfcbba]/60">
                    Fonctionnalité
                  </th>
                  <th className="px-4 py-4 text-center font-semibold text-white">Free</th>
                  <th className="bg-[#ffd953]/5 px-4 py-4 text-center font-semibold text-[#ffd953]">
                    Pro
                  </th>
                  <th className="px-4 py-4 text-center font-semibold text-[#5c91a4]">Agency</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((section) => (
                  <>
                    <tr key={`cat-${section.category}`} className="border-t border-white/5">
                      <td
                        colSpan={4}
                        className="bg-white/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#5c91a4]"
                      >
                        {section.category}
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-t border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 text-[#cfcbba]/70">{row.feature}</td>
                        <Cell val={row.free} />
                        <Cell val={row.pro} highlight />
                        <Cell val={row.agency} />
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold text-white">Prêt à commencer ?</h2>
        <p className="mb-8 text-sm text-[#cfcbba]/60">
          Le plan Free est permanent. Aucune carte, aucun engagement.
        </p>
        <Link
          href="/creator/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-[#ffd953] px-8 py-4 text-base font-bold text-[#111c1b] shadow-lg shadow-[#ffd953]/20 transition-all hover:scale-[1.02] hover:opacity-90"
        >
          Commencer gratuitement
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-white/[0.02] px-6 py-6 text-center text-xs text-[#cfcbba]/40">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="hover:text-white">
            Accueil
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Confidentialité
          </Link>
          <Link href="/deletion" className="hover:text-white">
            Suppression des données
          </Link>
          <a href="mailto:hello@instainsights.app" className="hover:text-white">
            Contact
          </a>
          <span>© {new Date().getFullYear()} InstaInsights</span>
        </div>
      </footer>
    </div>
  );
}
