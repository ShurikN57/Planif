# Planif — consignes pour Claude Code

PWA statique d'entraînement course à pied, publiée par GitHub Pages depuis `main`. Lire `DEVELOPMENT.md` (référence technique), `docs/METHODOLOGIE.md` (méthode) et `docs/decisions/` avant de modifier le comportement.

## Règles

- **Ne jamais pousser sur `main`.** Une branche dédiée par lot ou correction (`fix/…`, `feat/…`, `refactor/…`, `test/…`, `docs/…`), puis une pull request. Ne fusionner que sur demande explicite du propriétaire.
- **Les plans des utilisateurs sont sacrés.** Un changement qui touche les séances futures archive d'abord le plan actif, reste idempotent et ne modifie jamais une semaine commencée ni une séance réalisée. Préciser l'effet sur les plans sauvegardés dans chaque PR.
- **Empreintes** (`tests/fixtures/*.json`) : ne les modifier que pour un changement de règle voulu, avec un script d'audit qui compare les deux commits et explique chaque différence, puis `npm run fixtures:signatures`.
- **Le moteur reste pur** : pas de DOM ni de stockage dans `planif-engine.js` et `planif-rules.js`.
- **Sécurité** : pas de script ni de style inline (CSP stricte), aucun attribut `style` dans les gabarits (`data-css-*`), toute donnée non littérale insérée en HTML passe par `escapeHtml`. Une modification du script de thème de `index.html` impose de mettre à jour son empreinte dans la CSP.
- **Dates** : comparer des jours locaux (`planDateKey`), jamais `toISOString().slice(0, 10)` ; lire et écrire les plans via `localizeSavedPlan` / `serializeSavedPlans`.
- **Version** : toute modification d'un fichier servi (`planif-*.js`, `planif.css`, `index.html`, `sw.js`) se publie avec `npm run version:bump` dans un commit séparé `chore: release …`, et une entrée dans `CHANGELOG.md`.
- **Langue** : documentation en français ; code, commentaires et messages de commit en anglais (Conventional Commits).

## Avant de pousser

```sh
npm run format && npm run lint && npm run check
npm run test:tz            # trois fuseaux, tous bloquants
npm run test:e2e           # si l'interface change
npm run audit              # si les règles de planification changent (clone complet)
```

Un test qui échoue n'est jamais désactivé ni contourné : corriger la cause, ou expliquer pourquoi le test doit changer.
