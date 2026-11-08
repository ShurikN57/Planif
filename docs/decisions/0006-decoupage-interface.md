# 0006 — Découpage de l'interface : onglet Calcul et CSS, pas la persistance

- Statut : acceptée
- Version : 2026.11.08.04 · PR #13 · audit COD-2, COD-4

## Contexte

L'audit proposait d'extraire la persistance de `planif-ui.js` dans un `planif-storage.js`. Toute l'interface vit dans une seule fermeture : 357 déclarations, dont 32 variables d'état mutables.

## Décision

Une analyse de portée de toutes les références montre que la persistance lit et écrit l'état partagé (`activePlan`, `planHistory`, `recoveryState`, mode…) à de nombreux endroits : l'extraire demanderait de refondre la gestion d'état. Le plus grand ensemble autonome, l'onglet Calcul (9 fonctions sortantes, 17 dépendances injectées, aucune écriture d'état), devient `planif-calcul.js` (`PlanifCalcul.create(deps)`), déplacé à l'identique. Les styles quittent `index.html` pour `planif.css`.

## Conséquences

`planif-ui.js` passe de 5 025 à 4 321 lignes et `index.html` de 77 Ko à 13 Ko. Une extraction de la persistance relève d'un futur chantier « gestion d'état », avec ses propres tests.

## Vérification

Arbre syntaxique des 52 instructions déplacées identique à l'original ; captures identiques au pixel près ; tests de l'onglet Calcul exécutant le corps de la fabrique.
