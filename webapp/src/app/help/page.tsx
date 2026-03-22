import type { Metadata } from "next";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Handshake,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  BarChart3,
  BookOpen,
  HelpCircle,
  Smartphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Centre d'aide — InstaInsights",
  description:
    "Guides, tutoriels et FAQ pour bien démarrer avec InstaInsights. Import ZIP, mobile iOS/Android, IA, Media Kit, Collabs.",
  openGraph: {
    title: "Centre d'aide — InstaInsights",
    description: "Tout ce qu'il faut savoir pour utiliser InstaInsights efficacement.",
    images: [{ url: "/api/og?page=help", width: 1200, height: 630 }],
  },
};

// ── Guide sections ────────────────────────────────────────────────────────────

const GUIDES = [
  {
    id: "import",
    icon: UploadCloud,
    color: "text-[#ffd953]",
    bg: "bg-[#ffd953]/10",
    title: "Importer ton export Instagram",
    intro:
      "InstaInsights parse ton export Instagram directement dans ton navigateur — aucun fichier n'est envoyé sur nos serveurs.",
    steps: [
      {
        title: "Demande ton export Instagram",
        body: 'Ouvre l\'app Instagram → Paramètres → "Activité" → "Télécharger tes informations". Sélectionne "Toutes les informations", format HTML (important : pas JSON), puis clique sur "Envoyer la demande".',
      },
      {
        title: "Reçois le fichier ZIP",
        body: "Instagram t'envoie un email avec un lien de téléchargement. Le délai varie de quelques minutes à 48 h selon la taille de ton compte. Ne ferme pas la fenêtre de demande avant de recevoir la confirmation.",
      },
      {
        title: "Importe dans InstaInsights",
        body: "Sur le dashboard créateur, clique sur la zone d'import ou glisse ton fichier .zip directement dedans. L'import est instantané — tu verras un message de confirmation \"Données importées avec succès\".",
      },
      {
        title: "Actualise le dashboard",
        body: "Tes données apparaissent immédiatement. Si certains modules affichent encore les données démo, rafraîchis la page (F5). Tes données restent stockées localement.",
      },
    ],
    tip: "💡 Ton export peut ne pas contenir toutes les métriques selon l'ancienneté de ton compte. Les données manquantes sont remplacées par des estimations.",
  },
  {
    id: "demo",
    icon: BarChart3,
    color: "text-[#5c91a4]",
    bg: "bg-[#5c91a4]/10",
    title: "Explorer le mode démo",
    intro:
      "Sans export ZIP, InstaInsights utilise automatiquement des données fictives pour te permettre d'explorer toutes les fonctionnalités.",
    steps: [
      {
        title: "Accès direct sans import",
        body: "Rends-toi sur /creator/dashboard — les données démo se chargent automatiquement. Tu peux tester tous les modules (carousel, media kit, collabs, etc.) sans aucun import.",
      },
      {
        title: "Données réalistes",
        body: "Les données démo simulent un créateur avec ~18 000 abonnés, un taux d'engagement de ~4 % et un historique de posts sur 12 mois. Elles sont representées par 5 profils créateurs distincts dans la vue Agence.",
      },
      {
        title: "Passer aux vraies données",
        body: "À tout moment, importe ton export ZIP via la zone d'upload en haut du dashboard. Tes vraies données remplacent immédiatement les données démo.",
      },
    ],
  },
  {
    id: "mobile",
    icon: Smartphone,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    title: "Utiliser InstaInsights sur mobile",
    intro:
      "L'app est entièrement responsive. Sur iOS et Android tu peux l'ajouter à l'écran d'accueil pour une expérience application native, et importer ton export ZIP depuis les fichiers de ton téléphone.",
    steps: [
      {
        title: "Ajouter à l'écran d'accueil (iOS — Safari)",
        body: "Ouvre instainsights.app dans Safari → appuie sur le bouton Partage (carré avec une flèche) → sélectionne \"Sur l'écran d'accueil\" → confirme. L'icône apparaît comme une vraie app.",
      },
      {
        title: "Ajouter à l'écran d'accueil (Android — Chrome)",
        body: "Ouvre instainsights.app dans Chrome → appuie sur ⋮ (menu) → \"Ajouter à l'écran d'accueil\" → confirme. Sur Samsung Internet, le bouton est dans le menu ≡.",
      },
      {
        title: "Importer ton export ZIP sur iOS",
        body: "Télécharge le ZIP depuis l'email Instagram (appui long → \"Télécharger le fichier\"). Dans InstaInsights, appuie sur la zone d'import → navigue dans l'app Fichiers → sélectionne le fichier .zip. L'import prend quelques secondes.",
      },
      {
        title: "Importer ton export ZIP sur Android",
        body: 'Télécharge le ZIP depuis Gmail ou l\'email Instagram. Dans InstaInsights, appuie sur la zone d\'import → sélectionne "Fichiers" ou "Téléchargements" → choisis le .zip. Tous les navigateurs modernes (Chrome, Firefox) sont supportés.',
      },
      {
        title: "Navigation sur petit écran",
        body: "Le bouton ☰ en haut à droite ouvre le menu complet. Toutes les fonctionnalités sont accessibles : carousel, guide, collabs, media kit. Sur les pages avec tabs, glisse horizontalement pour voir tous les onglets.",
      },
    ],
    tip: "💡 Sur iOS, l'app en mode écran d'accueil masque la barre d'adresse et la barre du bas — ça donne une vraie expérience PWA plein écran.",
  },
  {
    id: "ai",
    icon: Sparkles,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    title: "Utiliser les fonctionnalités IA",
    intro:
      "L'IA est multi-provider : Gemini (par défaut), Anthropic, OpenAI ou Ollama en local. Sans clé API, un mode mock génère des exemples réalistes.",
    steps: [
      {
        title: "Ajouter une clé Gemini (recommandé)",
        body: "Dans le fichier .env.local, ajoute : GEMINI_API_KEY=ta_clé. La clé Gemini est gratuite sur Google AI Studio (aistudio.google.com). Relance le serveur de développement.",
      },
      {
        title: "Générateur de carrousel",
        body: "Accède à /creator/carousel. Rédige un sujet, choisis ton format (post ou story), ajuste l'audience et clique sur Générer. L'IA crée 5–8 slides avec contenu et visuels.",
      },
      {
        title: "Collab Finder",
        body: "Dans /creator/collabs, l'IA analyse ta niche et te suggère des marques pertinentes. Clique sur une marque pour générer un email de pitch ou un DM Instagram personnalisé.",
      },
      {
        title: "Guide PDF",
        body: "Sur /creator/guide, décris tes sections en langage naturel. L'IA structure et enrichit le contenu, puis génère un guide PDF stylé prêt à l'impression.",
      },
    ],
    tip: "💡 Si l'IA retourne des erreurs ou des réponses vides, vérifie que ta clé API est valide et que ton quota n'est pas épuisé.",
  },
  {
    id: "mediakit",
    icon: FileText,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    title: "Créer et exporter ton Media Kit",
    intro:
      "Le Media Kit génère automatiquement un document PDF professionnel à partir de tes vraies analytics Instagram.",
    steps: [
      {
        title: "Personnaliser ton profil",
        body: "Va sur /creator/settings pour renseigner ton nom, tagline, services proposés, email de contact et tarif par post. Ces informations s'intègrent automatiquement dans le Media Kit.",
      },
      {
        title: "Choisir un thème",
        body: "Depuis /creator/mediakit, sélectionne parmi les 10 thèmes disponibles (Forest, Ocean, Neon, Pastel…). Le preview se met à jour en temps réel.",
      },
      {
        title: "Exporter en PDF",
        body: "Clique sur le bouton d'export. Un nouvel onglet s'ouvre avec ton Media Kit HTML complet — la boîte de dialogue d'impression de ton navigateur apparaît automatiquement. Sélectionne \"Enregistrer en PDF\".",
      },
      {
        title: "Partager avec les marques",
        body: "Tu peux aussi copier le lien de partage pour envoyer ton Media Kit directement sans PDF.",
      },
    ],
    tip: '💡 Pour un meilleur rendu PDF : dans les options d\'impression, active "Graphiques d\'arrière-plan" et désactive "En-têtes et pieds de page".',
  },
  {
    id: "collabs",
    icon: Handshake,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    title: "Gérer tes collabs",
    intro:
      "Le Collab Finder IA identifie les marques pertinentes pour ta niche et t'aide à les contacter efficacement.",
    steps: [
      {
        title: "Lancer une recherche",
        body: 'Décris ta niche dans la barre de recherche (ex : "mode éthique Paris"). L\'IA génère une liste de marques avec leur secteur, taille estimée et score de compatibilité.',
      },
      {
        title: "Générer un pitch",
        body: 'Clique sur une marque → "Générer un pitch". Choisis entre email ou DM Instagram. L\'IA rédige un message personnalisé incluant tes vraies statistiques.',
      },
      {
        title: "Suivre tes collaborations",
        body: "Dans le panneau de suivi, change le statut : Contacté → Email envoyé → Réponse reçue → En négociation → Accepté / Refusé. Un rappel de relance apparaît automatiquement après 3 jours.",
      },
      {
        title: "Relance automatique",
        body: 'Si une collab est restée sans réponse 3 jours, un bouton "Générer une relance" apparaît pour créer automatiquement un email de rappel.',
      },
    ],
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Mes données Instagram sont-elles envoyées sur tes serveurs ?",
    a: "Non. Le parsing de ton export ZIP se fait entièrement dans ton navigateur (côté client). Aucun fichier n'est uploadé. Seules les requêtes IA optionnelles transitent par notre API, sans stocker tes données personnelles.",
  },
  {
    q: "Que faire si mon export ZIP ne fonctionne pas ?",
    a: "Vérifie que tu as bien sélectionné le format HTML (et non JSON) lors de la demande d'export Instagram. Si le problème persiste, essaie de re-demander l'export. Le mode démo reste disponible en attendant.",
  },
  {
    q: "L'IA ne répond pas ou génère du contenu vide — que faire ?",
    a: "Vérifie que ta clé GEMINI_API_KEY est valide dans .env.local et que ton quota Google AI Studio n'est pas épuisé. Sans clé, un mode mock génère automatiquement des exemples réalistes.",
  },
  {
    q: "Comment réinitialiser mes données et repartir de zéro ?",
    a: "Ouvre les DevTools de ton navigateur (F12) → onglet Application → Local Storage → sélectionne l'entrée instainsights.app et supprime les clés souhaitées. Rafraîchis ensuite la page.",
  },
  {
    q: "Peut-on utiliser InstaInsights sur mobile ?",
    a: "Oui, totalement. Consulte la section \"Utiliser InstaInsights sur mobile\" ci-dessus pour le guide complet : ajout à l'écran d'accueil iOS/Android, import ZIP depuis les fichiers, navigation tactile.",
  },
  {
    q: "Quelles sont les fonctionnalités les plus récentes ?",
    a: "Les dernières features : générateur de carousels avec 5 templates visuels et Gemini 3.1, éditeur de Reels avec FFmpeg WASM (montage in-browser), générateur UGC, guide PDF enrichi par IA, sélecteur de modèle IA par feature (Flash 3.0 / 3.1 / Pro 3.1), et boucles de feedback pour affiner le contenu.",
  },
  {
    q: "Le plan Pro est-il disponible ?",
    a: "Pas encore — rejoins la liste d'attente sur la page Tarifs pour être notifié en priorité au lancement. Le plan Free est permanent et donne accès à tous les modules essentiels.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#111c1b] text-[#cfcbba]" id="main-content">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#111c1b]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffd953]/10">
              <TrendingUp className="h-4 w-4 text-[#ffd953]" />
            </div>
            <span className="text-lg font-bold text-white">InstaInsights</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="text-sm text-[#cfcbba]/60 transition-colors hover:text-white"
            >
              Tarifs
            </Link>
            <Link
              href="/creator/dashboard"
              className="flex items-center gap-1.5 rounded-lg bg-[#ffd953] px-4 py-2 text-sm font-semibold text-[#111c1b] transition-opacity hover:opacity-90"
            >
              Ouvrir l&apos;app
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffd953]/10">
            <HelpCircle className="h-7 w-7 text-[#ffd953]" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-white md:text-4xl">Centre d&apos;aide</h1>
          <p className="text-[#cfcbba]/60">
            Tout ce qu&apos;il faut savoir pour démarrer et tirer le meilleur d&apos;InstaInsights.
          </p>
        </div>
      </section>

      {/* Quick links */}
      <section className="border-y border-white/5 bg-white/[0.02] px-6 py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {GUIDES.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-4 text-center text-xs transition-colors hover:border-white/10 hover:bg-white/[0.06]"
            >
              <div className={`rounded-lg p-2 ${g.bg}`}>
                <g.icon className={`h-4 w-4 ${g.color}`} />
              </div>
              <span className="font-medium text-[#cfcbba]/80">
                {g.title.split(" ").slice(0, 3).join(" ")}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Guide sections */}
      <div className="mx-auto max-w-3xl space-y-16 px-6 py-16">
        {GUIDES.map((guide) => (
          <section key={guide.id} id={guide.id} className="scroll-mt-24">
            <div className="mb-6 flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${guide.bg}`}
              >
                <guide.icon className={`h-5 w-5 ${guide.color}`} />
              </div>
              <h2 className="text-xl font-bold text-white">{guide.title}</h2>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-[#cfcbba]/65">{guide.intro}</p>

            <div className="space-y-4">
              {guide.steps.map((step, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${guide.bg} text-xs font-bold ${guide.color}`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-white">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-[#cfcbba]/60">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {"tip" in guide && guide.tip && (
              <div className="mt-4 rounded-xl border border-[#ffd953]/10 bg-[#ffd953]/5 px-5 py-3 text-sm text-[#cfcbba]/65">
                {guide.tip}
              </div>
            )}
          </section>
        ))}

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5c91a4]/10">
              <BookOpen className="h-5 w-5 text-[#5c91a4]" />
            </div>
            <h2 className="text-xl font-bold text-white">FAQ</h2>
          </div>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4"
              >
                <h3 className="mb-2 text-sm font-semibold text-white">{item.q}</h3>
                <p className="text-sm leading-relaxed text-[#cfcbba]/60">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-[#ffd953]/20 bg-[#ffd953]/5 px-8 py-8 text-center">
          <h3 className="mb-2 text-lg font-bold text-white">
            Tu n&apos;as pas trouvé ta réponse ?
          </h3>
          <p className="mb-5 text-sm text-[#cfcbba]/60">
            Contacte-nous directement — on répond généralement en moins de 24 h.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="mailto:hello@instainsights.app"
              className="flex items-center gap-2 rounded-lg bg-[#ffd953] px-5 py-2.5 text-sm font-semibold text-[#111c1b] transition-all hover:opacity-90"
            >
              Envoyer un email
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/creator/dashboard"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Essayer l&apos;app
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-6 text-center text-xs text-[#cfcbba]/40">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="hover:text-white">
            Accueil
          </Link>
          <Link href="/pricing" className="hover:text-white">
            Tarifs
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Confidentialité
          </Link>
          <Link href="/deletion" className="hover:text-white">
            Suppression des données
          </Link>
          <span>© {new Date().getFullYear()} InstaInsights</span>
        </div>
      </footer>
    </div>
  );
}
