# Liaison Planif / COROS — première étape

Version 2026.10.04.14 : connexion OAuth avec PKCE, découverte des fonctionnalités et aperçu de la séance affichée. **L’envoi de séances n’est pas encore activé.** Aucune lecture d’activité personnelle et aucune écriture de séance n’est effectuée lors du test de connexion.

## Validation avec le compte COROS

1. Ouvrir Réglages → COROS, sélectionner la région du compte et cliquer sur « Connecter COROS ».
2. Se connecter sur le site officiel COROS et autoriser Planif. Le mot de passe n’est jamais saisi dans Planif.
3. Vérifier le message « Connexion vérifiée » puis utiliser « Exporter les formats COROS ».
4. Faire vérifier les descriptions et schémas réels de `createSingleWorkout` et `createScheduledWorkout` avant de coder l’adaptateur. Ce fichier JSON ne contient ni jeton ni activité personnelle.

Le premier test d’envoi devra sauvegarder une seule séance dans la bibliothèque et vérifier sa réception avant de proposer la programmation à une date. Les options A/B, durées variables, récupérations libres, progressions, séries, fartlek et côtes devront être explicitement traités ; aucun format ne doit être simplifié silencieusement. Les règles et séances passées de Planif restent inchangées.

## Connexion et stockage

- Client OAuth public, enregistré à la demande auprès du serveur régional ; aucun secret embarqué.
- PKCE S256, `state` aléatoire et transaction limitée à quinze minutes.
- Retour vers `index.html?coros_callback=1`, nettoyage des paramètres de connexion dans l’adresse.
- Jetons d’accès et de renouvellement conservés dans `sessionStorage` ; une nouvelle session de navigateur nécessite une reconnexion. La transaction temporaire et l’identifiant public du client utilisent des clés locales dédiées.
- Initialisation MCP et liste paginée des outils uniquement. Pas d’appel `tools/call` dans cette étape.
- Les appels COROS restent hors du cache service worker. Les erreurs n’affichent jamais le contenu brut des réponses de connexion.
- Sur iPhone, le stockage peut être distinct entre Safari et la PWA. Si le retour arrive dans Safari sans transaction correspondante, relancer la connexion depuis Planif ouvert dans Safari.
- « Déconnecter de Planif » efface l’accès local ; la révocation de l’autorisation se fait dans le compte COROS.

## Vérification

`node tests/coros.test.cjs` teste avec un serveur simulé : PKCE, validation du retour, stockage, découverte paginée et SSE, renouvellement, refus et absence de connexion Internet. Ces tests ne remplacent pas un essai réel dans Safari et sur la montre.

Documentation officielle consultée le 4 octobre 2026 :

- https://support.coros.com/hc/en-us/articles/53181619102996-Build-on-COROS-MCP
- https://github.com/coroslab/COROS-MCP
- https://github.com/coroslab/COROS-MCP/blob/main/skill/coros_mcp_login_gateway/scripts/coros_mcp_login.py

La documentation précise que les schémas et limites des outils de création doivent être découverts sur le serveur connecté, avant toute utilisation. Les métadonnées OAuth et les requêtes CORS de découverte, d’enregistrement, d’échange de jeton et de MCP ont été vérifiées pour l’origine `https://shurikn57.github.io` sur le serveur européen. L’authentification réelle reste à tester par le titulaire du compte.
