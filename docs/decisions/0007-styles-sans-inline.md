# 0007 — Politique de sécurité sans styles inline

- Statut : acceptée
- Version : 2026.11.08.05 · lot L7 · audit SEC-3

## Contexte

`style-src` autorisait `'unsafe-inline'` à cause de 18 attributs `style` fixes et d'une vingtaine de valeurs calculées (couleur de phase `--c`, largeurs et fonds des barres de zones).

## Décision

Les styles fixes deviennent des classes utilitaires de `planif.css` (avec `!important`, pour garder la priorité qu'avaient les attributs). Les valeurs calculées sont écrites dans `data-css-c`, `data-css-w` et `data-css-bg`, puis appliquées par le CSSOM (que la politique de sécurité autorise) via `PlanifHtml.observeDataStyles`, un observateur de mutations exécuté avant l'affichage suivant. `style-src` n'autorise plus que `'self'` et Google Fonts.

## Conséquences

Aucun gabarit ne doit contenir d'attribut `style` ; une nouvelle valeur calculée passe par un attribut `data-css-*` (à ajouter dans `planif-html.js` s'il s'agit d'une nouvelle propriété).

## Vérification

`tests/security.test.cjs` (pas de `'unsafe-inline'`, aucun attribut `style`) ; les scénarios navigateur échouent sur toute violation de la politique (contre-épreuve : 199 violations avec les anciens gabarits) ; captures identiques au pixel près à la version précédente.
