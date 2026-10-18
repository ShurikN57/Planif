/* PlanifEvidence: isolated module, browser and Node entry points. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./planif-rules.js'));
  else root.PlanifEvidence=factory(root.PlanifRules);
})(globalThis,function(RULES){
function createEvidence(data){
const EVIDENCE_ENUMS={
  origin:['not_evaluated','strong_science','partial_science','consensus','internal_heuristic','product_choice'],
  confidence:['not_evaluated','high','moderate','low','very_low'],
  decision:['not_evaluated','keep','modify','monitor'],
  kind:['physiological','organizational','estimation'],
  /* SOURCES */
  studyType:['meta_analysis','systematic_review','narrative_review','rct','non_randomized_trial','longitudinal','acute_study','consensus','methodological'],
  level:['sedentary','recreational','trained','elite'],
  intensityAnchor:['pct_vvo2max','pct_vma','critical_speed','lactate','heart_rate','race_pace','rpe'],
  outcome:['performance','chronic_physiology','acute_response'],
  riskOfBias:['low','moderate','high'],
  sourceStatus:['to_verify','verified'],
  /* FINDINGS */
  direction:['supports','nuances','contradicts','neutral']
};
/* Questions neutres : formulées sans présupposer la réponse ni la valeur actuelle du moteur */
const QUESTIONS={
  Q_RUNNING_ECONOMY:{"theme": "economy", "text": "Quels facteurs et interventions modifient l’économie de course ?"},
  Q_BIOMECHANICS_INJURY:{"theme": "biomechanics", "text": "Que montrent les études sur la mécanique de course et les blessures ?"},
  Q_FOOTWEAR:{"theme": "footwear", "text": "Comment les chaussures influencent-elles le coût énergétique de la course ?"},
  Q_NUTRITION:{"theme": "nutrition", "text": "Quel rôle jouent les apports nutritionnels dans la performance et la récupération ?"},
  Q_SLEEP:{"theme": "sleep", "text": "Quels liens et interventions sont documentés entre sommeil et récupération sportive ?"},
  Q_S1_INTENSITY:{theme:'s1',text:'Où situer l\'intensité du travail au premier seuil, et faut-il l\'ajuster au volume de travail de la séance ?'},
  Q_S1_STRUCTURE:{theme:'s1',text:'Quelles durées ou distances de fraction, et quels volumes de travail, pour développer le premier seuil ?'},
  Q_S1_RECOVERY:{theme:'s1',text:'Quelle récupération entre fractions pour un travail au premier seuil ?'},
  Q_S2_INTENSITY_BY_REP_DURATION:{theme:'s2',text:'Quelle intensité autour du second seuil selon la durée des fractions et le volume total de la séance ?'},
  Q_S2_STRUCTURE:{theme:'s2',text:'Quelles durées ou distances de fraction, et quels volumes de travail, pour développer le second seuil ?'},
  Q_S2_RECOVERY:{theme:'s2',text:'Quelle récupération entre fractions pour un travail autour du second seuil ?'},
  Q_VO2_INTENSITY:{theme:'vo2',text:'Quelle intensité selon la durée des fractions pour solliciter VO₂max ?'},
  Q_VO2_STRUCTURE:{theme:'vo2',text:'Quels formats et quels volumes de travail pour développer VO₂max et la puissance aérobie ?'},
  Q_VO2_RECOVERY:{theme:'vo2',text:'Quelle récupération entre fractions et entre séries pour un travail orienté VO₂max ?'},
  Q_PROGRESSIVE_OVERLOAD:{theme:'progression',text:'Comment faire progresser la charge au cours d’un bloc sans augmenter simultanément volume, intensité et densité ?'},
  Q_MIXED_SESSIONS:{theme:'mixed',text:'Dans quels contextes utiliser une séance combinant plusieurs qualités, et comment limiter le volume de chaque composante ?'},
  Q_SPEC10K_INTENSITY:{theme:'spec10k',text:'Faut-il moduler l\'intensité autour de l\'allure 10 km selon la durée des fractions ?'},
  Q_SPEC10K_STRUCTURE:{theme:'spec10k',text:'Quels formats de travail à allure 10 km pour préparer une course de 10 km ?'},
  Q_SPEC10K_RECOVERY:{theme:'spec10k',text:'Quelle récupération entre fractions à allure 10 km ?'},
  Q_SPEC10K_VOLUME:{theme:'spec10k',text:'Quel volume de travail à allure 10 km par séance ?'},
  Q_SESSION_MAX_WORK:{theme:'safeguards',text:'Quel volume de travail maximal par séance selon l\'intensité ?'},
  Q_LOAD_WEIGHTING:{theme:'load',text:'Comment estimer le coût relatif d\'une minute d\'effort selon l\'intensité et la densité de la séance ?'},
  Q_WEEKLY_LOAD:{theme:'load',text:'Comment identifier une semaine chargée, et faut-il alors adapter les jours faciles ?'},
  Q_BLOCK_PROGRESSION:{theme:'blocks',text:'Comment faire évoluer la structure des séances au fil d\'un bloc ?'},
  Q_BLOCK_WORK_VOLUME:{theme:'blocks',text:'Quel volume de travail ciblé par séance en début et en fin de bloc, selon la qualité développée ?'},
  Q_INTENSITY_DISTRIBUTION:{theme:'blocks',text:'Quelle part du temps hebdomadaire consacrer au travail de qualité selon la qualité développée ?'},
  Q_SESSION_COMBINATION:{theme:'blocks',text:'Quelle séance complémentaire associer à la séance principale d\'un bloc ?'},
  Q_ASSIMILATION:{theme:'volume',text:'Quand placer une semaine d\'assimilation, et quelle réduction de charge y appliquer ?'},
  Q_LOAD_PROGRESSION:{theme:'volume',text:'Comment faire progresser le volume hebdomadaire au fil d\'un bloc et d\'une préparation ?'},
  Q_VOLUME_MODULATION:{theme:'volume',text:'Le volume hebdomadaire habituel doit-il moduler le volume de travail des séances de qualité, et dans quelle mesure selon l\'intensité ?'},
  Q_LONG_RUN:{theme:'organization',text:'Quelle durée et quelle part du volume hebdomadaire pour la sortie longue, et faut-il y intégrer du travail ?'},
  Q_EASY_RUNS:{theme:'recovery',text:'Quelle durée et quel placement pour les footings faciles ?'},
  Q_WARMUP:{theme:'organization',text:'Quel échauffement et quel retour au calme autour d\'une séance de qualité ?'},
  Q_SESSION_SPACING:{theme:'calendar',text:'Quel espacement entre séances de qualité, et entre une qualité et la sortie longue ?'},
  Q_PERIODIZATION:{theme:'calendar',text:'Quelle séquence et quelle durée de blocs avant une course de 10 km selon le temps disponible ?'},
  Q_TAPER:{theme:'calendar',text:'Comment organiser la dernière semaine avant une course de 10 km ?'},
  Q_HILLS:{theme:'hills',text:'Quels formats de côtes pour développer la force spécifique et l\'économie de course ?'},
  Q_SPEC_OTHER:{theme:'specOther',text:'Quels formats spécifiques pour le 5 km, le semi-marathon et le marathon ?'},
  Q_PERF_PREDICTION:{theme:'prediction',text:'Comment estimer une performance sur une autre distance à partir d\'une performance connue ?'}
};
/* SOURCES — schéma effectivement utilisé par la bibliothèque :
   { id:'SRC_001', title, authors:[], year, journal, doi, url, studyType,
     population:{level, n}, result, limitations, themes:[], status:'to_verify'|'verified' } */
const SOURCES=data.SOURCES;
/* Portée documentaire : les sources de contexte ne prescrivent aucune nouvelle règle. */
const CONTEXT_SOURCE_IDS=['SRC_026','SRC_027','SRC_028','SRC_029','SRC_031','SRC_032','SRC_033','SRC_034','SRC_038'];
const sourceScope=id=>CONTEXT_SOURCE_IDS.includes(id)?'context':'engine';
const scopeLabel=id=>sourceScope(id)==='context'?'Contexte':'Moteur';
/* FINDINGS — un résultat précis extrait d'une source pour une question. Schéma :
   { id:'FND_001', sourceId, questionId, statement, parameters:{}, direction,
     directness:{population, outcome} } */
const FINDINGS=data.FINDINGS;
const RULE_META=(()=>{
  const m=(questionId,kind,meta={})=>Object.assign({questionId,kind,origin:'not_evaluated',confidence:'not_evaluated',decision:'not_evaluated',findings:[],lastReview:null,reviewSummary:null},meta);
  return{
  'blocks.aero.A':m('Q_BLOCK_WORK_VOLUME','organizational',{origin:'internal_heuristic',confidence:'moderate',decision:'modify',lastReview:'2026-10-03',reviewSummary:'Le bloc aérobie comporte une seule vraie qualité hebdomadaire : un fartlek de 8–24 min de travail cumulé, piloté au ressenti et sans cible d’allure. Les efforts courts peuvent être plus vifs ; les longs restent davantage contrôlés.'}),
  'blocks.aero.B':m('Q_SESSION_COMBINATION','organizational',{origin:'product_choice',confidence:'moderate',decision:'modify',lastReview:'2026-10-03',reviewSummary:'Aucune deuxième ou troisième vraie qualité n’est générée en développement aérobie, même si le réglage général autorise 2 ou 3 qualités.'}),
  'blocks.aero.budget':m("Q_INTENSITY_DISTRIBUTION","organizational",{"origin": "partial_science", "confidence": "moderate", "decision": "modify", "findings": ["FND_014", "FND_025"], "lastReview": "2026-10-03", "reviewSummary": "Bloc à dominante basse intensité ; le budget de travail qualitatif est limité à 5–15 %. SRC_035 : soutien indirect issu de l’aviron à une dominante basse intensité ; le budget exact reste heuristique. SRC_037 compare POL/THR, dans un contexte différent de LOW/MIX chez les rameurs : ces études ne valident ni une supériorité universelle ni les 5–15 % Planif."}),
  'blocks.aero.maxQualities':m('Q_SESSION_COMBINATION','organizational',{origin:'product_choice',confidence:'moderate',decision:'keep',lastReview:'2026-10-03',reviewSummary:'Plafond spécifique du bloc aérobie : une seule vraie séance de qualité par semaine.'}),
  'blocks.aero.fartlek':m("Q_SESSION_COMBINATION","organizational",{"origin": "internal_heuristic", "confidence": "low", "decision": "keep", "findings": [], "lastReview": "2026-10-03", "reviewSummary": "Fartlek sans cible chronométrique : effort contrôlé au ressenti, récupération en footing facile, structure adaptable au terrain. Aucune preuve externe directement reliée dans la revue actuelle : prescription pratique Planif, sans revendication de consensus scientifique vérifié."}),
  'blocks.aero.ramp':m('Q_LOAD_PROGRESSION','organizational'),
  'blocks.aero.shortHills':m("Q_HILLS","organizational",{"origin": "partial_science", "confidence": "moderate", "decision": "keep", "findings": ["FND_024", "FND_005", "FND_006", "FND_026"], "lastReview": "2026-10-03", "reviewSummary": "SRC_017 apporte une comparaison de programmes de côtes chez des coureurs ; SRC_026/027 fournissent un contexte économie et renforcement indirect. Le format exact 6–10 × 10–15 s à 6–10 %, l’alternance avec les lignes droites et le statut hors qualité restent heuristiques. SRC_038 apporte un contexte supplémentaire sur renforcement et économie, avec possible chevauchement des études de SRC_027 ; pas de validation directe du format de côtes."}),
  'blocks.assimilation':m('Q_ASSIMILATION','organizational',{origin:'internal_heuristic',decision:'modify',lastReview:'2026-10-10',reviewSummary:'Choix de programmation : la qualité est remplacée par un Jogg avec un bloc d’endurance active sous LT1. Les durées exactes ne sont pas une prescription scientifique universelle.'}),
  'blocks.eco.A':m('Q_BLOCK_WORK_VOLUME','organizational'),
  'blocks.eco.B':m('Q_SESSION_COMBINATION','organizational'),
  'blocks.eco.budget':m('Q_INTENSITY_DISTRIBUTION','organizational'),
  'blocks.s1.A':m('Q_BLOCK_WORK_VOLUME','organizational'),
  'blocks.s1.B':m('Q_SESSION_COMBINATION','organizational'),
  'blocks.s1.budget':m('Q_INTENSITY_DISTRIBUTION','organizational'),
  'blocks.s2.A':m('Q_BLOCK_WORK_VOLUME','organizational'),
  'blocks.s2.B':m('Q_SESSION_COMBINATION','organizational'),
  'blocks.s2.budget':m('Q_INTENSITY_DISTRIBUTION','organizational'),
  'blocks.s2.longRunS1EndMinutes':m('Q_LONG_RUN','organizational'),
  'blocks.s2.sequence':m('Q_SESSION_COMBINATION','organizational'),
  'blocks.spec.0.B':m('Q_SESSION_COMBINATION','organizational',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "findings": ["FND_004"], "lastReview": "2026-10-03", "reviewSummary": "Essai HIIT avec mesure sur 5 km : adaptations physiologiques sans gain significatif de performance à quatre semaines. Lien indirect ; alternance des compléments Planif non validée."}),
  'blocks.spec.0.K':m('Q_BLOCK_WORK_VOLUME','organizational'),
  'blocks.spec.0.budget':m('Q_INTENSITY_DISTRIBUTION','organizational'),
  'blocks.spec.1.B':m('Q_SESSION_COMBINATION','organizational'),
  'blocks.spec.1.K':m('Q_BLOCK_WORK_VOLUME','organizational'),
  'blocks.spec.1.budget':m("Q_INTENSITY_DISTRIBUTION","organizational",{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "findings": ["FND_003", "FND_025"], "lastReview": "2026-10-03", "reviewSummary": "Essai 10 km sur la distribution globale ; avantage seulement en sous-analyse. Budget Planif exact non validé. SRC_037 complète la revue de distribution globale POL/THR ; lien indirect au budget spécifique 10 km, dont les valeurs exactes restent heuristiques."}),
  'blocks.spec.2.B':m('Q_SESSION_COMBINATION','organizational'),
  'blocks.spec.2.K':m('Q_BLOCK_WORK_VOLUME','organizational'),
  'blocks.spec.2.budget':m('Q_INTENSITY_DISTRIBUTION','organizational'),
  'blocks.spec.3.B':m('Q_SESSION_COMBINATION','organizational'),
  'blocks.spec.3.K':m('Q_BLOCK_WORK_VOLUME','organizational'),
  'blocks.spec.3.budget':m('Q_INTENSITY_DISTRIBUTION','organizational',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "findings": ["FND_001"], "lastReview": "2026-10-03", "reviewSummary": "Essai marathon directement pertinent pour comparer POL/PYR ; soutien indirect à ce budget. Ses pourcentages exacts restent une heuristique."}),
  'blocks.vma.A':m('Q_BLOCK_WORK_VOLUME','organizational'),
  'blocks.vma.B':m('Q_SESSION_COMBINATION','organizational'),
  'blocks.vma.budget':m('Q_INTENSITY_DISTRIBUTION','organizational'),
  'calendar.assimilationAfterLoadWeeks':m('Q_ASSIMILATION','organizational'),
  'calendar.envelope':m('Q_LOAD_PROGRESSION','organizational'),
  'calendar.introFooting':m('Q_PERIODIZATION','organizational'),
  'calendar.introWeekMinDays':m('Q_PERIODIZATION','organizational'),
  'calendar.maxConsecutiveLoadWeeks':m('Q_ASSIMILATION','organizational'),
  'alternating10k':m('Q_SESSION_COMBINATION','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-06',reviewSummary:'Format choisi avec l’utilisateur : 8–10 alternances de 400 m S1 légèrement au-dessus de LT1 / 400 m AS10, sans récupération. Durée cible et marge de vitesse heuristiques ; tout le bloc est compté dans la charge.'}),
  'weeklyFormats':m('Q_SESSION_COMBINATION','organizational',{origin:'product_choice',confidence:'low',decision:'monitor',lastReview:'2026-10-06',reviewSummary:'Complémentarité psychologique : éviter deux séances à fractions longues dans une semaine spécifique 10 km. Seuils 6 et 4 minutes heuristiques ; le volume de travail reste contrôlé séparément.'}),
  'calendar.specific10k':m('Q_PERIODIZATION','organizational',{origin:'product_choice',confidence:'low',decision:'keep',lastReview:'2026-10-06',reviewSummary:'Priorité utilisateur : quatre semaines de charge spécifique AS10, cinq si nécessaire. L’affûtage est distinct ; comprimer les phases précédentes avant de raccourcir le spécifique.'}),
  'calendar.longRun10k':m('Q_LONG_RUN','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',findings:['FND_027'],lastReview:'2026-10-06',reviewSummary:'Plafonds pratiques 10 km : 90 min, puis 60 min à sept jours ou moins de la course, sans compensation par une sortie longue. L’étude soutient l’affûtage global, pas ces plafonds numériques.'}),
  'calendar.minSpecificWeeks':m('Q_PERIODIZATION','organizational'),
  'calendar.phaseSequence':m('Q_PERIODIZATION','organizational'),
  'calendar.placement':m('Q_SESSION_SPACING','organizational'),
  'calendar.segment':m('Q_PERIODIZATION','organizational'),
  'calendar.taper':m("Q_TAPER","organizational",{"origin": "partial_science", "confidence": "moderate", "decision": "modify", "findings": ["FND_002", "FND_021", "FND_027"], "lastReview": "2026-10-03", "reviewSummary": "SRC_006 soutient la réduction du volume avec maintien de l’intensité lors de l’affûtage ; SRC_023 décrit les plans marathon. Soutien au principe général ; J−2 repos et J−1 15–25 min faciles + 3–5 lignes droites de 10–15 s restent des heuristiques. SRC_039 fournit le cadre général de deux semaines et 41–60 % de réduction ; ce résultat ne rend pas universels ces chiffres ni le découpage quotidien Planif. SRC_006 et SRC_039 ne sont pas présumées indépendantes."}),
  'calendar.tieBreak':m('Q_PERIODIZATION','organizational'),
  'hills.descentRecoveryFactor':m('Q_HILLS','physiological'),
  'hills.long':m('Q_HILLS','physiological'),
  'hills.longEffortAboveS2':m('Q_HILLS','physiological'),
  'hills.short':m('Q_HILLS','physiological'),
  'hills.sprintMinutes':m('Q_HILLS','physiological'),
  'hills.sprintSpeedOfVma':m('Q_HILLS','physiological'),
  'hills.totalFactor':m('Q_HILLS','physiological'),
  'library.phaseBoundaries':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.blocs]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.deg]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.long]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.med]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.mix]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.prog]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.pyr]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.short]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.time]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[p10.xlong]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.cont]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.desc]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.dist]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.long]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.mix]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.progCont]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.progFrac]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.pyr]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s1.time]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.blocs]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.deg]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.dense]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.dist]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.longDist]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.longTime]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.prog]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.pyr]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[s2.time]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[vo2.int]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[vo2.longDist]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[vo2.longTime]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[vo2.medDist]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[vo2.medTime]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[vo2.pyr]':m('Q_BLOCK_PROGRESSION','organizational'),
  'library.phaseWeights[vo2.shortDist]':m('Q_BLOCK_PROGRESSION','organizational'),
  'load.anchors':m('Q_LOAD_WEIGHTING','physiological'),
  'load.density':m('Q_LOAD_WEIGHTING','physiological'),
  'load.densityShortRecovery':m('Q_LOAD_WEIGHTING','physiological'),
  'load.heavyWeek':m('Q_WEEKLY_LOAD','organizational'),
  'load.intensity':m('Q_LOAD_WEIGHTING','physiological'),
  'load.sessionZone':m('Q_LOAD_WEIGHTING','physiological'),
  'load.zones':m('Q_LOAD_WEIGHTING','physiological'),
  'organization.longRun':m('Q_LONG_RUN','organizational',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "findings": ["FND_002"], "lastReview": "2026-10-03", "reviewSummary": "Observation de prescriptions marathon, sans preuve d’efficacité ni plafond universel. Durées et parts hebdomadaires Planif restent heuristiques."}),
  'organization.qualityFrequency':m("Q_MIXED_SESSIONS","organizational",{"origin": "internal_heuristic", "confidence": "low", "decision": "keep", "findings": [], "lastReview": "2026-10-03", "reviewSummary": "Le nombre de qualités reste choisi par l’athlète. Deux qualités sont possibles dès 4 sorties mais plutôt recommandées à partir de 5 ; trois qualités nécessitent au moins 6 sorties. La troisième est allégée. Aucune preuve externe directement reliée dans la revue actuelle : prescription pratique Planif, sans revendication de consensus scientifique vérifié."}),
  'organization.activeEndurance':m('Q_INTENSITY_DISTRIBUTION','organizational',{origin:'internal_heuristic',confidence:'moderate',decision:'modify',lastReview:'2026-10-10',reviewSummary:'En développement aérobie : au plus une fois par semaine, 15 à 45 min à 92–98 % de la vitesse LT1, avec LT1 comme plafond. En assimilation, la règle dédiée limite le bloc à 10, 15 ou 20 min.'}),
  'organization.assimilationActive':m('Q_ASSIMILATION','organizational',{origin:'internal_heuristic',confidence:'low',decision:'modify',lastReview:'2026-10-10',reviewSummary:'Choix utilisateur : un Jogg avec un bloc de 10, 15 ou 20 min d’endurance active remplace la qualité. Durée adaptée au Jogg disponible, début et fin faciles, sans dépasser LT1. Pas de qualité comptabilisée.'}),
  'organization.warmup':m('Q_WARMUP','organizational'),
  'organization.preparationByVolume':m('Q_WARMUP','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-18',reviewSummary:'Choix Planif : préparation totale de 15 min et retour au calme de 5 min sous 3 h hebdomadaires ; 20/8 min de 3 à moins de 4 h ; 24/10 min à partir de 4 h. Activation : +3 min. Les lignes droites sont incluses, et les durées sont reprises dans COROS.'}),
  'organization.weeklyFeasibility':m('Q_LOAD_PROGRESSION','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-18',reviewSummary:'Réserver le temps des footings et de la sortie longue avant de retenir les séances complètes. Réduire le travail ciblé puis le nombre de qualités si nécessaire ; conserver les sorties et signaler les demandes incompatibles.'}),
  'prediction.marathonPenalty':m('Q_PERF_PREDICTION','estimation'),
  'prediction.measuredFallbackStep':m('Q_PERF_PREDICTION','estimation'),
  'prediction.measuredStepClamp':m('Q_PERF_PREDICTION','estimation'),
  'prediction.profileSteps':m('Q_PERF_PREDICTION','estimation'),
  'progression.fractions':m('Q_PROGRESSIVE_OVERLOAD','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-17',reviewSummary:'Préférence utilisateur : progression graduelle des fractions par secteur, distances converties en minutes. Hausse préférée de 1 min, limite de sélection max(1,5 fois la durée précédente, +2,5 min), repli sur le format sûr le plus court si nécessaire. Ces valeurs sont des choix Planif, pas des seuils scientifiques. Assimilation sans qualité, avec Jogg et endurance active.'}),
  'progression.priority':m('Q_PROGRESSIVE_OVERLOAD','organizational',{findings:["FND_009"],origin:'partial_science',confidence:'moderate',decision:'keep',lastReview:'2026-10-03',reviewSummary:'La progression porte d’abord sur le volume ciblé ; intensité ou densité peuvent ensuite évoluer, sans augmenter fortement plusieurs leviers en même temps. SRC_030 : consensus sur gestion individuelle de charge ; ne valide pas une rampe ni un ratio ACWR universel.'}),
  'progression.maxSimultaneousLevers':m('Q_PROGRESSIVE_OVERLOAD','organizational',{origin:'internal_heuristic',confidence:'moderate',decision:'keep',lastReview:'2026-10-02',reviewSummary:'Garde-fou de programmation : un seul levier majeur de surcharge est augmenté à la fois.'}),
  'mixed.allowedContexts':m("Q_MIXED_SESSIONS","organizational",{"origin": "internal_heuristic", "confidence": "low", "decision": "keep", "findings": [], "lastReview": "2026-10-03", "reviewSummary": "Les séances mixtes restent occasionnelles et sont réservées à la transition, au rappel ou à l’assimilation. Aucune preuve externe directement reliée dans la revue actuelle : prescription pratique Planif, sans revendication de consensus scientifique vérifié."}),
  'mixed.maxQualities':m('Q_MIXED_SESSIONS','organizational',{origin:'internal_heuristic',confidence:'moderate',decision:'keep',lastReview:'2026-10-02',reviewSummary:'Deux qualités maximum dans une séance mixte standard afin de ne pas additionner plusieurs séances complètes.'}),
  'mixed.allowTripleStandard':m('Q_MIXED_SESSIONS','organizational',{origin:'internal_heuristic',confidence:'moderate',decision:'keep',lastReview:'2026-10-02',reviewSummary:'S1 + S2 + VO₂ n’est pas généré comme format standard.'}),
  'mixed.betweenBlocks':m('Q_MIXED_SESSIONS','physiological',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-02',reviewSummary:'La coupure entre deux composantes reste libre et courte ; la valeur exacte est un choix de programmation.'}),
  'mixed.fasterFractionsShorter':m('Q_MIXED_SESSIONS','organizational',{origin:'product_choice',confidence:'low',decision:'monitor',lastReview:'2026-10-06',reviewSummary:'Dans chaque option mixte, toutes les fractions du bloc plus intense sont strictement plus courtes que la plus courte fraction du premier bloc. Filtrage des formats réels avant sélection, y compris ceux ajoutés pour les petits budgets. Choix de construction Planif, sans revendication de supériorité universelle.'}),
  'mixed.componentTimes':m('Q_MIXED_SESSIONS','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-06',reviewSummary:'Formats courts réservés aux composants mixtes ; leur sélection ne peut dépasser le budget demandé. Les formats dédiés restent inchangés.'}),
  'recovery.calendarContext':m('Q_EASY_RUNS','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-06',reviewSummary:'Priorité au footing récupération entre qualité et sortie longue ou deux qualités. Transfert de minutes vers 45 min, avec EF normale vers 50 min avant repos, sans modifier le volume hebdomadaire.'}),
  'mixed.combinations':m('Q_MIXED_SESSIONS','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-06',reviewSummary:'Budgets stricts communs aux deux composants et aux deux options : S1→S2 35 min (S1 ≤25, S2 ≤12), S1→VO₂ 30 min, S2→VO₂ 25 min. Le budget demandé par composant et le budget hebdomadaire réel restent prioritaires. Heuristiques internes, sans revendication de plafond scientifique universel.'}),
  'recovery.footing':m('Q_EASY_RUNS','organizational',{origin:'internal_heuristic',confidence:'moderate',decision:'modify',lastReview:'2026-10-10',reviewSummary:'Une seule catégorie visible : Jogg, plage commune réunissant EF récupération et EF normale (75–91 % de la vitesse LT1), à adapter au ressenti sous LT1. Les anciens types internes servent uniquement à adapter la durée et le placement, pas à imposer un footing normal ou récupération.'}),
  'recovery.prolongedAllowed':m('Q_EASY_RUNS','organizational'),
  'recovery.adaptiveFootings':m('Q_EASY_RUNS','organizational',{origin:'internal_heuristic',confidence:'low',decision:'monitor',lastReview:'2026-10-18',reviewSummary:'Fourchettes adaptées au temps restant par footing normal : jusqu’à 70 min, puis au plus deux footings prolongés de 80 à 90 min. Les footings proches des séances exigeantes restent courts selon leur placement réel. Limites de programmation internes, pas des seuils physiologiques.'}),
  'recovery.secondRecoveryFootingWhenHeavy':m('Q_WEEKLY_LOAD','organizational'),
  's1.band':m("Q_S1_INTENSITY","physiological",{"origin": "partial_science", "confidence": "moderate", "decision": "modify", "findings": ["FND_022"], "lastReview": "2026-10-03", "reviewSummary": "SRC_007 distingue les repères physiologiques dans son protocole. Le soutien porte sur le repère LT1, pas sur les marges d’allure S1 : celles-ci restent heuristiques. SRC_018 est désormais rattachée à S2."}),
  's1.formats.continuous':m('Q_S1_STRUCTURE','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques."}),
  's1.formats.descending':m('Q_S1_STRUCTURE','physiological',{origin:'product_choice',confidence:'low',decision:'keep',lastReview:'2026-10-03',reviewSummary:'Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques. Variante de programmation, sans supériorité physiologique démontrée.'}),
  's1.formats.distances':m('Q_S1_STRUCTURE','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques."}),
  's1.formats.long':m('Q_S1_STRUCTURE','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques."}),
  's1.formats.mixed':m('Q_S1_STRUCTURE','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques."}),
  's1.formats.progressive':m('Q_S1_STRUCTURE','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques."}),
  's1.formats.progressiveContinuous':m('Q_S1_STRUCTURE','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques."}),
  's1.formats.pyramids':m('Q_S1_STRUCTURE','physiological',{origin:'product_choice',confidence:'low',decision:'keep',lastReview:'2026-10-03',reviewSummary:'Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques. Variante de programmation, sans supériorité physiologique démontrée.'}),
  's1.formats.times':m('Q_S1_STRUCTURE','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques."}),
  's1.recovery.byFractionDuration':m("Q_S1_RECOVERY","physiological",{"origin": "internal_heuristic", "confidence": "low", "decision": "modify", "findings": [], "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques. Récupération courte et incomplète ; ratio pratique décroissant d’environ 15 % vers 10 %, fourchettes de 15 s, mode libre. Aucune preuve externe directement reliée dans la revue actuelle : prescription pratique Planif, sans revendication de consensus scientifique vérifié."}),
  's1.recovery.mixed':m('Q_S1_RECOVERY','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "lastReview": "2026-10-03", "reviewSummary": "Question ouverte : aucun essai contrôlé dédié identifié dans la revue actuelle pour valider les durées, volumes ou récupérations S1 précis ; ces choix restent consensus/heuristiques."}),
  's2.band':m('Q_S2_INTENSITY_BY_REP_DURATION','physiological'),
  's2.densePaceBand':m('Q_S2_INTENSITY_BY_REP_DURATION','physiological'),
  's2.densePaceOffsetForDuration':m('Q_S2_INTENSITY_BY_REP_DURATION','physiological'),
  's2.formats.blocs':m('Q_S2_STRUCTURE','physiological'),
  's2.formats.dense':m('Q_S2_STRUCTURE','physiological'),
  's2.formats.descending':m('Q_S2_STRUCTURE','physiological',{origin:'product_choice',confidence:'low',decision:'keep',lastReview:'2026-10-02',reviewSummary:'Variante de programmation, sans supériorité physiologique démontrée.'}),
  's2.formats.distances':m('Q_S2_STRUCTURE','physiological'),
  's2.formats.longDistances':m('Q_S2_STRUCTURE','physiological'),
  's2.formats.longTimes':m('Q_S2_STRUCTURE','physiological'),
  's2.formats.progressive':m('Q_S2_STRUCTURE','physiological',{origin:'product_choice',confidence:'low',decision:'keep',lastReview:'2026-10-02',reviewSummary:'Variante de programmation, sans supériorité physiologique démontrée.'}),
  's2.formats.pyramids':m('Q_S2_STRUCTURE','physiological',{origin:'product_choice',confidence:'low',decision:'keep',lastReview:'2026-10-02',reviewSummary:'Variante de programmation, sans supériorité physiologique démontrée.'}),
  's2.formats.times':m('Q_S2_STRUCTURE','physiological'),
  's2.paceBands':m("Q_S2_INTENSITY_BY_REP_DURATION","physiological",{"origin": "partial_science", "confidence": "moderate", "decision": "monitor", "findings": ["FND_016", "FND_023"], "lastReview": "2026-10-13", "reviewSummary": "SRC_018 décrit le contrôle interne par lactate et SRC_019 les interactions de programmation. Soutien indirect au principe d’ajustement ; la plage de 99 à 103 % du repère S2 jusqu’à 3 min est un choix de l’utilisateur, non validé comme optimum par ces études."}),
  's2.recovery.blocs':m('Q_S2_RECOVERY','physiological'),
  's2.recovery.byFractionDuration':m("Q_S2_RECOVERY","physiological",{"origin": "internal_heuristic", "confidence": "low", "decision": "modify", "findings": ["FND_023"], "lastReview": "2026-10-13", "reviewSummary": "SRC_019 documente l’interaction travail-récupération sans démontrer les ratios Planif autour de S2. Récupération de 40 à 50 s pour une fraction proche de 3 min : choix de l’utilisateur, non validé comme optimum ; les autres durées sont conservées."}),
  's2.recovery.denseByDistance':m('Q_S2_RECOVERY','physiological'),
  'safeguards.above105OfVma':m('Q_SESSION_MAX_WORK','physiological'),
  'safeguards.caps.above105':m('Q_SESSION_MAX_WORK','physiological'),
  'safeguards.caps.s1':m('Q_SESSION_MAX_WORK','physiological'),
  'safeguards.caps.s2':m('Q_SESSION_MAX_WORK','physiological'),
  'safeguards.caps.vo2':m('Q_SESSION_MAX_WORK','physiological'),
  'spec10k.formats.blocs':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.descending':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.exceptional':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.long':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.medium':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.mixedS2':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.mixedS2MinGap':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.progressive':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.pyramids':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.short':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.formats.times':m('Q_SPEC10K_STRUCTURE','physiological'),
  'spec10k.paceBands':m('Q_SPEC10K_INTENSITY','physiological'),
  'spec10k.recovery.blocs':m('Q_SPEC10K_RECOVERY','physiological'),
  'spec10k.recovery.byFractionDuration':m('Q_SPEC10K_RECOVERY','physiological'),
  'spec10k.recovery.mixedBetweenSets':m('Q_SPEC10K_RECOVERY','physiological'),
  'spec10k.workCap':m('Q_SPEC10K_VOLUME','physiological'),
  'specOther.marathonLongRun':m('Q_SPEC_OTHER','physiological',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "findings": ["FND_002"], "lastReview": "2026-10-03", "reviewSummary": "Contexte descriptif marathon uniquement ; ni segments à allure marathon ni plafond en minutes validés par cette étude."}),
  'specOther.durationAndEquivalence':m('Q_SESSION_MAX_WORK','organizational',{origin:'internal_heuristic',confidence:'low',decision:'modify',lastReview:'2026-10-17',reviewSummary:'Application des plafonds existants au temps réel de travail spécifique. Réduction des répétitions ou des distances ; options comparées en temps de travail. Marathon : volume spécifique identique entre les options et durée totale limitée à 165 min, exemption S1 historique conservée. Affûtage : option distance alignée sur le travail de l’option en minutes.'}),
  'specOther.minReps':m('Q_SPEC_OTHER','physiological'),
  'specOther.recoveryByDistance':m('Q_SPEC_OTHER','physiological'),
  'vo2.band':m("Q_VO2_INTENSITY","physiological",{"origin": "partial_science", "confidence": "moderate", "decision": "modify", "findings": ["FND_017", "FND_018", "FND_020"], "lastReview": "2026-10-03", "reviewSummary": "SRC_013/014 soutiennent conjointement les principes de programmation, mais sont deux parties de la même revue, pas deux confirmations indépendantes. SRC_016 nuance le gain chronique de VO₂max chez les coureurs entraînés. Les bandes numériques par durée et plafonds exacts restent des heuristiques. Confiance modérée pour la prescription Planif, sans validation directe de ses valeurs."}),
  'vo2.formats.distances':m('Q_VO2_STRUCTURE','physiological'),
  'vo2.formats.intermittent':m('Q_VO2_STRUCTURE','physiological'),
  'vo2.formats.pyramids':m('Q_VO2_STRUCTURE','physiological',{origin:'product_choice',confidence:'low',decision:'keep',lastReview:'2026-10-02',reviewSummary:'Variante de programmation utile pour la variété ; aucune supériorité physiologique démontrée sur un format régulier équivalent.'}),
  'vo2.formats.shortDistanceSeries':m('Q_VO2_STRUCTURE','physiological'),
  'vo2.formats.times':m('Q_VO2_STRUCTURE','physiological'),
  'vo2.pctByDuration':m("Q_VO2_INTENSITY","physiological",{"origin": "partial_science", "confidence": "moderate", "decision": "modify", "findings": ["FND_017", "FND_018", "FND_020"], "lastReview": "2026-10-03", "reviewSummary": "SRC_013/014 soutiennent conjointement les principes de programmation, mais sont deux parties de la même revue, pas deux confirmations indépendantes. SRC_016 nuance le gain chronique de VO₂max chez les coureurs entraînés. Les bandes numériques par durée et plafonds exacts restent des heuristiques. Confiance modérée pour la prescription Planif, sans validation directe de ses valeurs."}),
  'vo2.recovery.betweenSets':m('Q_VO2_RECOVERY','physiological'),
  'vo2.recovery.byFractionDuration':m("Q_VO2_RECOVERY","physiological",{"origin": "partial_science", "confidence": "moderate", "decision": "modify", "findings": ["FND_017", "FND_018", "FND_019"], "lastReview": "2026-10-03", "reviewSummary": "SRC_013/014 soutiennent conjointement les principes de programmation, mais sont deux parties de la même revue, pas deux confirmations indépendantes. SRC_015 souligne les limites sur les adaptations chroniques et les différences entre types de HIIT. Les ratios exacts et l’équivalence actif/passif ne sont pas démontrés. Confiance modérée pour la prescription Planif, sans validation directe de ses valeurs."}),
  'volume.assimilationFactor':m('Q_ASSIMILATION','organizational'),
  'volume.blockRamp':m('Q_LOAD_PROGRESSION','organizational'),
  'volume.weeklyFactor':m('Q_VOLUME_MODULATION','organizational',{"origin": "internal_heuristic", "confidence": "low", "decision": "monitor", "findings": ["FND_015"], "lastReview": "2026-10-03", "reviewSummary": "SRC_036 : mécanismes mitochondriaux indirects ; aucun facteur numérique de modulation validé. Le coefficient exact Planif reste une heuristique."})
  };
})();
/* Entrées techniques ou de produit : exclues de la revue scientifique, avec leur raison */
const TECHNICAL_RULES={
  'library.equivalence':'tolérance d’équivalence entre les deux options proposées (choix de produit)',
  'library.selection':'score et départage déterministe du sélecteur (choix de produit, pas une règle physiologique)',
  'safeguards.capTolerance':'tolérance d’arrondi des plafonds (calcul)',
  'volume.deviationAlert':'seuil d’affichage d’une alerte (interface)',
  'volume.footingStep':'pas d’ajustement des footings (granularité de calcul)',
  'volume.weekTolerance':'tolérance de calcul du volume hebdomadaire (précision de l’algorithme)'
};
/* Contrôle d'intégrité du socle : références, questions, couverture de RULES, absence de conclusion */
const refPathExists=p=>{let o=RULES;const ks=[];p.replace(/([^.[\]]+)|\[([^\]]+)\]/g,(m,a,b)=>{ks.push(a||b);});for(const k of ks){if(o==null||!(k in o))return false;o=o[k];}return true;};
function auditIntegrity(usedRefs){
  const P=[];
  const checkUnique=(rows,label)=>{const seen=new Set();rows.forEach(x=>{if(seen.has(x.id))P.push(`identifiant ${label} dupliqué : ${x.id}`);seen.add(x.id);});};
  checkUnique(SOURCES,'source');checkUnique(FINDINGS,'résultat');
  FINDINGS.forEach(f=>{if(!SOURCES.some(s=>s.id===f.sourceId))P.push(`source inconnue pour ${f.id}`);if(!QUESTIONS[f.questionId])P.push(`question inconnue pour ${f.id}`);});
  CONTEXT_SOURCE_IDS.forEach(id=>{if(!SOURCES.some(s=>s.id===id))P.push(`source de contexte inconnue : ${id}`);});
  const ids=Object.keys(RULE_META).concat(Object.keys(TECHNICAL_RULES));
  ids.forEach(i=>{if(!refPathExists(i))P.push(`identifiant absent de RULES : ${i}`);});
  Object.entries(RULE_META).forEach(([i,m])=>{if(!QUESTIONS[m.questionId])P.push(`question inconnue pour ${i}`);
    const reviewed=m.origin!=='not_evaluated'||m.confidence!=='not_evaluated'||m.decision!=='not_evaluated';
    if(['strong_science','partial_science','consensus'].includes(m.origin)&&!m.findings.length)P.push(`qualification scientifique sans résultat : ${i}`);
    if(reviewed&&(!m.lastReview||!m.reviewSummary))P.push(`qualification sans trace de revue : ${i}`);
    m.findings.forEach(f=>{if(!FINDINGS.find(x=>x.id===f))P.push(`finding inconnu ${f} pour ${i}`);});});
  (usedRefs||[]).forEach(r=>{if(!RULE_META[r]&&!TECHNICAL_RULES[r])P.push(`ruleRef sans fiche ni statut technique : ${r}`);});
  Object.entries(RULES).forEach(([d,o])=>Object.keys(o).forEach(k=>{const base=`${d}.${k}`;
    if(!ids.some(i=>i===base||i.startsWith(base+'.')||i.startsWith(base+'[')))P.push(`entrée de RULES non couverte : ${base}`);}));
  return P;
}

return {EVIDENCE_ENUMS,QUESTIONS,SOURCES,CONTEXT_SOURCE_IDS,sourceScope,scopeLabel,FINDINGS,RULE_META,TECHNICAL_RULES,refPathExists,auditIntegrity};
}
async function load(url){
  const response=await fetch(url);
  if(!response.ok)throw new Error('Bibliothèque scientifique indisponible (HTTP '+response.status+').');
  return createEvidence(await response.json());
}
return {createEvidence,load};
});
