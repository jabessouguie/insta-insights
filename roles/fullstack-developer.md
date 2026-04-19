# Role: Developpeur Full Stack

## Contexte

InstaInsights est une application Next.js 16 (App Router) avec une architecture full stack integree :
le frontend et l'API coexistent dans le meme depot sous `webapp/src/`. Le developpeur full stack
est le role le plus critique pour l'evolution du produit.

## Mission

Concevoir, implementer et maintenir les fonctionnalites produit de bout en bout : de la route API
jusqu'au composant React visible dans le navigateur, en passant par la logique metier dans `src/lib/`.

## Responsabilites principales

### Developpement

- Implementer les nouvelles fonctionnalites decrites dans la roadmap (phases Now / Next / Later)
- Ecrire les routes API sous `src/app/api/` avec validation des entrees et gestion des erreurs
- Developper les modules de parsing et d'analyse dans `src/lib/` (ex: `interaction-analyser.ts`,
  `instagram-parser.ts`) avec une documentation JSDoc complete
- Creer et faire evoluer les composants React sous `src/components/` et les pages sous `src/app/`
- Assurer la compatibilite TypeScript strict (aucune erreur `tsc --noEmit`)

### Qualite & Tests

- Ecrire des tests unitaires et d'integration dans `src/__tests__/` pour chaque module cree ou modifie
- Viser 100% de couverture de code sur les modules de logique metier
- Respecter les conventions de commit (Conventional Commits) et les hooks pre-commit Husky
- Passer les verifications CI/CD avant toute merge : lint, format, type-check, tests, build

### Architecture

- Maintenir la separation claire entre : parsing de donnees, logique d'analyse, couche API, et
  presentation (composants)
- Participer aux decisions techniques decrites dans `ROADMAP.md` Section 8 :
  migration Supabase, integration NextAuth, mise en place Stripe

### Integration IA

- Developper et optimiser les prompts Gemini / Anthropic / OpenAI via `src/lib/ai-provider.ts`
- Assurer la robustesse des reponses IA (validation JSON, fallback en cas d'erreur, limites de tokens)

## Competences requises

- Maitrise de TypeScript (strict mode) et React 18 (hooks, Server Components, Client Components)
- Connaissance de Next.js App Router (routes, layouts, Server Actions)
- Experience avec l'ecosysteme de test Jest + Testing Library
- Notions d'integration d'API tierces (Instagram Graph API, Stripe, Supabase)
- Familiarite avec les LLM via API (Gemini, Anthropic, OpenAI)

## Stack de reference

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript strict |
| Style | Tailwind CSS + shadcn/ui |
| Graphiques | Recharts |
| IA | Gemini / Anthropic / OpenAI via ai-provider.ts |
| Tests | Jest + Testing Library |
| CI/CD | GitHub Actions |

## Interactions avec les autres roles

- Recoit les specifications fonctionnelles du Product Owner
- Recoit les maquettes et tokens de design du UX/UI Designer
- Remonte les contraintes techniques au Product Manager et au Product Owner
- Collabore avec le QA Engineer sur la definition des criteres d'acceptance

## Points d'attention specifiques au projet

- Ne jamais commiter de donnees Instagram (`data/` est dans `.gitignore`)
- Aucun emoji dans le code source, les commentaires ou les messages de commit
- Toute nouvelle fonction publique doit etre documentee (JSDoc)
- Le max-warnings ESLint est fixe a 50 — au-dela, le build CI echoue
