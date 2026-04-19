# Role: Responsable Financier (CFO / Finance)

## Contexte

La monetisation d'InstaInsights demarre en Phase 2 de la roadmap avec l'integration de Stripe
et les plans tarifaires Free / Pro / Agency. Des revenus impliquent une comptabilite, une
fiscalite, des obligations legales et une gestion de tresorerie. Ce role est a activeer
au moment du premier euro facture.

## Mission

Gerer la sante financiere de l'entreprise. S'assurer que les revenus sont correctement
comptabilises, que les charges sont maitrisees et que l'entreprise dispose de la visibilite
financiere necessaire pour prendre de bonnes decisions.

## Responsabilites principales

### Comptabilite & Facturation

- Superviser la comptabilite mensuelle (revenus Stripe, charges serveur, charges personnel)
- S'assurer que les factures sont correctement emises aux clients (via Stripe et/ou le
  Invoice Generator prevu dans la roadmap Phase 2)
- Gerer la TVA (TVA sur les services SaaS vendus en Europe — regime OSS si applicable)
- Preparer les clotures comptables mensuelles et annuelles

### Suivi Financier

- Suivre les metriques financieres cles :

| Metrique | Frequence de suivi |
|---|---|
| MRR (Revenu mensuel recurrent) | Hebdomadaire |
| ARR (Revenu annuel recurrent) | Mensuel |
| Churn revenu (MRR perdu) | Mensuel |
| LTV (Lifetime Value par segment) | Trimestriel |
| CAC (Cout d'acquisition client) | Mensuel |
| Runway (mois de tresorerie restants) | Mensuel |

- Produire un rapport financier mensuel a destination du fondateur / PM

### Gestion de Tresorerie

- Piloter la tresorerie et anticiper les besoins de financement (si croissance rapide)
- Gerer les relations bancaires
- Explorer les dispositifs de financement de l'innovation (CIR, subventions BPI, aides
  regionales) si l'entreprise est en France

### Conformite Fiscale

- Declarer la TVA (mensuelle ou trimestrielle selon le regime)
- S'assurer de la conformite fiscale des revenus internationaux (clients europeens
  hors France, clients hors UE)
- Preparer les eventuels audits comptables

## Competences requises

- Formation comptable ou financiere (DCG, DSCG, Master CCA ou equivalent)
- Experience en comptabilite SaaS (MRR, ARR, traitement de la TVA sur services numeriques)
- Maitrise de Stripe pour le suivi des paiements et des remboursements
- Connaissance des specificites fiscales du SaaS en Europe

## Outils

| Usage | Outil recommande |
|---|---|
| Comptabilite | Pennylane, Cegid ou equivalent |
| Paiements | Stripe Dashboard |
| Tableaux de bord financiers | Google Sheets ou Notion |
| Facturation | Stripe + Invoice Generator (en developpement - roadmap Phase 2) |

## Interactions avec les autres roles

- Collabore avec le DevOps sur la configuration Stripe (webhooks, gestion des remboursements)
- Informe le PM du runway disponible pour calibrer les decisions d'investissement
- Travaille avec le Legal pour les obligations contractuelles et fiscales
- Fournit les donnees financieres au Data Analyst pour les dashboards de performance
