# Liaison Planif / COROS

Version 2026.10.04.16 : connexion OAuth avec PKCE et envoi explicite d’une séance neuve au calendrier COROS ou dans la bibliothèque. Les entraînements existants et le moteur Planif restent inchangés.

## Premier envoi réel

1. Faire MAJ dans Planif. Si nécessaire, reconnecter le compte dans Réglages → COROS.
2. Ouvrir une séance puis cliquer sur « Envoyer vers COROS ». L’option A ou B affichée est copiée ; elle reste figée dans cet aperçu.
3. Choisir les durées et récupérations variables. Confirmer les phases au ressenti sans alerte d’allure, et, pour les côtes, les récupérations libres terminées avec le bouton Tour.
4. Choisir la destination (calendrier par défaut). La date Planif est préremplie si la séance est datée ; sinon choisir la date. COROS accepte aujourd’hui à J+90, selon le fuseau du profil. Vérifier puis cliquer sur « Ajouter au calendrier COROS », ou choisir la bibliothèque.
5. Ouvrir le calendrier (ou la bibliothèque) dans COROS, vérifier la copie et les éventuelles autres séances de ce jour, puis synchroniser la montre.

Le premier essai conseillé pour valider l’intégration est une séance simple, par exemple 7 × 5 minutes de S1. La réussite simulée des tests ne remplace pas la réception réelle dans l’application et sur la montre.

## Transcription

Le schéma réel exporté par le compte utilisateur le 4 octobre 2026 a été vérifié. Avant une écriture, Planif compare l’empreinte de la description et du schéma actuels de `createSingleWorkout` ou `createScheduledWorkout` avec ceux qui ont été relus. Une différence bloque l’envoi et demande un nouvel export des formats.

- Course à pied : `sportType: 1`.
- Distances en mètres ; durées en secondes entières.
- Allures absolues en secondes/km, calculées à partir des vitesses déjà prescrites. Aucun pourcentage de VMA/LT1 n’est envoyé comme un pourcentage des seuils COROS.
- Groupes non imbriqués, vingt répétitions au maximum par groupe. Une série plus longue est répartie entre plusieurs groupes sans changer le nombre de fractions.
- Pas de récupération après la dernière fraction, sauf lorsqu’elle fait explicitement partie de la structure, comme la descente avant les sprints en côte.
- Les phases sans cible d’intensité nécessitent une confirmation dans l’aperçu. Les phases ouvertes nécessitent aussi la confirmation du passage manuel avec le bouton Tour.
- Les choix de durée n’affectent que la copie COROS, jamais les données ni les séances passées de Planif.

Formats pris en charge : intervalles temps/distance, continu, progression par tiers ou fractions, pyramides, blocs et séances mixtes, fartlek structuré au ressenti, côtes avec récupération libre, footings simples ou actifs continus, sorties longues simples ou terminées au S1, sortie longue marathon continue et course.

Formats refusés explicitement pour cette première version : fartlek libre ; footings avec lignes droites ou côtes courtes ; sortie longue avec bloc actif libre ; sortie longue marathon fractionnée dont la fin facile n’est pas décrite explicitement. Aucun de ces éléments n’est supprimé pour forcer un envoi. La modification d’un entraînement COROS existant n’est pas proposée.

## Résultats et doublons

L’envoi est suivi localement par une empreinte du contenu et du serveur régional ; pour le calendrier, de la destination et de la date également. La même séance peut donc être programmée à plusieurs dates, mais pas deux fois à la même date depuis ce navigateur. Une séance déjà enregistrée ne sera pas recréée depuis ce navigateur. Une tentative interrompue ou rejetée est également bloquée jusqu’à vérification manuelle ; il n’y a aucun nouvel essai automatique de création, même après une erreur 401. Le suivi est conservateur entre comptes utilisant le même navigateur. Il ne garantit pas l’absence de doublons entre navigateurs ou appareils différents.

Les retours bruts, jetons et identifiants internes ne sont pas affichés. Le message d’enregistrement demande toujours de vérifier le calendrier ou la bibliothèque COROS et la réception sur la montre. Aucun appel de création n’est exécuté en arrière-plan.

## Connexion et stockage

- Client OAuth public enregistré à la demande, sans secret embarqué ; PKCE S256 et `state` aléatoire.
- Transaction de connexion limitée à quinze minutes ; nettoyage des paramètres de retour dans l’adresse.
- Jetons dans `sessionStorage` uniquement. Identifiant public de client, transaction temporaire et suivi des envois dans des clés locales dédiées.
- Échanges COROS exclus du cache PWA.
- Sur iPhone, si le retour arrive dans Safari sans transaction correspondante, relancer la connexion depuis Planif ouvert dans Safari.
- « Déconnecter de Planif » efface l’accès local ; la révocation de l’autorisation se fait dans le compte COROS.
- L’export des formats ne contient ni jeton ni activité personnelle.

## Tests

- `node tests/coros.test.cjs` : OAuth PKCE, validation du retour, pagination/SSE, renouvellement, refus, connexion hors ligne, envoi simulé, double clic, doublon, modification du schéma, refus/401/coupure sans nouvel essai automatique.
- `node tests/coros-workouts.test.cjs` : unités et inversion des allures, volumes de travail et récupération, séries de 30/45 fractions, progressions, blocs, fartlek sans cible d’allure, côtes libres, choix de durée, immutabilité et refus des formats incomplets.

Documentation officielle :

- https://support.coros.com/hc/en-us/articles/53181619102996-Build-on-COROS-MCP
- https://github.com/coroslab/COROS-MCP
- https://github.com/coroslab/COROS-MCP/blob/main/skill/coros_mcp_login_gateway/scripts/coros_mcp_login.py

Le schéma de création relu est conservé dans `tests/fixtures/coros-workout-tool.json` et `tests/fixtures/coros-scheduled-tool.json` pour les tests de compatibilité. L’export complet des fonctionnalités et les données personnelles du compte ne sont pas enregistrés dans le dépôt.
