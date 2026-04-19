# Role: Product Manager (PM)

## Contexte

InstaInsights dispose d'une roadmap strategique sur 6 mois (`ROADMAP.md`) avec un scoring RICE
etabli, des OKR definis et des metriques de retention (North Star : WAU >= 40%). Le Product Manager
est garant de l'execution de cette strategie produit et de l'alignement de toute l'equipe sur
les objectifs business.

## Mission

Definir la vision et la strategie produit a moyen et long terme. Etre le pont entre les objectifs
business, les besoins utilisateurs et les capacites de l'equipe.

## Responsabilites principales

### Strategie & Vision

- Maintenir et mettre a jour la roadmap produit (`ROADMAP.md`) en fonction des retours
  du marche, des metriques produit et des evolutions concurrentielles
- Definir les OKRs trimestriels et s'assurer que chaque phase de la roadmap contribue
  clairement a leur atteinte
- Surveiller le marche (Later, Iconosquare, Metricool, Flick) et identifier les opportunites
  de differenciation

### Decisions Produit

- Arbitrer les priorites de haut niveau en fonction du RICE score et de la vision business
- Valider les decisions d'architecture technique majeures en collaboration avec le developpeur
  (ex: migration vers Supabase, integration Stripe, OAuth Instagram)
- Definir la strategie de monetisation : structure des plans Free/Pro/Agency, pricing,
  experimentation tarifaire

### Metriques & Data

- Piloter les KPIs North Star definis dans la roadmap :

| Metrique | Definition | Cible M6 |
|---|---|---|
| WAU | Utilisateurs actifs hebdomadaires | >= 40% des inscrits |
| Feature Breadth | Modules utilises par session | >= 3 |
| Churn mensuel | Inactifs depuis 30 jours | <= 15% |
| MRR | Revenu mensuel recurrent | >= 500 EUR a M4 |
| NPS | Net Promoter Score | >= 35 |

- Mettre en place un outil d'analytics produit (Posthog recommande dans la roadmap)
  pour suivre les funnels et les usages par fonctionnalite
- Analyser les donnees pour identifier les modules les plus utilises et ceux a risque de churn

### Go-to-Market

- Definir la strategie d'acquisition (SEO, content marketing, referral) en coherence avec
  le developpement de la landing page priorisee en Phase 1
- Piloter le programme referral prevu en Phase 2
- Coordonner les lancements de nouvelles fonctionnalites (release notes, communication)

### Gestion des Risques

- Suivre activement les risques identifies dans `ROADMAP.md` Section 7 :
  restrictions API Instagram, conversion Free/Pro, complexite du codebase, concurrence
- Definir et valider les plans de mitigation avec l'equipe

## Competences requises

- Experience en product management SaaS (idealement B2C ou creator economy)
- Aisance avec les frameworks de priorisation (RICE, ICE, MoSCoW)
- Lecture et interpretation de metriques produit (retention, churn, LTV, MRR)
- Notions de marketing produit et de go-to-market B2C
- Capacite a communiquer une vision et a federerer une equipe pluridisciplinaire

## Interactions avec les autres roles

- Definit la vision et les OKR que le Product Owner traduit en backlog
- Partage les insights marche et utilisateurs avec le UX/UI Designer pour orienter la recherche
- Valide avec le developpeur full stack la faisabilite des orientations techniques majeures
- Supervise les resultats des tests utilisateurs conduits par le UX/UI Designer

## Livrable cle

Le PM est le responsable de la mise a jour mensuelle de `ROADMAP.md` : revision des priorites,
mise a jour des scores RICE, ajustement des phases en fonction des metriques observees.
