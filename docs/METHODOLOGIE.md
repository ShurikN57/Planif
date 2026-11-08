# Méthodologie de travail Planif

Objectif : continuer à livrer vite, sans casser les plans des utilisateurs ni la production.
Ce document accompagne l'audit [`docs/audit/AUDIT-2026-11-07.md`](audit/AUDIT-2026-11-07.md).

## 1. Règles d'or

1. **`main` = production.** On ne pousse jamais directement sur `main`. Tout passe par une branche et une pull request.
2. **CI verte obligatoire** avant fusion (à configurer dans GitHub : *Settings → Branches → Branch protection rules → main* : « Require a pull request » + « Require status checks to pass »).
3. **Un changement = une intention.** Ne pas mélanger dans une même PR : formatage, refactoring, correction de bug et changement de règle métier.
4. **Le moteur reste pur.** Pas de DOM ni de `localStorage` dans `planif-engine.js` et `planif-rules.js`.
5. **Les plans existants sont sacrés.** Tout changement qui touche des séances futures : archiver avant, migration idempotente, ne jamais toucher une semaine commencée ou une séance réalisée.
6. **Les empreintes ne changent que pour un changement de règle voulu**, avec le script d'audit qui explique la différence et un paragraphe dans le CHANGELOG.

## 2. Cycle d'un changement

```
Issue  →  Branche  →  Commits  →  PR (CI)  →  Relecture  →  Fusion  →  Release  →  Vérif. en ligne
```

1. **Issue GitHub** : décrire le problème ou le besoin, le critère de réussite, et la gravité (P1/P2/P3). Une issue par constat d'audit ou par lot.
2. **Branche** depuis `main` à jour :
   - `fix/<sujet>` pour une correction, `feat/<sujet>` pour une fonctionnalité, `refactor/<sujet>`, `docs/<sujet>`, `test/<sujet>`.
3. **Commits** au format Conventional Commits : `type: résumé à l'impératif`, par exemple `fix: keep calendar dates timezone-independent`.
   Types : `feat` (fonctionnalité visible), `fix` (correction), `refactor` (sans changement de comportement), `test`, `docs`, `ci`, `chore` (version, outillage), `style` (formatage seul). Le titre de la PR suit le même format, car il devient le message du commit *squash* sur `main`.
   Petits commits ; le premier commit d'une correction de bug peut être le **test qui échoue**.
4. **Vérifications locales avant push :**
   ```sh
   npm run format        # Prettier, avant de committer
   npm run lint
   npm run check
   npm run test:tz       # les trois fuseaux
   # si les règles de planification changent :
   TZ=Europe/Paris node scripts/audit-planning-baseline.cjs
   TZ=Europe/Paris node scripts/audit-personal-load.cjs
   TZ=Europe/Paris node scripts/audit-block-load.cjs
   ```
5. **Pull request** : description courte avec *Pourquoi*, *Quoi*, *Effet sur les plans sauvegardés*, *Empreintes modifiées (oui/non + justification)*, *Comment tester sur téléphone*.
6. **Relecture** : relire le diff soi-même le lendemain ou faire relire (Claude Code `/code-review` peut aider). Tester sur l'iPhone via l'aperçu si l'UI change.
7. **Fusion** : *Squash and merge* pour garder un historique de `main` lisible.
8. **Release** : regrouper plusieurs PR fusionnées, puis une PR `chore: release AAAA.MM.JJ.NN` qui monte la version **une fois** avec `npm run version:bump` (cf. `DEVELOPMENT.md`). Après sa fusion, le workflow *Release Planif* crée le tag `vAAAA.MM.JJ.NN` et la release GitHub avec la liste des PR. Une PR qui ne touche que la documentation, les tests ou la CI ne change pas la version.
9. **Vérification en ligne** : la CI exécute `verify-live.cjs` sur `main` ; ouvrir l'application sur le téléphone et faire « MAJ ».

## 3. Rythme conseillé

- Viser **quelques livraisons par semaine**, pas des dizaines par jour : chaque version force une mise à jour du cache chez l'utilisateur.
- Pour les essais rapides d'interface, travailler sur une branche et tester localement (`npx serve .` ou `python3 -m http.server`) plutôt que de publier en production pour voir le résultat.
- Garder un « lot » d'audit par PR (voir §4 de l'audit) ; ne pas commencer L5 (formatage) au milieu d'un autre lot, car il touche toutes les lignes.

## 4. Travailler avec Claude Code

- Donner **une issue ou un lot précis** par session (« corrige TZ-1 et TZ-2 selon l'audit »), avec les critères de réussite.
- Demander explicitement : branche dédiée, tests ajoutés, suite complète verte, et résumé de l'effet sur les plans sauvegardés.
- Ne pas laisser Claude modifier une empreinte (`tests/fixtures/*.json`) sans le script d'audit correspondant et une explication.
- Un fichier `CLAUDE.md` à la racine peut rappeler ces règles (commandes de test, interdiction de pousser sur `main`, règles de préservation des plans) pour qu'elles soient appliquées à chaque session.

## 5. Définition de « terminé »

Une correction est terminée quand :

- [ ] le test qui reproduit le problème existe et passe ;
- [ ] `check-syntax` et la suite complète passent (et la matrice `TZ` une fois le lot L3 fait) ;
- [ ] les empreintes sont inchangées, ou leur changement est expliqué et audité ;
- [ ] la documentation ou le CHANGELOG est à jour ;
- [ ] la PR est fusionnée, la version publiée et vérifiée en ligne ;
- [ ] l'issue est fermée avec le lien vers la PR.
