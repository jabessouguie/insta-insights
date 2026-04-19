# Role: Developpeur Mobile (PWA / React Native)

## Contexte

InstaInsights est actuellement une application desktop-only. La roadmap prevoit une version
mobile (PWA) en backlog long terme (post-M6, RICE score 1.4 — effort eleve). Cependant,
la demande des utilisateurs pour un acces mobile est forte, notamment pour :
- Consulter son dashboard en deplacement
- Generer un DM depuis l'application Interactions directement sur smartphone
- Partager son Media Kit depuis un lien mobile

Deux approches sont envisageables : **PWA** (Progressive Web App, extension de l'existant
Next.js) ou **React Native** (application native cross-platform). Ce role couvre les deux.

## Mission

Etendre InstaInsights vers les plateformes mobiles en garantissant une experience utilisateur
fluide, rapide et adaptee aux contraintes des appareils mobiles.

## Responsabilites principales

### Option A : PWA (recommandee pour la Phase 3)

- Configurer le Service Worker et le manifest PWA dans Next.js (via `next-pwa`)
- Implémenter le cache offline pour les pages critiques (dashboard, Media Kit)
- Optimiser les performances mobiles : Core Web Vitals, LCP, FID, CLS
- Adapter les composants Tailwind existants pour une experience tactile optimale
  (zones de tap >= 44px, absence de hover-only interactions)
- Tester l'installation en homescreen sur iOS (Safari) et Android (Chrome)

### Option B : React Native (long terme)

- Structurer une architecture React Native compatible avec la logique metier existante
  (reutilisation des types TypeScript et de la couche API)
- Implémenter les ecrans prioritaires : Dashboard, Interactions, Media Kit share, Collab Finder
- Integrer les notifications push (via Expo Notifications) pour les alertes de performance
- Publier sur l'Apple App Store et le Google Play Store

### Tests Mobile

- Tester sur les appareils et navigateurs mobiles les plus utilises :
  iPhone (Safari), Android (Chrome), tablettes
- Automatiser les tests E2E mobile (Playwright Mobile ou Detox pour React Native)

## Contraintes specifiques au projet

- Le parsing de l'export ZIP Instagram (Cheerio, `fs`) ne peut pas fonctionner cote client
  dans une PWA. Sur mobile, le flux de donnees passera necessairement par l'API Graph
  Instagram ou par un upload vers un backend.
- Les appels aux LLM (Gemini, Anthropic) se font via les routes API Next.js — compatibles
  avec la PWA sans modification.
- Le Media Kit Generator produit un HTML complet — l'export PDF (`window.print()`) ne
  fonctionne pas de maniere fiable sur mobile. Il faudra prevoir une alternative
  (generation cote serveur via Puppeteer ou html2canvas).

## Competences requises

- Maitrise de React (prerequis commun avec le fullstack)
- Experience avec les PWA (Service Workers, Cache API, Web App Manifest)
- Ou : experience avec React Native / Expo
- Bonne comprehension des contraintes de performance mobile
- Connaissance des guidelines UI mobile (iOS Human Interface Guidelines, Material Design)

## Interactions avec les autres roles

- Travaille en etroite collaboration avec le UX/UI Designer pour adapter les maquettes
  au contexte mobile (design responsif, navigation, gestes)
- Coordonne avec le developpeur full stack pour partager la couche API et les types TypeScript
- Remonte au DevOps les besoins d'infrastructure supplementaires (generation PDF serveur-side,
  notifications push, configuration HTTPS obligatoire pour PWA)
