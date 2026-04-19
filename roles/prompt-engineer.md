# Role: Prompt Engineer / IA Specialist

## Contexte

InstaInsights integre de maniere native plusieurs modeles d'IA generative (Gemini, Anthropic
Claude, OpenAI) via une couche d'abstraction dans `src/lib/ai-provider.ts`. Les fonctionnalites
dependantes de l'IA sont nombreuses et critiques : Media Kit (contexte personnalise), Collab
Finder (suggestions pertinentes), Carousel Generator, Reels Ideas, DM Suggester, Competitive
Analysis, Audience Personas, Reports, etc.

La qualite des outputs IA conditionne directement la valeur percue par l'utilisateur.
Un prompt mal construit produit des resultats generiques ou inutilisables.

## Mission

Concevoir, tester, optimiser et maintenir les prompts utilises dans l'ensemble des
fonctionnalites IA d'InstaInsights. Garantir la coherence, la pertinence et la fiabilite
des outputs generes, quel que soit le modele utilise.

## Responsabilites principales

### Conception & Optimisation des Prompts

- Rediger et versioner tous les prompts de l'application (liste exhaustive ci-dessous)
- Appliquer les meilleures pratiques de prompt engineering :
  role-prompting, chain-of-thought, few-shot examples, contraintes de format JSON strict
- Reduire la frequence des outputs tronques ou malformes (probleme documentee dans
  le contexte du module interview prep — conversation de reference 06807c92)
- Tester systematiquement chaque prompt avec des profils utilisateurs varies
  (nano-influenceur 1K abonnes vs macro-influenceur 500K abonnes)

### Liste des Prompts a Maintenir

| Fonctionnalite | Fichier associe |
|---|---|
| Dashboard Insights | `src/lib/gemini.ts` |
| Collab Finder | `src/app/api/collabs/route.ts` |
| Collab DM Generator | `src/app/api/collabs/dm/route.ts` |
| Collab Email Generator | `src/app/api/collabs/email/route.ts` |
| DM Suggester (Interactions) | `src/app/api/interactions/dm-suggest/route.ts` |
| Media Kit IA context | `src/app/api/mediakit/generate/route.ts` |
| Carousel Generator | `src/app/api/carousel/analyze/route.ts` |
| Reels Ideas | `src/app/api/reels/analyze/route.ts` |
| Story Analyzer | `src/app/api/stories/analyze/route.ts` |
| Competitive Analysis | `src/app/api/competitive/analyze/route.ts` |
| Audience Personas | `src/lib/gemini.ts` |
| Report Generator | `src/app/api/report/generate/route.ts` |
| Bio Generator | `src/app/api/profile/bio/route.ts` |
| Comment Generator | `src/app/api/comments/generate/route.ts` |
| Query (questions libres) | `src/app/api/query/route.ts` |

### Evaluation & Benchmarking

- Definir des criteres d'evaluation qualitative pour chaque type de prompt
  (pertinence, personnalisation, coherence, format)
- Comparer les outputs entre les differents fournisseurs (Gemini vs Anthropic vs OpenAI)
  pour recommander le meilleur modele par fonctionnalite
- Suivre les evolutions des modeles (nouvelles versions Gemini, GPT-5, Claude 4) et
  evaluer leur impact sur les outputs actuels

### Gestion des Couts IA

- Estimer et monitorer les couts API par fonctionnalite (tokens in / tokens out)
- Optimiser les prompts pour reduire la consommation de tokens sans degrader la qualite
- Recommander des strategies de cache pour les prompts a faible variabilite

### Documentation

- Maintenir un catalogue documente de tous les prompts avec :
  version, modele cible, exemples d'inputs / outputs, limites connues, date de derniere revision

## Competences requises

- Expertise en prompt engineering (few-shot, chain-of-thought, JSON mode, system prompts)
- Connaissance approfondie des APIs Gemini, Anthropic et OpenAI
- Capacite d'evaluation qualitative des outputs LLM
- Comprehension du domaine metier : marketing d'influence, Instagram, createurs de contenu
- Notions de TypeScript pour modifier les prompts directement dans le code

## Interactions avec les autres roles

- Collabore etroitement avec le developpeur full stack pour integrer les prompts dans les routes API
- Partage les benchmarks de qualite avec le Product Owner pour prioriser les ameliorations
- Remonte au DevOps les contraintes de couts IA si elles impactent la structure tarifaire
- Consulte le CSM sur les retours utilisateurs relatifs a la qualite des outputs IA
