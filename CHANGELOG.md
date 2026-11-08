# Journal des versions

Les versions suivent le format `AAAA.MM.JJ.NN`. Depuis novembre 2026, chaque version publiée a un tag `v<version>` et une release GitHub. Le détail complet est dans l'historique Git ; les raisons des choix importants sont dans [`docs/decisions/`](docs/decisions/).

## 2026.11.08.07 — Capacité hebdomadaire estimée

- « Volume et charge » (Calendrier → Chronologie) indique, quand la cible est hors de portée, le volume hebdomadaire maximal estimé avec les jours et séances actuels, et conseille de réduire la cible ou, si le moteur peut la placer et qu'elle aide, d'ajouter une sortie ([décision 0008](docs/decisions/0008-capacite-hebdomadaire.md)). Plans et cibles inchangés.

## 2026.11.08.06 — Code d'interface inutilisé retiré (COD-6)

- Sept éléments d'interface qui n'étaient plus utilisés sont supprimés, dont l'ancien aperçu « Compatibilité du volume » des Réglages, retiré de l'écran depuis 2026.10.19.01. Rendu inchangé.
- La limite de deux footings prolongés par semaine a désormais un test du moteur.

## 2026.11.08.05 — Sécurité et documentation (lot L7)

- La politique de sécurité refuse les styles inline : classes utilitaires et valeurs calculées appliquées par le CSSOM ; rendu identique au pixel près ([décision 0007](docs/decisions/0007-styles-sans-inline.md)).
- Le formulaire de connexion Flow Strava précise qu'il ne s'agit pas des identifiants Strava.
- Documentation en français : `DEVELOPMENT.md` réécrit, ce journal, les décisions (`docs/decisions/`), le modèle de sécurité (`docs/SECURITE.md`), `CLAUDE.md` ; audits regroupés dans `docs/audit/`, intégration COROS dans `docs/COROS.md`.

## Lot L6 — Tests (sans nouvelle version de l'application)

- Audits historiques figés sur leurs commits revus et exécutés en CI ; `audit:planning` réparé.
- Écarts d'empreintes lisibles (scénario et semaines modifiées) ; signatures par semaine.
- Scénarios Chromium (Playwright) en CI, dont l'ouverture hors ligne ; couverture informative.

## 2026.11.08.04 — Découpage de l'interface (lot L5, partie 2)

- Outils de l'onglet Calcul déplacés dans `planif-calcul.js` ; styles déplacés dans `planif.css` ([décision 0006](docs/decisions/0006-decoupage-interface.md)).

## 2026.11.08.03 — Lisibilité (lot L5, partie 1)

- JavaScript formaté par Prettier et contrôlé par ESLint ; code inutilisé retiré. Comportement inchangé (arbres syntaxiques identiques).

## 2026.11.08.02 — Sauvegarde des données (lot L4)

- Réglages → Outils : exporter ses données et importer une sauvegarde, avec validation stricte, copie de sécurité et mode récupération ; stockage persistant demandé ; un seul échappement HTML ([décision 0005](docs/decisions/0005-sauvegarde-export-import.md)).

## 2026.11.08.01 — Dates et fuseaux horaires (lot L3)

- Un plan sauvegardé garde ses jours quand le téléphone change de fuseau (voyage) ; auparavant, chaque séance pouvait reculer d'un jour ([décision 0004](docs/decisions/0004-dates-et-fuseaux.md)).

## Lots L1 et L2 — Filet de sécurité et versions (sans nouvelle version de l'application)

- CI sur toutes les branches et pull requests, Node 22, trois fuseaux ; `package.json`, README.
- Script unique de montée de version ; tags et releases automatiques.
- Audit complet du projet : [`docs/audit/AUDIT-2026-11-07.md`](docs/audit/AUDIT-2026-11-07.md).

## Octobre 2026

| Versions | Principaux changements |
| --- | --- |
| 2026.10.22.01 | Informations hebdomadaires du calendrier simplifiées |
| 2026.10.21.01 – .10 | Calculatrice de charge personnalisée et courbes allure-durée ; charge du programme personnalisée avec garde-fous conservés ([0001](docs/decisions/0001-charge-personnalisee.md)) ; statistiques recalculées depuis le calendrier placé ([0002](docs/decisions/0002-reconciliation-statistiques.md)) ; déplacement des séances par appui long ; revue de la séance principale et de la progression par bloc ([0003](docs/decisions/0003-revue-charge-par-bloc.md)) |
| 2026.10.20.01 – .07 | Indices d'endurance comparant jusqu'à quatre références ; champs de temps natifs dans Calcul ; affichage des centièmes |
| 2026.10.19.01 – .44 | Onglet Calcul (chronos, vitesse critique et D′, convertisseur, roues de saisie) ; zones FC Flow Strava ; éditeur de repères transactionnel ; mise à jour sûre du programme futur avec archive ; garde-fous sur les gains de vitesse ; règles d'assimilation stabilisées et revues ([audit](docs/audit/AUDIT-2026-10-19.md)) |
| 2026.10.18.01 – .03 | Séances hebdomadaires ajustées au volume ; moteur et données scientifiques séparés en modules ; limites de qualité entière et capacité en direct |
| 2026.10.17.01 – .10 | Repères modifiables, convertisseur allure/vitesse ; protection et restauration des plans sauvegardés ; validation des saisies ; progression des durées de fraction ; plafond du travail spécifique |
| 2026.10.13.01 – .04 | Connexions COROS et Firebase persistantes ; vérification des fichiers publiés ; tests sur `main` |
| 2026.10.10.08 – .16 | Validation des séances par les activités Strava ; déplacement des séances dans la semaine ; titres COROS courts |
| 2–6 octobre | Première PWA installable ; règles scientifiques S1/S2/VO₂ et bibliothèque d'études ; plan actif persistant ; thème clair/sombre ; liaison COROS (OAuth PKCE, envoi au calendrier ou à la bibliothèque, préparation personnelle) ; 10 km spécifique |
