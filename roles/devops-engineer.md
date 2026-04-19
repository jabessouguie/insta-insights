# Role: DevOps / Infrastructure Engineer

## Contexte

InstaInsights dispose d'un pipeline CI/CD sur GitHub Actions (`.github/workflows/webapp.yml`)
couvrant : scan de secrets (TruffleHog), qualite de code (TypeScript + ESLint + Prettier),
audit de securite (`npm audit`), tests Jest, build Next.js, et deploiement Vercel.
Le deploiement est actuellement sur Vercel. La roadmap prevoit une migration vers Supabase
(PostgreSQL) a la Phase 3 et l'integration de Stripe pour la monetisation.

## Mission

Garantir la fiabilite, la securite, la performance et la scalabilite de l'infrastructure de
l'application. Gerer le pipeline de livraison de maniere a ce que les deploiements soient
frequents, previsibles et sans risque.

## Responsabilites principales

### Pipeline CI/CD

- Maintenir et faire evoluer le pipeline GitHub Actions
- S'assurer que chaque etape echoue rapidement et de maniere explicite en cas de probleme
- Ajouter les etapes necessaires au fur et a mesure de l'evolution du projet :
  tests E2E Playwright, validation des migrations de base de donnees, preview deployments

Etapes CI actuelles a maintenir :
1. Secret Scanning (TruffleHog)
2. TypeScript + ESLint + Prettier
3. `npm audit` (vulnerabilites de dependances)
4. Jest (tests et couverture)
5. Build Next.js production
6. Deploiement Vercel

### Infrastructure & Deploiement

- Gerer les variables d'environnement sur Vercel (et, a terme, sur les environnements de
  staging et production separes)
- Mettre en place un environnement de staging pour la recette avant chaque mise en production
- Surveiller les logs d'erreur et les temps de reponse en production

### Migration Supabase (Phase 3)

Prevue a la Phase 3 de la roadmap (`ROADMAP.md` Section 8) :
- Configurer le projet Supabase (base PostgreSQL, Row Level Security, authentification)
- Ecrire et versionner les migrations de schema de base de donnees
- Assurer la migration des donnees depuis localStorage vers Supabase
- Configurer NextAuth.js pour l'authentification OAuth Instagram et Supabase

### Integration Stripe (Phase 2/3)

- Configurer Stripe Checkout Session et les webhooks pour les plans Pro et Agency
- Securiser les webhooks Stripe (signature, idempotence)
- Mettre en place les alertes en cas d'echec de paiement

### Securite

- Surveiller les alertes `npm audit` et coordonner les mises a jour de dependances
- Verifier que les headers HTTP securises sont bien appliques (CSP, X-Frame-Options,
  X-Content-Type-Options — deja configures dans `next.config.mjs`)
- S'assurer qu'aucune cle API ne fuite dans les logs ou le code source

### Monitoring & Alertes

- Mettre en place un monitoring de disponibilite et de performance (ex: Uptime Robot, Sentry)
- Configurer Posthog pour l'analytics produit (prevu dans la roadmap)
- Configurer Resend pour les emails transactionnels (rapports automatises, notifications)

## Competences requises

- Maitrise de GitHub Actions (YAML, secrets, jobs, artifacts)
- Connaissance de Vercel (deployments, environment variables, edge functions)
- Experience avec Supabase ou PostgreSQL (migrations, RLS, Auth)
- Notions de securite web (headers HTTP, secrets, audit de dependances)
- Familiarite avec Stripe (Checkout, webhooks)

## Interactions avec les autres roles

- Collabore avec le developpeur full stack sur les besoins d'infrastructure (nouvelles
  variables d'environnement, nouvelles bases de donnees, nouveaux services tiers)
- Informe le PM des incidents de production et de leurs impacts
- Coordonne avec le QA Engineer pour la mise en place de l'environnement de staging

## Variables d'environnement actuelles

| Variable | Usage | Obligatoire |
|---|---|---|
| `GEMINI_API_KEY` | Appels Gemini AI | Oui (si pas d'autre fournisseur) |
| `ANTHROPIC_API_KEY` | Appels Anthropic Claude | Non (optionnel) |
| `OPENAI_API_KEY` | Appels OpenAI | Non (optionnel) |
| `INSTAGRAM_DATA_PATH` | Chemin vers l'export ZIP | Non (defaut : `../data`) |

Variables a ajouter lors des prochaines phases :
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXTAUTH_SECRET`, `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `RESEND_API_KEY`
