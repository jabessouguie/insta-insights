import Link from "next/link";
import { BarChart3, Building2, User, Sparkles, TrendingUp, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950">
      {/* Hero */}
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        {/* Logo badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
          <Sparkles className="h-3.5 w-3.5" />
          Alimenté par Gemini AI
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
          <span className="gradient-text">InstaInsights</span>
          <br />
          <span className="text-slate-200">Analytics Instagram</span>
        </h1>

        <p className="mx-auto mb-14 max-w-2xl text-lg text-slate-400 md:text-xl">
          Transformez vos données Instagram en décisions stratégiques. Insights IA, métriques
          avancées et recommandations personnalisées pour créateurs et agences.
        </p>

        {/* View selection cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Creator */}
          <Link href="/creator/dashboard" className="group">
            <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-slate-900/80 p-8 text-left transition-all duration-300 hover:border-violet-500/60 hover:bg-slate-900 hover:shadow-2xl hover:shadow-violet-500/10">
              {/* Glow */}
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl transition-all duration-500 group-hover:bg-violet-600/20" />

              <div className="relative">
                <div className="mb-5 inline-flex rounded-xl bg-violet-500/10 p-3">
                  <User className="h-7 w-7 text-violet-400" />
                </div>

                <h2 className="mb-2 text-2xl font-bold text-white">Vue Créateur</h2>
                <p className="mb-6 text-slate-400">
                  Analysez vos performances, découvrez vos meilleurs moments de publication et
                  recevez des recommandations personnalisées par l&apos;IA.
                </p>

                <ul className="mb-8 space-y-2.5 text-sm text-slate-400">
                  {[
                    "Métriques d'engagement en temps réel",
                    "Analyse de la qualité d'audience",
                    "Meilleures heures de publication",
                    "Performance par type de contenu",
                    "Insights IA personnalisés",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-violet-500">
                  Accéder au dashboard
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Agency */}
          <Link href="/agency/dashboard" className="group">
            <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-slate-900/80 p-8 text-left transition-all duration-300 hover:border-pink-500/60 hover:bg-slate-900 hover:shadow-2xl hover:shadow-pink-500/10">
              {/* Glow */}
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-pink-600/10 blur-3xl transition-all duration-500 group-hover:bg-pink-600/20" />

              <div className="relative">
                <div className="mb-5 inline-flex rounded-xl bg-pink-500/10 p-3">
                  <Building2 className="h-7 w-7 text-pink-400" />
                </div>

                <h2 className="mb-2 text-2xl font-bold text-white">Vue Agence</h2>
                <p className="mb-6 text-slate-400">
                  Gérez votre portfolio de créateurs, comparez les performances et identifiez les
                  meilleures opportunités de collaboration.
                </p>

                <ul className="mb-8 space-y-2.5 text-sm text-slate-400">
                  {[
                    "Portfolio multi-créateurs",
                    "Score de qualité d'audience",
                    "Comparaison de performances",
                    "Estimation de valeur par post",
                    "Recommandations stratégiques IA",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-pink-500">
                  Accéder au portfolio
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            100% Local & RGPD
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-400" />
            Données Instagram Export
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-pink-400" />
            Insights IA Gemini
          </div>
        </div>
      </div>
    </main>
  );
}
