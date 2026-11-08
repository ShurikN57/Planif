# 0005 — Export et import des données locales

- Statut : acceptée
- Version : 2026.11.08.02 · PR #11 · audit SEC-1, DAT-1 à DAT-3

## Contexte

Toutes les données étaient dans le seul `localStorage`, sans copie possible ; Safari peut effacer le stockage d'un site non installé.

## Décision

`planif-backup.js` (fonctions pures) définit un fichier `planif-backup` (schéma 1) contenant les chaînes brutes des clés de planification et des préférences (`PlanifBackup.KEYS`), jamais les données d'appareil ou de compte (COROS, Strava, copies de récupération). L'import refuse les clés inconnues et les réglages d'affichage inconnus, les plans et séances invalides, les fichiers de plus de 8 Mo, les clés de prototype et tout `<`. Avant d'écrire, il conserve les valeurs actuelles dans `planif-before-import-latest` ; le plan actif remplacé est archivé ; le plan importé s'ouvre en mode récupération, sans recalcul des séances ; chaque plan garde son `dateZone`. L'application demande un stockage persistant et en affiche l'état. Un seul `escapeHtml` (`planif-html.js`) sert à tous les gabarits.

## Conséquences

Ajouter une clé exportée impose de l'ajouter à `PlanifBackup.KEYS` avec sa règle de validation. Le refus de `<` complète la politique de sécurité : un fichier importé ne peut pas injecter de balise.

## Vérification

`tests/backup.test.cjs`, `tests/html.test.cjs` ; scénario navigateur export → import sur un autre appareil et fichier piégé refusé.
