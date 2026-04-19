# Role: Responsable Juridique & Conformite (Legal)

## Contexte

InstaInsights opère dans un environnement reglementaire sensible :
- **RGPD** : Traitement de donnees personnelles d'utilisateurs europeens (profils Instagram,
  comportements sur la plateforme)
- **Conditions d'utilisation Meta** : L'utilisation de l'API Graph Instagram est soumise
  a une politique stricte de Meta concernant la collecte, le traitement et le stockage des
  donnees Instagram
- **Monetisation** : Les plans payants (Pro / Agency) impliquent des CGV, une politique de
  remboursement et des mentions legales conformes
- **Donnees sensibles** : L'application peut traiter indirectement des informations sur des
  tiers (abonnes des utilisateurs, comptes analyses)

## Mission

Garantir la conformite juridique et reglementaire du produit. Proteger l'entreprise des risques
legaux et instaurer la confiance des utilisateurs par la transparence.

## Responsabilites principales

### Conformite RGPD

- Rediger et maintenir la politique de confidentialite (page `/privacy` deja existante dans
  l'application — a valider juridiquement)
- Rediger la procedure de suppression des donnees (page `/deletion` existante — a valider)
- S'assurer que la collecte de donnees analytics (Posthog) est couverte par un bandeau de
  consentement conforme a la directive ePrivacy
- Realiser un registre des traitements de donnees (ROPA) et nommer un DPO si necessaire
- Repondre aux demandes d'exercice de droits des utilisateurs (acces, rectification,
  effacement, portabilite)

### Conditions d'Utilisation Meta & API Instagram

- Surveiller les evolutions des conditions d'utilisation de l'API Graph Instagram
- S'assurer que l'utilisation de l'API est conforme a la politique de Meta concernant
  la limitation de la collecte de donnees
- Gerer le processus de revue de l'application Meta si l'application depasse les limites
  de l'API sandbox
- Identifier les risques lies a l'analyse de comptes tiers (competitive analysis) et
  proposer des garde-fous

### Documents Contractuels

- Rediger les Conditions Generales de Vente pour les plans Pro et Agency
- Rediger les Conditions Generales d'Utilisation
- Rediger la politique de remboursement
- Rediger les eventuels contrats de sous-traitance (Stripe, Supabase, Vercel, Gemini)
  dans le cadre du RGPD (DPA - Data Processing Agreement)

### Propriete Intellectuelle

- Proteger la marque InstaInsights (depot de marque si applicable)
- Verifier la conformite des licences des dependances open-source utilisees
- Cadrer l'utilisation des contenus generes par l'IA (droits sur les Media Kits, emails,
  captions produits par Gemini / Anthropic)

## Points d'attention specifiques au projet

- L'application traite les donnees d'export Instagram localement (cote client) —
  c'est un argument RGPD fort a mettre en avant, mais il doit etre documente et verifiable.
- L'analyse competitive (`/creator/competitive`) implique l'analyse de comptes Instagram tiers.
  Ce module necessite une revue juridique approfondie au regard des CGU de Meta.
- En mode API Graph, les tokens d'acces utilisateur ont une duree de vie limitee et doivent
  etre renouveles. Le stockage de ces tokens doit etre securise et documente.

## Interactions avec les autres roles

- Collabore avec le DevOps pour s'assurer que les pratiques de stockage des donnees
  (Supabase, localStorage) sont conformes
- Alertement le PM et le developpeur en cas de risque juridique sur une fonctionnalite
- Fournit les textes legaux (CGV, CGU, Politique de confidentialite) au developpeur
  pour integration dans l'application
- Consulte le Growth Marketer sur les pratiques d'email marketing (consentement, opt-out)
