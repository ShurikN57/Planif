# 0003 — Revue descriptive de la charge par bloc

- Statut : acceptée
- Version : 2026.10.21.10

## Contexte

Il manquait un repère sur la place de la séance principale de chaque semaine dans le bloc et sur la progression du travail ciblé.

## Décision

`reviewBlockLoads` examine une copie détachée du plan placé. La séance principale est celle qui maximise le travail spécifique au bloc (moyenne des options) ; sa part de séance entière et sa part de travail ciblé utilisent le même dénominateur hebdomadaire personnalisé. Les composantes mixtes et les segments de course mixtes/alternés AS10 sont séparés. La progression est affichée dans Calendrier → Chronologie et dans le détail de la séance principale. Une baisse de plus de 5 % des points ciblés est un avertissement heuristique Planif ; un changement de bloc, une semaine partielle, un ajustement de capacité, l'assimilation ou l'affûtage réinitialisent la comparaison. L'assimilation compare le total de points à la semaine de charge précédente, séparément.

Les bandes S2 observées de `RULES.load.blockReview` viennent d'un audit synthétique reproductible de 705 plans (3 niveaux de vitesse, 3–7 h, 3–6 sorties, 1–3 qualités, quatre semaines de charge plus assimilation, calendriers de 27 semaines sur quatre distances). Chaque cellule de calibration garde au moins huit semaines compatibles en volume avec les sorties et qualités demandées ; les intervalles sont les 10e–90e centiles arrondis vers l'extérieur. On interpole seulement entre volumes audités de la même configuration ; on n'extrapole jamais et on n'applique jamais ces bandes à d'autres blocs.

## Conséquences

Aucune séance n'est agrandie ni supprimée pour satisfaire un score. Ces bandes sont des hypothèses descriptives de calibration du moteur, pas des recommandations scientifiques d'entraînement.

## Vérification

`npm run audit:block-load` (vérifie chaque cellule et que la revue des 705 plans ne modifie aucune donnée d'entrée) ; `tests/block-load-review.test.cjs`.
