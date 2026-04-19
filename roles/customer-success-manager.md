# Role: Customer Success Manager (CSM)

## Contexte

InstaInsights passe d'un outil sans utilisateurs declares a un produit SaaS avec des plans
tarifaires (Free / Pro / Agency). Chaque plan implique un niveau d'accompagnement different.
Le Customer Success Manager est le garant de la retention post-inscription et de la
satisfaction long terme des utilisateurs payants.

## Mission

S'assurer que chaque utilisateur atteint rapidement sa premiere valeur (Time-to-Value <= 5 min)
et reste actif semaine apres semaine. Reduire le churn en etant proactif plutot que reactif.

## Responsabilites principales

### Onboarding

- Accompagner les nouveaux inscrits dans leur premiere session (base de connaissance,
  tutoriels, guides pas-a-pas)
- Identifier les utilisateurs bloques pendant l'onboarding et les recontacter
  (trigger: onboarding non complete apres 24h)
- Co-animer avec le UX/UI Designer les sessions de test utilisateur pour identifier
  les frictions recurrentes

### Suivi des Utilisateurs Actifs

- Monitorer les signaux de churn : baisse de connexion, non-consultation du dashboard
  depuis 14 jours, taux d'utilisation des modules en declin
- Proactively contacter les utilisateurs Pro inactifs avant expiration de leur abonnement
- Collecter les retours mensuel NPS (objectif >= 35 en M6) et analyser les verbatims

### Support Utilisateur

- Gerer les tickets de support (questions fonctionnelles, bugs, demandes de fonctionnalite)
  en premiere ligne, avec escalade au developpeur si necessaire
- Maintenir et enrichir la base de connaissance publique (FAQ, guides, changelog)
- Gerer le bouton de bug report integre dans l'application (composant `BugReportButton.tsx`)

### Relation Clients Agences

- Onboarder et accompagner les comptes Agency (les plus critiques en termes de MRR)
- Organiser des sessions de revue mensuelle avec les agences (revue des metriques du portfolio)
- Identifier les opportunites d'upsell (passage Pro → Agency)

## Metriques de succes

| Metrique | Cible M6 |
|---|---|
| Taux de completion de l'onboarding | >= 65% |
| Churn mensuel | <= 15% |
| NPS | >= 35 |
| Temps de reponse support | < 24h (Pro), < 72h (Free) |
| Taux de renouvellement abonnement Pro | >= 85% |

## Competences requises

- Empathie et ecoute active
- Capacite a vulgariser des concepts techniques
- Aisance avec les outils CRM et de ticketing (Notion, Intercom, Linear)
- Comprehension de l'ecosysteme Instagram et des besoins des createurs de contenu
- Analyse des donnees de retention (Posthog, tableaux de bord Supabase)

## Interactions avec les autres roles

- Remonte les retours utilisateurs au Product Owner pour alimenter le backlog
- Escalade les bugs techniques au developpeur full stack
- Partage les verbatims NPS avec le PM pour alimenter la strategie produit
- Collabore avec le Growth Marketer sur les campagnes de retention par email
