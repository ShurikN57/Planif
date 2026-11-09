# 0009 — Copies de sécurité bornées : la restauration n'en écrit plus

- Statut : acceptée
- Version : 2026.11.09.01

## Contexte

Sur iPhone, « Restaurer ce plan » échouait avec « The quota has been exceeded. ». Chaque restauration écrivait, avant toute autre opération, une copie complète du plan actif **et de tout l'historique** sous une clé horodatée `planif-before-restore-<horodatage>`, jamais supprimée. Un plan pèse 170 à 300 Ko de JSON (340 à 600 Ko comptés par Safari, en UTF-16), pour une limite d'environ 5 Mo par site : une ou deux restaurations suffisaient à saturer le stockage. L'écriture de la copie étant hors du bloc de gestion d'erreur, le message technique brut s'affichait et chaque nouvel essai échouait.

## Décision

- La restauration n'écrit plus de copie complète. Le plan actif remplacé est archivé dans l'historique par les mêmes écritures ; en cas d'échec, les valeurs précédentes sont remises en place et la mémoire reste inchangée. La copie était donc redondante.
- Au démarrage, les anciennes copies `planif-before-restore-*` sont compactées : un plan qui n'existerait que dans une copie (identifiant absent du plan actif et de l'historique) est d'abord ajouté à l'historique, puis les copies sont supprimées. Si cet ajout ne peut pas être enregistré, les copies sont conservées.
- Un stockage plein donne un message en français, et le plan actuel est conservé.
- La copie de récupération unique (`planif-recovery-before-2026101706`) ne bloque plus le démarrage si elle ne peut pas être écrite.

## Conséquences

Une restauration fait grandir le stockage d'environ un plan (l'archive du plan remplacé), jamais d'une copie de tout l'historique. Les seules copies de sécurité restantes sont uniques et écrasées : récupération (une fois) et avant import (`planif-before-import-latest`). Toute nouvelle copie de sécurité doit être unique, ou bornée, et ne jamais bloquer l'opération qu'elle protège.

## Vérification

`tests/restore-storage.test.cjs` (stockage simulé avec la limite et le comptage de Safari) : restaurations répétées sans copie et avec une croissance bornée ; restauration possible après des copies qui remplissaient le stockage ; plan unique récupéré avant suppression ; copies conservées si l'ajout est impossible ; message clair et stockage intact quand il est plein. Scénario Chromium : stockage rempli jusqu'à la limite réelle du navigateur, puis restauration depuis « Mes plans » ; ce scénario échoue sur la version précédente.
