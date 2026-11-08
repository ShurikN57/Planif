# 0002 — Statistiques hebdomadaires recalculées depuis le calendrier placé

- Statut : acceptée
- Version : 2026.10.21.06

## Contexte

Les minutes de qualité, les pourcentages et les points de chaque semaine venaient de listes et compteurs hebdomadaires qui pouvaient être périmés après un déplacement de séance ou une mise à jour.

## Décision

`recalculatePlanSummary` recalcule l'affichage à partir des éléments réellement placés dans le calendrier. Les minutes de qualité additionnent les parties de travail de la première option (y compris les séances en distance et mixtes), hors échauffement, récupération et endurance active ; le S1 des sorties longues et le travail de course sont inclus. Les pourcentages se rapportent au volume prévu placé. Toutes les semaines affichées, passées et réalisées comprises, utilisent les coefficients personnalisés actuels.

## Conséquences

Le plan actif d'origine est archivé une fois avant la migration « summary-version-2 » ; dates, identifiants, formats, allures et validations restent intacts. Ensuite, l'affichage mobile réconcilie une copie, jamais le plan stocké. L'API de comptabilité qui protège le passé et les garde-fous de planification sont inchangés. Les points décrivent la charge prescrite, pas une charge mesurée sur les activités liées. La migration ne dépend pas de la date du jour.

## Vérification

`tests/program-load.test.cjs`, `tests/weekly-balance.test.cjs`.
