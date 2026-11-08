# 0001 — Charge du programme personnalisée, garde-fous historiques conservés

- Statut : acceptée
- Version : 2026.10.21.04 · détail : [audit de la charge personnalisée](../audit/AUDIT-2026-10-21-CHARGE-PERSONNALISEE.md)

## Contexte

La calculatrice de charge et le programme affichaient des points calculés différemment. Les seuils de sécurité du moteur (semaine lourde à 0,18 point de travail par minute, séance la plus coûteuse, placement des récupérations) avaient été calibrés sur l'ancienne échelle.

## Décision

Le programme affiche les points personnalisés de la calculatrice (modèle partagé dans `planif-engine.js`). La comptabilité historique reste interne et continue de piloter les garde-fous ; son résultat est conservé dans `safetyLoad`. Ses seuils ne sont pas remplacés par les scores publics, plus bas. Hors des hypothèses de durée (allures incohérentes, course hors 6–240 min, plus de 110 % de VMA), des replis explicites et signalés s'appliquent.

## Conséquences

Les points affichés valent 0,46 à 0,58 fois les anciens, sans aucun changement de séance, de minute, d'allure ni de jour. C'est une heuristique Planif inspirée de Daniels, pas une mesure physiologique.

## Vérification

`npm run audit:personal-load` (252 plans, 2 142 semaines, aucun changement hors comptabilité) ; `tests/program-load.test.cjs`.
