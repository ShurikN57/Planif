# Développement de Planif

Planif reste une PWA statique publiée par GitHub Pages depuis `main`, sans étape de build ni dépendance d'exécution. La documentation est en français ; le code, ses commentaires et les messages de commit sont en anglais.

- Ce qui a changé : [`CHANGELOG.md`](CHANGELOG.md).
- Pourquoi les choix importants ont été faits : [`docs/decisions/`](docs/decisions/).
- Comment travailler : [`docs/METHODOLOGIE.md`](docs/METHODOLOGIE.md). Sécurité : [`docs/SECURITE.md`](docs/SECURITE.md).

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de la page, script de thème (haché dans la CSP) et ordre des scripts |
| `planif.css` | Tous les styles (versionné, dans le cache hors ligne ; non formaté par Prettier) |
| `planif-version.js` | Version de l'application |
| `planif-rules.js` | Paramètres de planification |
| `planif-engine.js` | Prévisions, génération des séances, calendriers, placement, aides de présentation pures |
| `planif-studies.json` | Sources scientifiques et résultats extraits |
| `planif-evidence.js` | Questions, métadonnées des règles et audit d'intégrité |
| `planif-ui.js` | Interface, persistance locale, récupération et plans archivés |
| `planif-calcul.js` | Outils de l'onglet Calcul (chronos, endurance, vitesse critique, calculatrice de charge), panneau FC et résumé volume/charge ; `PlanifCalcul.create(deps)` reçoit ses dépendances de l'interface et n'écrit jamais ni plans ni repères |
| `planif-backup.js` | Export/import des données locales (fonctions pures) : format, validation, fusion |
| `planif-html.js` | `escapeHtml` partagé (chargé en premier) et application des styles calculés `data-css-*` |
| `planif-coros.js` | Connexion COROS, aperçu et envoi des séances ([`docs/COROS.md`](docs/COROS.md)) |
| `planif-strava.js` | Connexion du compte athlète et association des activités |
| `planif-calendar-drag.js` | Interaction tactile du calendrier |
| `sw.js` | Cache hors ligne versionné |

## Moteur

`require('./planif-engine.js').createEngine()` crée une instance indépendante du moteur dans Node ; le navigateur utilise le même fichier via `globalThis.PlanifEngine`. Le moteur n'accède ni au DOM ni au stockage local.

Les fonctions facultatives `getActivePlan` et `hasSameStructure` fournissent le calendrier actif lors de la régénération d'un plan sauvegardé. L'interface possède cet état ; les tests peuvent fournir un plan sauvegardé sans simuler le formulaire.

Les données scientifiques sont chargées avant l'initialisation de l'interface. Strava s'initialise une fois son contexte d'interface disponible. Tous les scripts nécessaires et le JSON scientifique sont dans le cache du service worker.

### Invariants de planification

- Les séances de qualité entières (préparation, récupérations et retour au calme compris) sont limitées à 35 % chacune et 50 % ensemble, par rapport au volume cible **et** au volume réel de la semaine de charge. Les sorties longues marathon et les semaines de course/affûtage gardent leurs propres règles.
- Après placement, un footing normal isolé peut absorber le volume manquant, jusqu'à 90 minutes, avec au plus deux footings prolongés. Les Réglages affichent une estimation de capacité pour les séances et jours actuels, pas un maximum universel par nombre de sorties.
- Un changement qui touche les séances futures préserve le plan existant et l'archive avant recalcul. Les seuils d'organisation restent identifiés comme heuristiques Planif dans les métadonnées des règles.
- Charge : [décisions 0001 à 0003](docs/decisions/).

## Vérifications

```sh
npm ci                 # outils de développement (une fois)
npm run format         # Prettier
npm run lint           # ESLint
npm run check          # syntaxe des scripts et du JSON scientifique
npm run test:tz        # tests unitaires et d'intégration, trois fuseaux
npm run test:e2e       # scénarios Chromium
npm run audit          # audits historiques (clone Git complet)
npm run verify-live    # fichiers publics = dépôt (après déploiement)
```

Node.js 22 (voir `.nvmrc`). `package.json` ne déclare aucune dépendance d'exécution ; `npm ci` installe seulement les outils de développement. Le JavaScript est formaté par Prettier (`.prettierrc.json` ; `index.html`, CSS et JSON exclus) et contrôlé par ESLint (noms non déclarés, code inutilisé, égalité lâche).

La CI tourne sur chaque push et chaque pull request : tests sous Europe/Paris, America/Los_Angeles et Pacific/Auckland, *Lint and format*, *Browser tests (Chromium)*, *Planning audits* (bloquants) et *Coverage (informational)*. Sur `main`, la vérification des fichiers publics attend la réussite des contrôles bloquants. `npm run test:tz` lance les trois fuseaux même si l'un échoue, affiche chaque résultat et échoue si l'un d'eux échoue.

### Suites de tests

| Commande | Contenu |
| --- | --- |
| `npm test`, `npm run test:tz` | Tests unitaires et d'intégration (`tests/*.test.cjs`), Europe/Paris ou les trois fuseaux |
| `npm run test:e2e` | Scénarios Chromium via Playwright (`tests/e2e/*.e2e.cjs`) : tous les onglets avec un plan, plan de Paris relu à Los Angeles et Auckland (calendrier affiché), calculatrice de charge, export → import sur un autre appareil et fichier piégé, réouverture hors ligne. Toute violation de la CSP fait échouer un scénario |
| `npm run test:coverage` | Couverture informative des modules chargés par `require()`. Les fichiers exécutés via `vm` dans les tests (interface, COROS, Strava, Calcul, calendrier) ne sont pas mesurés : les scénarios navigateur les couvrent |
| `npm run audit` | Audits historiques des règles de planification |

Les nouveaux tests utilisent des cas `node:test` nommés ; les anciens fichiers-scripts sont convertis lorsqu'ils sont modifiés. Les tests qui inspectent le code source passent par `tests/helpers/source.cjs` (déclarations, fonctions entières, extraits insensibles aux espaces), jamais par des positions de texte exactes. Playwright est figé sur la version dont le Chromium est installé (`npx playwright install --with-deps chromium` en CI). L'intégration de la persistance est isolée dans `tests/helpers/runtime.cjs`.

### Empreintes et audits

`module-equivalence.test.cjs` conserve les empreintes de prévision d'origine (2026.10.18.01) et vérifie les empreintes revues de 252 plans (`plans-after-personal-load.json`). Les références précédentes restent disponibles : `plans-before-modules.json` (avant extraction), `plans-after-balance.json` (corrections voulues de 2026.10.18.03 : durées de footing contextuelles, limites de qualité entière, préparation VO₂ minimale, options mixtes équivalentes, contexte de placement explicite) et `plans-after-assimilation.json` (règles d'assimilation revues de 2026.10.19.44, voir [`docs/audit/AUDIT-2026-10-19.md`](docs/audit/AUDIT-2026-10-19.md)). Les empreintes ne changent que pour un changement de règle voulu, dont les différences attendues sont revues.

Les audits historiques lisent **les deux** moteurs comparés dans Git (`audit-planning-baseline.cjs` : `c3013c5` → `922af38` ; `audit-personal-load.cjs` : `2f8765e` → `5681e48`) et vérifient les empreintes recalculées par rapport à leur référence revue : un changement voulu ultérieur ne peut pas les invalider. Un nouveau changement voulu des règles reçoit son propre script d'audit comparant ses deux commits. `audit-block-load.cjs` vérifie les cellules de calibration de la revue par bloc ([décision 0003](docs/decisions/0003-revue-charge-par-bloc.md)).

`tests/fixtures/plans-week-signatures.json` contient des signatures courtes (16 caractères hexadécimaux) de chaque plan revu sans ses semaines et de chaque semaine. Si une empreinte diffère, `module-equivalence` nomme le scénario, le type de plan et les semaines modifiées. Après un changement de règle revu qui a mis à jour la référence complète, lancer `npm run fixtures:signatures` : le script refuse d'écrire tant que chaque empreinte revue n'est pas reproduite.

## Stockage local

Toutes les données restent dans le navigateur (`localStorage` ; jetons COROS dans `sessionStorage`). Réglages → Outils propose **Exporter mes données** et **Importer une sauvegarde** ; dès qu'un plan actif existe, l'application demande un stockage persistant (`navigator.storage.persist()`) et en affiche l'état. Voir la [décision 0005](docs/decisions/0005-sauvegarde-export-import.md).

| Clé | Contenu | Sauvegarde |
| --- | --- | --- |
| `planif-global-v1` | Repères et physiologie (`GLOBAL_IDS`) | oui |
| `planif-block-draft-v1`, `planif-calendar-draft-v1` | Brouillons du formulaire par mode | oui |
| `planif-active-plan-v1` | Plan actif, avec `dateZone` | oui |
| `planif-plan-history-v1` | Plans archivés, avec `dateZone` | oui |
| `planif-mode-v1`, `planif-weekly-balance-v2` | Mode, marqueur de migration | oui |
| `planif-theme`, `planif-speed-unit`, `calc-allures-ui`, `calc-allures-tab`, `calc-allures-calview`, `planif-coros-profile-v1` | Préférences | oui |
| `planif-recovery-before-2026101706`, `planif-recovery-state-v1`, `planif-before-restore-*`, `planif-before-import-latest` | Copies de sécurité et état de récupération | non |
| `planif-reference-plan-pending-v1` | Application de repères en attente | non (effacée à l'import) |
| `planif-coros-v1`, `planif-coros-capabilities-v1`, `planif-strava-auth-v1`, `planif-strava-records-v1:*` | Données d'appareil et de compte | non |
| `calc-allures-v7` | Ancienne source de migration | non |

Le fichier de sauvegarde (`format: planif-backup`, `schema: 1`) contient les chaînes brutes des clés exportées (`PlanifBackup.KEYS`). Une nouvelle clé exportée doit y être ajoutée avec sa règle de validation.

## Fuseaux horaires

Les calendriers du moteur utilisent des `Date` à minuit local. Les plans sauvegardés enregistrent `dateZone` via `serializeSavedPlans`, et `localizeSavedPlan` ramène `date`, `start`, `startDate` et `endDate` au même jour calendaire dans le fuseau actuel ; `dateZone` n'existe que dans le stockage. Les clés de jour (`moves`, liens Strava, séances réalisées) sont des chaînes `AAAA-MM-JJ`. Les tests comparent des jours locaux ; les empreintes historiques utilisent `tests/helpers/paris-dates.cjs` pour sérialiser les dates comme sous Europe/Paris. Voir la [décision 0004](docs/decisions/0004-dates-et-fuseaux.md).

## Sécurité du code

- La CSP n'autorise aucun script ni style inline. Le script de thème est autorisé par son empreinte SHA-256 : toute modification impose de mettre à jour cette empreinte dans la politique (vérifié par `tests/security.test.cjs`).
- Aucun attribut `style` dans les gabarits : classes de `planif.css`, ou attributs `data-css-*` appliqués par `PlanifHtml` ([décision 0007](docs/decisions/0007-styles-sans-inline.md)).
- Toute donnée non littérale insérée dans du HTML passe par `escapeHtml` (`planif-html.js`).
- Le SDK Firebase est figé en 10.14.1 avec des empreintes d'intégrité SHA-384. Conserver les points d'accès régionaux COROS et ceux de Firebase Auth en modifiant la politique.
- Les échecs d'enregistrement des préférences sont journalisés ; un échec d'écriture du plan affiche un avertissement visible.
- Modèle de sécurité et vérifications du propriétaire : [`docs/SECURITE.md`](docs/SECURITE.md).

## Publier une version

1. `npm run version:bump` (version `AAAA.MM.JJ.NN` du jour) ou `npm run version:bump -- AAAA.MM.JJ.NN --label <libellé-du-cache>`. Le script met à jour `planif-version.js`, les URL versionnées de `index.html` (scripts et feuille de style), l'URL du JSON scientifique dans `planif-ui.js`, ainsi que le nom et le contenu du cache de `sw.js`. Il refuse d'écrire si ces emplacements sont déjà incohérents ou si la version n'est pas postérieure. `npm run version:check` (et `tests/version.test.cjs`) vérifie la cohérence.
2. Ajouter l'entrée correspondante dans `CHANGELOG.md`.
3. Après la fusion dans `main`, `.github/workflows/release.yml` relance les contrôles et crée le tag `v<version>` avec une release GitHub (lancement manuel possible : Actions → Release Planif → Run workflow ; sans effet si le tag existe).
4. Vérifier que les fichiers publics correspondent au commit (`verify-live`, automatique sur `main`).
