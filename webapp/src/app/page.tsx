import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";
import {
  BarChart3,
  Building2,
  User,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  FileText,
  Users,
  BookOpen,
  Hash,
  Check,
  ArrowRight,
  Star,
  LayoutPanelLeft,
  Handshake,
  Mail,
} from "lucide-react";

// ── Pricing data ──────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Free",
    price: "0€",
    period: "pour toujours",
    description: "Parfait pour découvrir InstaInsights et analyser tes premières données.",
    cta: "Commencer gratuitement",
    href: "/creator/dashboard",
    highlight: false,
    badge: undefined as string | undefined,
    features: [
      "Import ZIP Instagram",
      "Dashboard analytics complet",
      "Media Kit (3 thèmes)",
      "Carousel IA (5/mois)",
      "Analyse d'audience",
      "Calendrier de publication",
    ],
  },
  {
    name: "Pro",
    price: "9€",
    period: "/ mois",
    description: "Pour les créateurs qui veulent passer à la vitesse supérieure avec l'IA.",
    cta: "Rejoindre la liste d'attente",
    href: "#waitlist",
    highlight: true,
    badge: "Bientôt disponible",
    features: [
      "Tout ce qui est inclus en Free",
      "IA illimitée (carousel, guide, collabs)",
      "10 thèmes Media Kit",
      "Générateur de Guide PDF",
      "Suivi de collabs avancé",
      "A/B test de captions",
      "Analyse de hashtags",
      "Campagnes & ROI",
      "Support prioritaire 24h",
    ],
  },
  {
    name: "Agency",
    price: "29€",
    period: "/ mois",
    description: "Pour les agences qui gèrent plusieurs créateurs et ont besoin de reporting.",
    cta: "Contacter l'équipe",
    href: "mailto:hello@instainsights.app",
    highlight: false,
    badge: undefined as string | undefined,
    features: [
      "Tout ce qui est inclus en Pro",
      "Jusqu'à 20 comptes créateurs",
      "Vue portfolio multi-créateurs",
      "Comparaison de performances",
      "Rapports exportables",
      "Estimation de valeur par post",
      "Support dédié",
    ],
  },
];

// ── Feature list ──────────────────────────────────────────────────────────────

const FEATURES: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  color: string;
  bg: string;
}[] = [
  {
    icon: BarChart3,
    title: "Analytics avancées",
    desc: "Engagement, portée, reach, taux de croissance — tout en un coup d'œil avec des graphiques interactifs.",
    color: "text-[#ffd953]",
    bg: "bg-[#ffd953]/10",
  },
  {
    icon: Sparkles,
    title: "IA multi-provider",
    desc: "Gemini, Anthropic, OpenAI ou Ollama en local. L'IA génère captions, carrousels, guides et analyses d'audience.",
    color: "text-[#5c91a4]",
    bg: "bg-[#5c91a4]/10",
  },
  {
    icon: LayoutPanelLeft,
    title: "Générateur de carrousel",
    desc: "Carrousels Instagram complets avec texte et mise en page IA. Ciblage audience personnalisé ou optimisé.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    icon: FileText,
    title: "Media Kit professionnel",
    desc: "10 thèmes visuels, export PDF print-ready, statistiques en temps réel, section collaborations.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Handshake,
    title: "Collab Finder",
    desc: "L'IA suggère des marques alignées à ta niche. Génère emails et DMs personnalisés, suit chaque collaboration.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    icon: BookOpen,
    title: "Guide PDF generator",
    desc: "Transforme tes notes en guide structuré et imprimable. Sections IA, photos intégrées, export en un clic.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: Hash,
    title: "Hashtag Tracker",
    desc: "Analyse la performance de tes hashtags et reçois des suggestions IA pour maximiser la découvrabilité.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: Users,
    title: "Vue Agence",
    desc: "Portfolio multi-créateurs, comparaison de performances, score qualité d'audience et estimation de valeur.",
    color: "text-[#ffd953]",
    bg: "bg-[#ffd953]/10",
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Comment fonctionne l'import des données ?",
    a: "Tu télécharges ton export Instagram depuis l'app officielle (Paramètres → Activité → Télécharger tes informations), puis tu glisses le fichier ZIP dans InstaInsights. Tout est traité localement — tes données ne quittent jamais ton navigateur.",
  },
  {
    q: "Est-ce vraiment 100% RGPD et privé ?",
    a: "Oui. Le parsing HTML de ton export se fait côté client (navigateur). Aucun fichier n'est envoyé à nos serveurs. Seules les requêtes IA (optionnelles) transitent par notre API sécurisée, sans stocker tes données personnelles.",
  },
  {
    q: "Ai-je besoin d'une clé API IA pour utiliser la plateforme ?",
    a: "Non. La plateforme fonctionne entièrement sans clé IA grâce au mode démo et aux données mockées. La clé Gemini (gratuite) débloque les fonctionnalités IA avancées.",
  },
  {
    q: "Quelle est la différence entre le plan Pro et Agency ?",
    a: "Pro est pour un créateur individuel avec accès IA illimité. Agency permet de gérer jusqu'à 20 comptes créateurs depuis une interface portfolio, avec reporting comparatif entre créateurs.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#111c1b] text-[#cfcbba]">
      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#111c1b]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffd953]/10">
              <TrendingUp className="h-4 w-4 text-[#ffd953]" />
            </div>
            <span className="text-lg font-bold text-white">InstaInsights</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-[#cfcbba]/70 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Fonctionnalités
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Tarifs
            </a>
            <a href="#faq" className="transition-colors hover:text-white">
              FAQ
            </a>
          </div>
          <Link
            href="/creator/dashboard"
            className="flex items-center gap-1.5 rounded-lg bg-[#ffd953] px-4 py-2 text-sm font-semibold text-[#111c1b] transition-opacity hover:opacity-90"
          >
            Commencer gratuitement
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center md:pt-32">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#ffd953]/5 blur-[120px]" />
          <div className="bg-[#5c91a4]/8 absolute left-1/4 top-1/3 h-[300px] w-[400px] rounded-full blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ffd953]/20 bg-[#ffd953]/5 px-4 py-1.5 text-sm font-medium text-[#ffd953]">
            <Sparkles className="h-3.5 w-3.5" />
            Alimenté par Gemini AI · 100% RGPD · Gratuit sans CB
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Analytics Instagram
            <br />
            <span className="gradient-text">propulsées par l&apos;IA</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[#cfcbba]/70 md:text-xl">
            Transforme ton export Instagram en insights actionnables. Crée des carrousels, Media
            Kits et guides professionnels — sans donner accès à ton compte.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/creator/dashboard"
              className="flex items-center gap-2 rounded-xl bg-[#ffd953] px-6 py-3.5 text-base font-semibold text-[#111c1b] shadow-lg shadow-[#ffd953]/20 transition-all hover:scale-[1.02] hover:opacity-90"
            >
              <User className="h-4 w-4" />
              Vue Créateur
            </Link>
            <Link
              href="/agency/dashboard"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
            >
              <Building2 className="h-4 w-4" />
              Vue Agence
            </Link>
          </div>

          {/* Trust row */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[#cfcbba]/50">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              Données 100% locales
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#ffd953]" />
              Aucune connexion Instagram requise
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-[#5c91a4]" />
              Export ZIP natif Instagram
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-white/5 bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-10 text-sm font-semibold uppercase tracking-widest text-[#5c91a4]">
            Comment ça marche
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Exporte tes données",
                desc: 'Télécharge ton fichier ZIP depuis Instagram → Paramètres → "Télécharger tes informations".',
              },
              {
                n: "02",
                title: "Importe dans l'app",
                desc: "Glisse ton ZIP dans InstaInsights. Le parsing se fait dans ton navigateur — aucun upload serveur.",
              },
              {
                n: "03",
                title: "Analyse & crée",
                desc: "Explore tes analytics, génère du contenu avec l'IA, et exporte ton Media Kit en PDF.",
              },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ffd953]/10 text-lg font-black text-[#ffd953]">
                  {step.n}
                </div>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#cfcbba]/60">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#5c91a4]">
              Fonctionnalités
            </p>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Tout ce dont un créateur a besoin
            </h2>
            <p className="mt-3 text-[#cfcbba]/60">
              20+ modules couvrant analytics, création de contenu, monétisation et gestion de
              collabs.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className={`mb-4 inline-flex rounded-lg p-2.5 ${f.bg}`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-white">{f.title}</h3>
                <p className="text-xs leading-relaxed text-[#cfcbba]/55">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Creator vs Agency ── */}
      <section className="border-y border-white/5 bg-white/[0.02] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Créateur ou Agence — InstaInsights s&apos;adapte
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Creator */}
            <div className="group relative overflow-hidden rounded-2xl border border-[#ffd953]/20 bg-gradient-to-br from-[#ffd953]/5 to-transparent p-8">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#ffd953]/5 blur-3xl transition-all group-hover:bg-[#ffd953]/10" />
              <div className="relative">
                <div className="mb-4 inline-flex rounded-xl bg-[#ffd953]/10 p-3">
                  <User className="h-6 w-6 text-[#ffd953]" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Vue Créateur</h3>
                <p className="mb-6 text-sm leading-relaxed text-[#cfcbba]/60">
                  Analyse tes performances, découvre tes meilleures heures, génère du contenu IA et
                  pitche les bonnes marques.
                </p>
                <ul className="mb-8 space-y-2">
                  {[
                    "Dashboard performances détaillé",
                    "Carrousel & Guide PDF générés par IA",
                    "Collab Finder + Email/DM générés",
                    "Media Kit professionnel exportable",
                    "Stories, Réels & Hashtags analytics",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#cfcbba]/70">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#ffd953]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/creator/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#ffd953] px-5 py-2.5 text-sm font-semibold text-[#111c1b] transition-all hover:opacity-90"
                >
                  Accéder au dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Agency */}
            <div className="group relative overflow-hidden rounded-2xl border border-[#5c91a4]/20 bg-gradient-to-br from-[#5c91a4]/5 to-transparent p-8">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#5c91a4]/5 blur-3xl transition-all group-hover:bg-[#5c91a4]/10" />
              <div className="relative">
                <div className="mb-4 inline-flex rounded-xl bg-[#5c91a4]/10 p-3">
                  <Building2 className="h-6 w-6 text-[#5c91a4]" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Vue Agence</h3>
                <p className="mb-6 text-sm leading-relaxed text-[#cfcbba]/60">
                  Gérez votre portfolio de créateurs, comparez les performances et identifiez les
                  meilleures opportunités business.
                </p>
                <ul className="mb-8 space-y-2">
                  {[
                    "Portfolio multi-créateurs centralisé",
                    "Score qualité d'audience par créateur",
                    "Comparaison de performances croisée",
                    "Estimation de valeur par post",
                    "Recommandations stratégiques IA",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#cfcbba]/70">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#5c91a4]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/agency/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#5c91a4] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                >
                  Accéder au portfolio
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#5c91a4]">
              Tarifs
            </p>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Commence gratuitement, évolue quand tu veux
            </h2>
            <p className="mt-3 text-[#cfcbba]/60">
              Aucune carte bancaire requise pour le plan Free.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.highlight
                    ? "from-[#ffd953]/8 border-[#ffd953]/40 bg-gradient-to-b to-transparent shadow-xl shadow-[#ffd953]/5"
                    : "border-white/8 bg-white/[0.03]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#ffd953]/30 bg-[#ffd953]/10 px-3 py-0.5 text-xs font-semibold text-[#ffd953]">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="mb-1 text-lg font-bold text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-sm text-[#cfcbba]/50">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#cfcbba]/55">
                    {plan.description}
                  </p>
                </div>

                <ul className="mb-7 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#cfcbba]/70">
                      <Check
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.highlight ? "text-[#ffd953]" : "text-[#5c91a4]"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-[#ffd953] text-[#111c1b] hover:opacity-90"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                  {plan.name !== "Agency" ? (
                    <ArrowRight className="h-3.5 w-3.5" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist ── */}
      <section id="waitlist" className="border-t border-white/5 bg-white/[0.02] px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffd953]/20 bg-[#ffd953]/5 px-4 py-1.5 text-sm font-medium text-[#ffd953]">
            <Sparkles className="h-3.5 w-3.5" />
            Plan Pro — Bientôt disponible
          </div>
          <h2 className="mb-3 text-2xl font-bold text-white">
            Rejoins la liste d&apos;attente Pro
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-[#cfcbba]/60">
            Sois parmi les premiers à accéder à l&apos;IA illimitée, aux 10 thèmes Media Kit et au
            support prioritaire. Lancement prévu très prochainement.
          </p>
          <WaitlistForm plan="pro" />
          <p className="mt-4 text-xs text-[#cfcbba]/40">
            Aucun spam. Tu recevras un email uniquement pour le lancement.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-t border-white/5 bg-white/[0.02] px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#5c91a4]">
              Questions fréquentes
            </p>
            <h2 className="text-3xl font-bold text-white">FAQ</h2>
          </div>
          <div className="space-y-5">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-6 py-5"
              >
                <h3 className="mb-2 text-sm font-semibold text-white">{item.q}</h3>
                <p className="text-sm leading-relaxed text-[#cfcbba]/60">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-white/5 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffd953]/10">
            <TrendingUp className="h-7 w-7 text-[#ffd953]" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Prêt à décupler tes insights ?
          </h2>
          <p className="mb-8 text-[#cfcbba]/60">
            Rejoins des créateurs qui utilisent InstaInsights pour transformer leurs données en
            stratégie. Gratuit, sans CB, sans connexion Instagram.
          </p>
          <Link
            href="/creator/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ffd953] px-8 py-4 text-base font-bold text-[#111c1b] shadow-lg shadow-[#ffd953]/20 transition-all hover:scale-[1.02] hover:opacity-90"
          >
            Commencer maintenant — c&apos;est gratuit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-white/[0.02] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#ffd953]" />
            <span className="text-sm font-semibold text-white">InstaInsights</span>
            <span className="text-xs text-[#cfcbba]/40">
              © {new Date().getFullYear()} — Analytics Instagram IA
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-[#cfcbba]/50">
            <Link href="/pricing" className="transition-colors hover:text-white">
              Tarifs
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Confidentialité
            </Link>
            <Link href="/deletion" className="transition-colors hover:text-white">
              Suppression des données
            </Link>
            <a href="mailto:hello@instainsights.app" className="transition-colors hover:text-white">
              Contact
            </a>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-400" />
              100% RGPD
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
