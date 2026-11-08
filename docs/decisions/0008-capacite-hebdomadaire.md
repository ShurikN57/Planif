# 0008 — Estimation de la capacité hebdomadaire dans « Volume et charge »

- Statut : acceptée
- Version : 2026.11.08.07

## Contexte

L'aperçu « Compatibilité du volume » des Réglages, qui estimait la capacité hebdomadaire, n'était plus affiché depuis 2026.10.19.01 et a été supprimé en 2026.11.08.06 (COD-6). Quand la cible dépasse ce que le moteur construit, l'utilisateur voyait l'écart sans savoir s'il pouvait être comblé, ni comment.

## Décision

- **Capacité d'une semaine placée** (`weeklyCapacity`, moteur) :
  - semaine de charge restée sous sa cible au-delà de la tolérance hebdomadaire (2,5 %) : **le volume construit** sert d'estimation prudente ; le moteur n'explore pas toutes les autres répartitions possibles ;
  - sinon : volume construit + ce que l'absorption après placement pourrait encore ajouter (jusqu'à 90 min pour au plus deux footings normaux, 70 min pour les autres ; rien pour un footing de jour protégé, de récupération ou d'endurance active).

  Cette définition ne surestime jamais ce que le moteur construit : un premier essai « volume + marge » pour toutes les semaines annonçait de la marge inutilisée dans 1 162 semaines courtes sur 4 409 (par exemple quand un footing ne trouve pas de jour).
- **Comparaison** (`capacitySummary`) : moyenne des capacités et moyenne des cibles **des mêmes semaines de charge** (hors assimilation, introduction, affûtage et semaine de course), chacune avec sa propre cible. La ligne « Cible moyenne du plan » conserve le réglage pour l'ensemble de la préparation.
- **Message** (`capacityAdvice`, affiché dans Calendrier → Chronologie → « Volume et charge ») seulement si la cible moyenne dépasse la capacité moyenne au-delà de la tolérance : « Sur les semaines de charge, Planif estime le volume atteignable à environ X par semaine, pour une cible moyenne de Y. Réduis la cible ou ajoute une sortie si ton planning le permet. » X est arrondi aux 5 minutes inférieures, Y au plus proche.
- **Sortie supplémentaire** proposée seulement si : un jour est disponible au-delà des sorties prévues ; la saisie est acceptée par le moteur ; le calendrier simulé place toutes les sorties des semaines de charge sans avertissement de placement ni de proximité entre qualités ou avec la sortie longue ; et la capacité estimée augmente. Sinon : « Réduis la cible. »

## Conséquences

Le chiffre est présenté comme une estimation. Aucun plan sauvegardé ni aucune cible n'est modifié ; le calcul se fait à l'affichage (environ 6 ms avec la vérification de la sortie supplémentaire, résultat mis en cache tant que les réglages et le plan ne changent pas). Les empreintes de plans sont inchangées.

## Vérification

`tests/capacity.test.cjs` : semaines synthétiques au résultat calculé à la main ; trois calendriers réels au résultat connu (footing plafonné à 90 min, footing de récupération à 45 min, footing de jour protégé à 45 min) ; propriétés sur plus de 500 semaines (capacité ≥ volume construit, égale au volume construit pour une semaine courte) ; moyennes sur les mêmes semaines ; quatre cas de conseil (cible atteignable, aucun jour libre, jours libres, jour libre mais capacité inchangée) ; plan non modifié. Scénario navigateur : textes exacts du message, absent quand la cible est atteignable.
