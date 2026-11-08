# 0004 — Dates des plans sauvegardés indépendantes du fuseau

- Statut : acceptée
- Version : 2026.11.08.01 · PR #10 · audit TZ-1 à TZ-3

## Contexte

Le moteur produit des jours à minuit local (`Date`), enregistrés comme instants UTC. Un même instant ne désigne un jour qu'avec le fuseau qui l'a écrit : un plan créé à Paris et ouvert à Londres ou Los Angeles reculait chaque séance d'un jour.

## Décision

Chaque écriture du plan actif et de l'historique passe par `serializeSavedPlans`, qui enregistre `dateZone` (nom IANA). Chaque lecture passe par `localizeSavedPlan`, qui ramène `date`, `start`, `startDate` et `endDate` à minuit local du même jour calendaire dans le fuseau actuel. `dateZone` n'existe que dans le stockage. Pour les plans plus anciens, le décalage de l'auteur est retrouvé grâce au jour de course enregistré ; à défaut, minuit local correspondant ou minuit UTC le plus proche.

## Conséquences

Aucune migration destructive : les plans existants gardent leurs jours et reçoivent `dateZone` à la sauvegarde suivante. Les clés de jour (`moves`, liens Strava, séances réalisées) sont déjà des chaînes `AAAA-MM-JJ` et ne changent pas. Les tests comparent des jours locaux, jamais `toISOString().slice(0, 10)`.

## Vérification

Suite complète bloquante sous Europe/Paris, America/Los_Angeles et Pacific/Auckland ; `tests/saved-plan-dates.test.cjs` ; scénario navigateur « plan de Paris relu à Los Angeles et Auckland ».
