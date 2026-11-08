# Sécurité de Planif

## Modèle

Planif est une page statique : aucun serveur Planif, aucune base de données Planif. Les plans restent dans le navigateur. Deux services externes sont utilisés, chacun avec sa propre connexion :

| Service | Rôle | Authentification | Où sont les secrets |
| --- | --- | --- | --- |
| COROS (MCP régional) | Envoi de séances vers la montre | OAuth public avec PKCE S256 et `state` aléatoire ; aucun secret client | Jetons dans `localStorage`, exclus des sauvegardes |
| Flow Strava (`strava-mobile-2f93f`, Firebase) | Activités Strava et zones FC de l'athlète | Compte Firebase (e-mail et mot de passe) du service Flow Strava ; jeton d'identité Firebase envoyé à `/api/*` | Session Firebase gérée par le SDK |

Le compte demandé dans Réglages est celui de **Flow Strava**, le service qui relie Strava : ce ne sont **pas** les identifiants du compte Strava. Planif ne voit jamais le mot de passe Strava.

## Protections dans le code

- **Politique de sécurité du contenu (CSP)** : aucun script ni style inline (le script de thème est autorisé par son empreinte SHA-256), `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`, liste fermée des domaines de connexion (COROS, Firebase, Flow Strava).
- **Intégrité** : les scripts Firebase App et Auth sont figés en 10.14.1 avec empreintes SHA-384.
- **Échappement** : une seule fonction `escapeHtml` pour toute donnée non littérale insérée dans du HTML.
- **Import de sauvegarde** : validation stricte, refus de tout `<` et des clés de prototype, copie de sécurité avant écriture.
- **COROS** : aucune nouvelle tentative automatique d'écriture, protection contre les doublons, vérification de l'empreinte du schéma d'outil avant l'envoi.
- **Tests** : `tests/security.test.cjs`, `tests/html.test.cjs`, `tests/backup.test.cjs` ; les scénarios navigateur échouent sur toute violation de la CSP.

## Limites connues

- **Clickjacking** : la CSP est posée par une balise `<meta>` (GitHub Pages ne permet pas d'en-têtes HTTP) ; la directive `frame-ancestors` y est ignorée. Risque faible pour une application sans action sensible déclenchable en un clic ; à reconsidérer en cas d'hébergement permettant des en-têtes.
- **Outils de développement** : `npm audit` signale des alertes modérées dans `minimatch`, utilisé par ESLint pour lire sa configuration ; rien de cela n'est chargé par l'application.

## Vérifications à faire par le propriétaire

Ces réglages ne sont pas dans ce dépôt ; seul le propriétaire des projets peut les faire.

### 1. Restreindre la clé API Firebase — référent externe accepté lors de l'audit du 8 novembre 2026

La [clé API Firebase](https://firebase.google.com/docs/projects/api-keys) de `planif-strava.js` identifie le projet et est publique par conception. Lors de l'audit, une requête de configuration avec un référent `https://example.com/` a été acceptée. Cela justifie de vérifier les restrictions de la clé ; le test ne démontre ni l'accès aux données privées, ni l'absence de restrictions sur les API. L'accès aux données dépend de l'authentification et des contrôles d'autorisation du serveur.

Dans la [console Google Cloud](https://console.cloud.google.com/apis/credentials) du projet `strava-mobile-2f93f` → **Identifiants** → la clé *Browser key* :

- **Restrictions relatives aux applications** → *Sites Web (référents HTTP)* : `https://shurikn57.github.io/*`, `https://strava-mobile-2f93f.web.app/*`, `https://strava-mobile-2f93f.firebaseapp.com/*` (et `http://localhost/*` seulement si nécessaire en développement).
- **Restrictions relatives aux API** : limiter aux API utilisées par Firebase Auth (*Identity Toolkit API*, *Token Service API*) et aux autres API réellement utilisées par Flow Strava.

Vérifier ensuite que la connexion fonctionne dans Planif et dans Flow Strava.

### 2. Firebase Authentication

- Si seul toi utilises Flow Strava : désactiver la **création de comptes** par les utilisateurs (Authentication → Paramètres → Actions utilisateur).
- Activer la **protection contre l'énumération des adresses e-mail**.
- *Domaines autorisés* : `shurikn57.github.io` n'y figure pas. C'est sans effet pour la connexion par e-mail et mot de passe utilisée par Planif ; à ajouter seulement si une connexion par fenêtre ou redirection (Google, etc.) est un jour utilisée depuis Planif.

### 3. Service `/api/*` de Flow Strava

Relecture du [code de Flow Strava](https://github.com/ShurikN57/Strava-Firebase/tree/c9c6e495977ba4410fb61deb34e80fb64216f50f/functions) :

- Les routes `me`, `planif/plans/*` et `planif/activities` exigent un jeton d'identité Firebase vérifié côté serveur.
- Les lectures et écritures sont rattachées à l'`uid` authentifié. Le mode multi-athlète exige un contrôle administrateur avant de changer le compte cible ; `me` utilise toujours l'identité du jeton.
- CORS autorise Planif et les deux domaines Firebase Hosting de Flow Strava. Cette liste limite les appels depuis les navigateurs ; elle ne remplace pas l'authentification.

Il reste à vérifier que ces contrôles sont bien ceux du service déployé, avec une requête sans jeton et un essai d'accès entre deux comptes de test.

### 4. GitHub

- Protection de `main` : exiger tous les contrôles bloquants (`Tests (Europe/Paris)`, `Tests (America/Los_Angeles)`, `Tests (Pacific/Auckland)`, `Lint and format`, `Browser tests (Chromium)`, `Planning audits`).
- Activer les alertes Dependabot et l'analyse des secrets (Settings → Code security).
