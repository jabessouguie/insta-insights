# Role: Product Owner (PO)

## Contexte

InstaInsights est un MVP fonctionnel avec 15+ modules livres. La prochaine etape est de passer
d'un projet solo a un produit SaaS viable. Le Product Owner est le gardien du backlog et le
representant des utilisateurs au sein de l'equipe.

## Mission

Definir, prioriser et maintenir le backlog produit. S'assurer que chaque fonctionnalite developpee
repond a un besoin reel des utilisateurs, est bien specifiee, et peut etre livree dans les delais
prevus par la roadmap.

## Responsabilites principales

### Gestion du Backlog

- Maintenir le backlog produit ordonne par valeur delivree (RICE score reference dans `ROADMAP.md`)
- Rediger des User Stories claires et actionnables, au format :
  "En tant que [persona], je veux [action] afin de [benefice]"
- Definir les criteres d'acceptance (Definition of Done) pour chaque story
- Decouper les epics en stories suffisamment petites pour etre livrees en un sprint de 2 semaines

### Sprint Planning

- Participer aux ceremonies Scrum (sprint planning, sprint review, sprint retrospective)
- Valider avec le developpeur la faisabilite technique de chaque story avant l'engagement de sprint
- Arbitrer les compromis entre scope, delais et qualite (triangle fer)

### Validation Fonctionnelle

- Tester chaque fonctionnalite livree en recette avant mise en production
- Valider que les criteres d'acceptance sont satisfaits
- Remontez les anomalies et les ecarts de comportement au developpeur

### Relation Utilisateurs

- Recueillir les retours utilisateurs (interviews, NPS, bug reports) et les transformer en
  stories actionnables
- Prioriser les correctifs en fonction de leur impact utilisateur et de leur urgence

## Exemples de User Stories pour la Phase 1 (NOW)

**Epic : Audience Growth Tracking**
- "En tant que createur, je veux voir l'evolution de mes abonnes sur les 30 derniers jours afin
  de comprendre si mes actions ont un impact positif."
- "En tant que createur, je veux comparer mes performances sur 30, 90 et 365 jours afin
  d'identifier mes tendances de croissance."

**Epic : Onboarding Wizard**
- "En tant que nouvel utilisateur, je veux etre guide en 4 etapes pour importer mes donnees
  afin d'atteindre mon premier insight en moins de 5 minutes."

**Epic : Landing Page**
- "En tant que visiteur, je veux comprendre en moins de 10 secondes ce que fait InstaInsights
  afin de decider si je veux m'inscrire."

## Definition of Done (DoD) standard

Une story est consideree terminee lorsque :
- Le code est merge sur `main` et tous les tests CI/CD passent
- Les tests unitaires couvrent la logique metier de la fonctionnalite
- La fonctionnalite a ete validee en recette par le PO
- La documentation utilisateur (si applicable) est mise a jour

## Competences requises

- Maitrise des methodologies Agile (Scrum, Kanban)
- Capacite a rediger des User Stories claires et des criteres d'acceptance non ambigus
- Sens de la priorisation et capacite a dire non
- Comprehension suffisante des contraintes techniques pour dialoguer avec le developpeur
- Connaissance du marche des createurs de contenu et des outils analytics Instagram

## KPIs d'impact

| Metrique | Cible |
|---|---|
| Velocity moyenne de l'equipe | Stable ou croissante d'un sprint a l'autre |
| Taux de stories livrees conformement aux criteres d'acceptance | >= 90% |
| Time-to-Value pour les nouvelles fonctionnalites | <= 2 sprints entre spec et livraison |

## Interactions avec les autres roles

- Travaille quotidiennement avec le developpeur full stack pour clarifier les specifications
- Aligne le backlog avec la vision strategique du Product Manager
- Collabore avec le UX/UI Designer pour s'assurer que les stories incluent les maquettes
  necessaires avant le debut du sprint
- Valide les livraisons avec le QA Engineer en fin de sprint
