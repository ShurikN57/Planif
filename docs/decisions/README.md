# Décisions

Chaque fichier explique une décision importante : son contexte, ce qui a été décidé, ses conséquences et comment elle est vérifiée. Une décision n'est pas réécrite après coup : si elle change, une nouvelle décision la remplace et l'ancienne passe au statut « remplacée ».

| N° | Décision | Version | Statut |
| --- | --- | --- | --- |
| [0001](0001-charge-personnalisee.md) | Charge du programme personnalisée, garde-fous historiques conservés | 2026.10.21.04 | Acceptée |
| [0002](0002-reconciliation-statistiques.md) | Statistiques hebdomadaires recalculées depuis le calendrier placé | 2026.10.21.06 | Acceptée |
| [0003](0003-revue-charge-par-bloc.md) | Revue descriptive de la charge par bloc | 2026.10.21.10 | Acceptée |
| [0004](0004-dates-et-fuseaux.md) | Dates des plans sauvegardés indépendantes du fuseau | 2026.11.08.01 | Acceptée |
| [0005](0005-sauvegarde-export-import.md) | Export et import des données locales | 2026.11.08.02 | Acceptée |
| [0006](0006-decoupage-interface.md) | Découpage de l'interface : onglet Calcul et CSS, pas la persistance | 2026.11.08.04 | Acceptée |
| [0007](0007-styles-sans-inline.md) | Politique de sécurité sans styles inline | 2026.11.08.05 | Acceptée |
| [0008](0008-capacite-hebdomadaire.md) | Estimation de la capacité hebdomadaire dans « Volume et charge » | 2026.11.08.07 | Acceptée |

## Modèle

```markdown
# NNNN — Titre

- Statut : proposée | acceptée | remplacée par NNNN
- Version : AAAA.MM.JJ.NN · PR #…

## Contexte
## Décision
## Conséquences
## Vérification
```
