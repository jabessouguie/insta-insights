# Role: Data Analyst

## Contexte

InstaInsights genere trois categories de donnees exploitables :
1. Les donnees produit (comportements utilisateurs : quels modules sont utilises, quand, combien de temps)
2. Les donnees analytics Instagram traitees localement (metriques d'engagement, croissance)
3. Les donnees business (MRR, churn, conversion Free → Pro)

La roadmap prevoit l'integration de Posthog (analytics produit) en Phase 3. Sans Data Analyst,
ces donnees restent une mine inexploitee.

## Mission

Transformer les donnees brutes en insights actionnables pour le Product Manager, le Product Owner
et le developpeur. L'objectif est d'informer les decisions produit par des faits plutot que par
des intuitions.

## Responsabilites principales

### Instrumentation & Collecte

- Definir et implémenter le plan de tracking Posthog en collaboration avec le developpeur :
  evenements a capturer, proprietes, funnels, cohortes
- S'assurer que chaque nouvelle fonctionnalite majeure est instrumentee avant son lancement
- Garantir la conformite RGPD de la collecte de donnees (consentement, anonymisation)

### Analyse Produit

- Construire et maintenir les dashboards de suivi des KPIs North Star :

| Metrique | Source |
|---|---|
| WAU (Weekly Active Users) | Posthog |
| Feature Breadth (modules / session) | Posthog |
| Churn mensuel | Supabase + Posthog |
| Funnel onboarding | Posthog |
| MRR | Stripe |
| NPS | Enquete in-app |

- Analyser les funnels de conversion : visiteur → inscrit → actif → Pro
- Identifier les modules sous-utilises (candidates a la simplification ou a la suppression)
- Produire un rapport hebdomadaire des metriques produit a destination du PM

### Analyse Business

- Suivre la sante financiere : MRR, ARPU (revenu moyen par utilisateur), LTV (lifetime value),
  taux de churn revenu
- Modeliser les projections de croissance en fonction des hypotheses de conversion

### A/B Testing

- Concevoir et analyser les experiences de pricing (structures des plans Free / Pro / Agency)
- Analyser les experiences A/B sur les captions et les onboardings
- Sassurer de la significativite statistique des resultats avant toute decision

## Competences requises

- Maitrise de SQL (requetes Supabase / PostgreSQL)
- Experience avec un outil d'analytics produit (Posthog, Mixpanel, Amplitude)
- Notions de statistiques (tests A/B, intervalles de confiance, significativite)
- Capacite a construire des dashboards clairs pour des profils non-techniques
- Sensibilite RGPD et protection des donnees personnelles

## Outils

| Usage | Outil |
|---|---|
| Analytics produit | Posthog |
| Base de donnees | Supabase (PostgreSQL) |
| Paiements | Stripe Dashboard |
| Visualisation | Posthog dashboards, Google Looker Studio |

## Interactions avec les autres roles

- Fournit les insights de retention au PM pour mettre a jour la roadmap
- Identifie les frictions du funnel a corriger par le UX/UI Designer et le developpeur
- Collabore avec le DevOps sur l'integration de Posthog et la structuration des tables Supabase
- Partage les resultats d'A/B tests avec le PO pour valider les decisions de backlog
