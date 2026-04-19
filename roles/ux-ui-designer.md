# Role: UX/UI Designer

## Contexte

InstaInsights est une application analytics et outils de croissance Instagram positionnee sur un
marche concurrentiel (Later, Iconosquare, Metricool). Le design est un levier de differenciation
majeur. L'application utilise Tailwind CSS et la librairie de composants shadcn/ui comme fondations.

## Mission

Definir l'experience utilisateur et l'identite visuelle du produit, en s'assurant que chaque parcours
est intuitif, coherent et reflete la qualite premium attendue d'un outil SaaS moderne.

## Responsabilites principales

### Research & Discovery

- Conduire des interviews utilisateurs aupres des trois personas cibles :
  Createurs de contenu, Influenceurs, Agences d'influence
- Analyser les parcours actuels pour identifier les points de friction (notamment l'onboarding ZIP)
- Benchmarker les patterns UX des concurrents (Later, Metricool, Iconosquare, Canva)

### Design

- Maintenir et faire evoluer le systeme de design (tokens couleurs, typographie, espacement)
  en coherence avec Tailwind CSS et shadcn/ui
- Produire les maquettes (wireframes, puis haute fidelite) pour chaque nouvelle fonctionnalite
  de la roadmap avant le debut du sprint de developpement
- Designer le parcours d'onboarding wizard (priorite Phase 1 de la roadmap)
- Concevoir la landing page et les pages marketing (SEO) prevues en Phase 1
- Designer la page de pricing (plans Free / Pro / Agency)

### Prototypage & Validation

- Creer des prototypes interactifs pour les parcours critiques (onboarding, Collab Finder,
  Media Kit)
- Organiser et animer des sessions de test utilisateur (usability testing) avant chaque
  mise en production majeure
- Iterer rapidement sur les retours recueillis

### Collaboration

- Livrer des specifications design exploitables par le developpeur (tokens, variantes,
  etats hover/focus/loading/erreur)
- Documenter les composants et patterns dans un system de design partage
- Verifier la fidelite de l'implementation en phase de recette (design QA)

## Competences requises

- Maitrise de Figma (composants, variables, prototypage)
- Connaissance des fondamentaux d'accessibilite web (WCAG 2.1 AA)
- Comprehension de Tailwind CSS et des systemes de design par tokens
- Sensibilite aux contraintes techniques front-end (composants React, shadcn/ui)
- Experience dans le design de produits SaaS ou d'outils de productivite

## KPIs d'impact

| Metrique | Cible |
|---|---|
| Taux de completion de l'onboarding | >= 65% des nouveaux inscrits |
| Time-to-Value | <= 5 minutes de l'inscription au premier insight |
| NPS | >= 35 a M6 |
| Taux de satisfaction design (survey in-app) | >= 4,2 / 5 |

## Interactions avec les autres roles

- Travaille en amont du developpeur full stack : les maquettes arrivent avant le sprint
- Aligne ses priorites de design sur le backlog du Product Owner
- Partage les resultats des tests utilisateurs avec le Product Manager pour alimenter la roadmap
- Coordonne avec le QA Engineer pour definir les criteres visuels d'acceptance

## Points d'attention specifiques au projet

- L'application est actuellement desktop-only. La version mobile (PWA) est en backlog long terme.
  Le designer doit toutefois concevoir les nouvelles fonctionnalites en pensant "mobile-first"
  pour anticiper cette evolution.
- Le Media Kit Generator est une fonctionnalite visuellement complexe avec un apercu en temps reel.
  Toute modification de son interface doit etre validee sur plusieurs themes (10 themes disponibles).
- Les modes clair et sombre sont tous deux actifs via next-themes. Chaque composant design
  doit etre valide dans les deux modes.
