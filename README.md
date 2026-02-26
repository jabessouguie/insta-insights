# InstaInsights Web App

Application SaaS d'analyse Instagram — **Production-Ready**, alimentée par **Gemini AI**.

## Architecture

```
insta-insights/
├── data/                         # Export Instagram (JAMAIS commité — .gitignore)
├── webapp/                       # Application Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── (creator)/        # Route group — Vue Créateur
│   │   │   │   └── dashboard/    # /creator/dashboard
│   │   │   ├── (agency)/         # Route group — Vue Agence
│   │   │   │   └── dashboard/    # /agency/dashboard
│   │   │   ├── api/
│   │   │   │   ├── data/         # GET  /api/data    — Parse export Instagram
│   │   │   │   └── insights/     # POST /api/insights — Gemini AI
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Landing page (sélection de vue)
│   │   │   └── providers.tsx
│   │   ├── components/
│   │   │   ├── ui/               # Composants shadcn/ui
│   │   │   ├── layout/           # Header, ThemeToggle
│   │   │   ├── dashboard/        # MetricCard, Charts, InsightsPanel
│   │   │   ├── creator/          # BestPostingTimes, AudienceQuality
│   │   │   └── agency/           # CreatorCard, CreatorComparison
│   │   ├── hooks/                # useInstagramData, useInsights
│   │   ├── lib/                  # instagram-parser, gemini, utils, mock-data
│   │   └── types/                # Types TypeScript Instagram
│   ├── .husky/                   # Git hooks (pre-commit, commit-msg)
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── .env.example
│   ├── next.config.ts            # CSP headers, image domains
│   ├── tailwind.config.ts
│   └── package.json
└── .github/workflows/
    ├── python-app.yml            # CI Python (existant)
    └── webapp.yml                # CI/CD Next.js (nouveau)
```

## Démarrage rapide

### Prérequis

- Node.js 20+
- npm 10+

### Installation

```bash
cd webapp
npm install
```

### Configuration

```bash
cp .env.example .env.local
# Éditez .env.local et renseignez votre clé Gemini
```

Obtenez une clé Gemini gratuitement sur [Google AI Studio](https://aistudio.google.com/).

### Données Instagram

Placez votre export Instagram dans `data/` (à la racine du dépôt) :

```
data/
└── instagram-votrenom-2024-01-01-xxxxxxxx/
    ├── connections/
    │   └── followers_and_following/
    ├── your_instagram_activity/
    │   ├── media/
    │   └── likes/
    └── personal_information/
```

> **L'application fonctionne en mode démo** avec des données simulées si aucun export n'est présent.

### Lancement

```bash
# Développement
npm run dev
# → http://localhost:3000

# Production
npm run build && npm start
```

## Vues disponibles

### Vue Créateur (`/creator/dashboard`)

Pour les créateurs de contenu et influenceurs :

- **Dashboard** (`/creator/dashboard`) : KPIs réels (abonnés, taux d'engagement, likes/commentaires calculés depuis `content_interactions.html`), graphique de croissance, Insights IA Gemini auto-générés au chargement
- **Contenu** : Performance par type (Reels, Photos, Carousels), meilleurs créneaux de publication, top 10 posts par engagement
- **Audience** : Qualité (actifs/inactifs calculés depuis `content_interactions`), abonnements non-réciproques, insights IA

### Analyse des Interactions (`/creator/interactions`) 🆕

3 onglets basés sur l'analyse complète de l'export :

| Onglet          | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| **Inactifs**    | Abonnés que tu suis mais qui n'ont jamais liké ni commenté         |
| **DM suggérés** | Comptes à contacter — Gemini génère un DM personnalisé sur demande |
| **À unfollow**  | Comptes sans follow-back, DM envoyé il y a + d'1 mois              |

### Générateur de Media Kit (`/creator/mediakit`) 🆕

Interface Canva-inspirée avec :

- **Preview live** en temps réel dans un iframe
- **6 palettes de couleurs** prédéfinies + personnalisation complète (color picker)
- **Édition** : tagline, email, tarif par post, liste de services
- **Export HTML** (téléchargement direct)
- **Export PDF** (impression via CSS @media print)
- **Lien de partage** (URL copiée en un clic)

### Trouveur de Collabs (`/creator/collabs`) 🆕

- Recherche par localisation + centres d'intérêt (multi-select + custom)
- Gemini identifie 6 opportunités de collaboration pertinentes (marques, créateurs, événements, médias)
- Pour chaque collab : email de contact personnalisé généré par Gemini, visualisable et copiable en un clic

### Vue Agence (`/agency/dashboard`)

Pour les agences et managers de talents :

- **Portfolio** : Grille de créateurs avec scores, estimations de revenus
- **Comparaison** : Radar multi-dimensions, tableau comparatif
- **Insights IA** : Recommandations stratégiques pour le portfolio

## Stack technique

| Couche       | Technologie              |
| ------------ | ------------------------ |
| Framework    | Next.js 14 (App Router)  |
| Langage      | TypeScript strict        |
| Style        | Tailwind CSS + shadcn/ui |
| Graphiques   | Recharts                 |
| IA           | Google Gemini 1.5 Flash  |
| Parsing HTML | Cheerio                  |
| Fetching     | SWR                      |
| Thème        | next-themes (dark/light) |

## Qualité du code

```bash
npm run lint          # ESLint
npm run format        # Prettier
npm run type-check    # TypeScript strict
npm run test          # Jest
npm run test:coverage # Couverture
```

Les hooks Husky executent automatiquement lint + format avant chaque commit.

## CI/CD (GitHub Actions)

Pipeline `.github/workflows/webapp.yml` :

1. **Secret Scanning** — TruffleHog (détection de tokens/clés)
2. **Code Quality** — TypeScript + ESLint + Prettier
3. **Security Audit** — `npm audit` (dépendances vulnérables)
4. **Tests** — Jest avec rapport de couverture
5. **Build** — Compilation Next.js production
6. **Deploy** — Vercel (à configurer avec `VERCEL_TOKEN`)

## Sécurité

- Headers HTTP sécurisés (CSP, X-Frame-Options, X-Content-Type-Options)
- Aucune donnée personnelle transmise (traitement 100% local)
- Variables d'environnement validées (`.env.local` exclu du git)
- Scan automatique de secrets à chaque push

## Déploiement Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Ajoutez les variables d'environnement dans le dashboard Vercel :

- `GEMINI_API_KEY`

## Roadmap

- [ ] Authentification (NextAuth)
- [ ] Connexion API Graph Instagram
- [ ] Export PDF des rapports
- [ ] Notifications et alertes
- [ ] Multi-compte (plusieurs exports)
- [ ] Historique et comparaison temporelle
