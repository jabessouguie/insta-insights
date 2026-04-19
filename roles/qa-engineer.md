# Role: QA Engineer (Quality Assurance)

## Contexte

InstaInsights dispose d'un pipeline CI/CD sur GitHub Actions avec des etapes de lint, type-check,
tests Jest et build. La base de code compte actuellement 71 tests unitaires couvrant les modules
critiques. Le QA Engineer est responsable de garantir la qualite globale du produit au-dela
de l'execution automatisee.

## Mission

Garantir que chaque fonctionnalite livree fonctionne correctement dans tous les scenarios d'usage
prevus, et qu'aucune regression ne passe en production.

## Responsabilites principales

### Tests Fonctionnels

- Ecrire et maintenir les plans de test pour chaque epic du backlog
- Executer les tests fonctionnels en recette pour chaque story avant validation par le PO
- Tester les cas nominaux ET les cas limites (donnees manquantes, erreurs reseau, exports
  incomplets, cles API absentes)

### Tests Specifiques au Projet

InstaInsights a des flux de donnees complexes qui requierent une attention particuliere :

- **Flux d'import ZIP** : Tester avec des exports Instagram de formats differents (HTML vs JSON,
  exports partiels, comptes sans posts, comptes recents)
- **Flux API Graph Instagram** : Tester les cas d'expiration du token, de quotas API epuises,
  de permissions insuffisantes
- **Generation IA** : Tester les reponses tronquees, les JSON malformes, les timeouts Gemini
- **Media Kit** : Valider la generation HTML sur les 10 themes, et l'export PDF
- **Collab Finder** : Valider la coherence des suggestions selon le tier du createur

### Tests de Regression

- Maintenir une suite de tests de regression executee avant chaque mise en production
- S'assurer que les nouvelles fonctionnalites n'introduisent pas de regression sur les modules
  existants (dashboard, interactions, collabs, mediakit)

### Contribution aux Tests Automatises

- Travailler avec le developpeur full stack pour ecrire des tests d'integration et E2E
  (Playwright recommande pour les tests E2E)
- Identifier les scenarios non couverts par les tests automatiques existants et les prioriser

### Bug Reporting

- Documenter les bugs avec precisement : etapes de reproduction, comportement attendu,
  comportement observe, environnement (navigateur, OS, format d'export)
- Classifier les bugs par severite : Bloquant / Majeur / Mineur / Cosmetic
- Suivre la resolution des bugs jusqu'a leur cloture

## Definition of Done (DoD) - Perspective QA

Une story peut etre declaree terminee par le QA lorsque :

- Tous les cas de test du plan de test ont ete executes
- Aucun bug Bloquant ou Majeur n'est ouvert sur la story
- Les tests automatises couvrent les scenarios de la story (ou un ticket est ouvert pour les ajouter)
- La fonctionnalite a ete testee en mode clair ET mode sombre
- La fonctionnalite a ete testee avec un import ZIP et, si applicable, en mode demo (sans export)

## Competences requises

- Experience en tests fonctionnels d'applications web
- Capacite a rediger des plans de test structures
- Connaissance des outils de test automatise (Jest, Playwright ou Cypress)
- Sensibilite aux cas limites et aux comportements inattendus
- Rigueur dans le reporting de bugs

## Interactions avec les autres roles

- Travaille en fin de sprint avec le Product Owner pour valider les stories
- Collabore avec le developpeur full stack sur l'ecriture des tests automatises
- Remonte les bugs visuels au UX/UI Designer
- Rapporte les metriques de qualite (taux de bugs par sprint, couverture de tests) au PM

## Outils recommandes

| Usage | Outil |
|---|---|
| Tests unitaires | Jest + Testing Library |
| Tests E2E | Playwright |
| Bug tracking | GitHub Issues |
| Plan de test | Notion ou fichier markdown dans le depot |
| Coverage | Jest --coverage |
