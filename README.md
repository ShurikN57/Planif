# Planif

Planification d'entraînement course à pied et calcul des allures, sous forme de PWA installable.

**Application :** https://shurikn57.github.io/Planif/

- Génération de plans (blocs et calendrier jusqu'à la course) à partir de références de performance.
- Calcul des allures, des prévisions et de la charge personnalisée.
- Envoi des séances vers COROS (OAuth PKCE) et association aux activités Strava.
- Fonctionne hors ligne ; les données restent dans le navigateur.

## Développement

Site statique servi par GitHub Pages depuis `main` : aucun build, aucune dépendance d'exécution. Node.js 22.13+ (branche 22, voir `.nvmrc`) ou 24+ sert uniquement aux vérifications ; `npm ci` installe les outils de développement (Prettier, ESLint), jamais chargés par l'application.

```sh
npm ci             # outils de développement (une fois)
npm run format     # formate le JavaScript (Prettier)
npm run lint       # ESLint
npm run check      # syntaxe des scripts et du JSON scientifique
npm test           # suite complète (fuseau Europe/Paris)
npm run test:tz    # suite sous plusieurs fuseaux horaires
npm run test:e2e   # scénarios dans Chromium (Playwright)
npm run audit      # audits historiques des règles de planification
npm run serve      # aperçu local sur http://localhost:8080
```

Les audits (`npm run audit`) sont à lancer depuis un clone Git complet avant toute modification des empreintes de `tests/fixtures/`.

## Documentation

- [`DEVELOPMENT.md`](DEVELOPMENT.md) — architecture, vérifications, stockage, publication d'une version.
- [`CHANGELOG.md`](CHANGELOG.md) — journal des versions.
- [`docs/decisions/`](docs/decisions/) — décisions importantes et leurs raisons.
- [`docs/METHODOLOGIE.md`](docs/METHODOLOGIE.md) — méthode de travail (branches, PR, définition de « terminé »).
- [`docs/SECURITE.md`](docs/SECURITE.md) — modèle de sécurité et vérifications du propriétaire.
- [`docs/audit/`](docs/audit/) — audits (complet du 7 novembre 2026, assimilation du 19 octobre, charge personnalisée du 21 octobre).
- [`docs/COROS.md`](docs/COROS.md) — intégration COROS.
- [`CLAUDE.md`](CLAUDE.md) — consignes pour les sessions Claude Code.

## Contribuer

`main` est la production. Toute modification passe par une branche et une pull request dont la CI est verte (voir la méthodologie).
