/* Shared planning parameters. No DOM or storage access. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.PlanifRules=factory();
})(globalThis,function(){
const RULES={
  s1:{
    /* LT1 = repère physiologique estimé ; le travail S1 est prescrit légèrement au-dessus.
       La marge dépend de la durée de fraction puis du volume total (25' haut de plage, 60' bas). */
    band:{
      workAtTop:25,workAtBottom:60,
      durationMargins:[
        {max:6,r:[0.3,0.6]},
        {max:12,r:[0.2,0.5]},
        {max:20,r:[0.1,0.4]},
        {max:30,r:[0.0,0.3]},
        {max:999,r:[0.0,0.2]}
      ],
      activeEnduranceBelowLt1:[0.2,0.5]
    },
    formats:{
      distances:{1000:[8,14],1200:[6,10],1500:[5,8],1600:[4,8],2000:[3,6]},
      times:{4:[6,8],5:[5,7],6:[4,6],8:[4,5],10:[3,4],12:[3,4]},
      long:{15:[2,4],20:[2,3],25:[2,2],30:[2,2]},
      pyramids:[[4,6,8,6,4],[5,7,9,7,5],[6,8,10,8,6],[4,6,8,10,8,6,4]],
      descending:[[15,10,5],[10,8,6,4],[12,10,8,6],[12,10,8,6,4],[20,15,10],[15,12,10,8],[20,15,10,5]],
      mixed:[[2,10,5],[3,8,4],[2,12,8],[3,10,5],[2,15,10]],
      progressive:{5:[4,6],6:[4,6],8:[3,5],12:[2,4]},
      continuous:{min:20,max:60},
      progressiveContinuous:{min:25,max:50}
    },
    recovery:{
      /* fourchettes de 15 s ; ratio décroissant d'environ 15 % (court) vers 10 % (30') */
      byFractionDuration:[
        {max:5,r:[0.5,0.75]},
        {max:6,r:[0.75,1]},
        {max:8,r:[1,1.25]},
        {max:10,r:[1.25,1.5]},
        {max:12,r:[1.5,1.75]},
        {max:15,r:[1.75,2]},
        {max:20,r:[2.25,2.5]},
        {max:25,r:[2.5,2.75]},
        {max:999,r:[2.75,3]}
      ],
      mixed:{betweenFractions:[0.5,0.75],betweenSets:[1.5,2]}
    }
  },
  s2:{
    /* fourchette relative au S2 (km/h) selon la durée de fraction */
    paceBands:[{max:3,pct:[0.99,1.03]},{max:4,r:[0,0.4]},{max:6,r:[-0.1,0.2]},{max:8,r:[-0.2,0.1]},{max:10,r:[-0.3,0]}],
    densePaceBand:[0.2,0.6],
    densePaceOffsetForDuration:0.4,
    band:{workAtTop:18,workAtBottom:35},
    formats:{
      dense:{300:[15,25],400:[12,20],500:[10,16]},
      distances:{600:[8,12],800:[6,10],1000:[5,8],1200:[4,7]},
      longDistances:{1500:[3,5],1600:[3,5],2000:[3,4]},
      times:{3:[6,10],4:[5,8],5:[4,7],6:[3,6]},
      longTimes:{7:[3,5],8:[3,4],9:[2,4],10:[2,3]},
      pyramids:[[4,5,6,5,4],[3,4,5,6,5,4,3],[3,5,7,5,3],[4,6,8,6,4],[5,6,7,6,5],[5,7,9,7,5]],
      descending:[[6,5,4,3],[8,6,4],[7,6,5,4],[9,7,5,3],[10,8,6,4],[8,7,6,5,4],[10,8,6,5,3],[10,9,8,6],[9,8,7,6,5]],
      progressive:[[4,6,8],[3,4,5,6,7],[5,6,7,8],[4,6,8,10],[4,5,6,7,8],[6,8,9,10],[5,6,7,8,9]],
      blocs:[[2,6,4],[2,7,5],[2,8,4],[2,8,6],[3,6,4],[3,5,5],[2,10,6],[3,7,4]]
    },
    recovery:{
      /* une seule logique selon la durée réelle de fraction, qu'elle soit exprimée en temps ou en distance */
      byFractionDuration:[
        {max:2.75,r:[0.5,0.75]},
        {max:3,r:[2/3,5/6]},
        {max:5,r:[0.75,1]},
        {max:6,r:[1,1.25]},
        {max:8,r:[1.25,1.5]},
        {max:9,r:[1.5,1.75]},
        {max:999,r:[1.75,2]}
      ],
      denseByDistance:[{max:300,v:0.5},{max:400,v:2/3},{max:99999,v:0.75}],
      blocs:{betweenFractions:[0.75,1.25],betweenSets:[2,3]}
    }
  },
  vo2:{
    /* plage en % VMA selon la durée de fraction (minutes) : [durée, bas, haut], interpolée */
    pctByDuration:[[0.5,100,110],[0.75,99,106],[1,98,104],[1.5,96,101],[2,94,98],[3,92,96],[4,90,94]],
    /* volume de travail rapide selon la durée de fraction ; haut d'intensité => bas de volume */
    band:{
      workByDuration:[[0.5,8,15],[0.75,9,15],[1,10,16],[1.5,10,17],[2,10,18],[3,12,18],[4,12,20]],
      widthShort:3,widthLong:2,shortBelow:1
    },
    formats:{
      intermittent:{0.5:{n:[16,30],set:10,lab:'30"/30"'},0.75:{n:[10,20],set:8,lab:'45"/45"'},1:{n:[8,18],set:8,lab:"1'/1'"}},
      distances:{short:{200:[12,30],300:[10,20],400:[8,14]},medium:{500:[6,10],600:[5,9]},long:{800:[4,7],1000:[3,6],1200:[3,5]}},
      times:{medium:{1.5:[6,10],2:[5,9]},long:{3:[4,6],4:[3,5]}},
      pyramids:[[1,2,3,2,1],[2,3,4,3,2],[1,2,3,4,3,2,1]],
      shortDistanceSeries:{maxDistance:300,perSet:10}
    },
    recovery:{
      byFractionDuration:[
        {max:0.5,r:[0.25,0.5]},
        {max:0.75,r:[0.5,0.75]},
        {max:1,r:[0.5,0.75]},
        {max:1.5,r:[0.75,1]},
        {max:2,r:[1.25,1.5]},
        {max:3,r:[1.5,2]},
        {max:999,r:[2,2.5]}
      ],
      betweenSets:[2,3]
    }
  },
  spec10k:{
    /* bande autour de l'allure 10 km (fraction de vitesse) selon la durée de fraction */
    paceBands:[{max:2.5,r:[0,0.02]},{max:5,r:[-0.005,0.01]},{max:99,r:[-0.015,0]}],
    workCap:35,
    formats:{
      short:{400:[10,20],500:[8,16],600:[8,14],800:[6,10]},
      medium:{1000:[5,9],1200:[4,8],1500:[4,6],1600:[3,5]},
      long:{2000:[3,4],2500:[2,3]},
      exceptional:{3000:[2,2]},
      times:{2:[8,14],3:[6,10],4:[5,8],5:[4,7],6:[4,6],8:[3,4],10:[2,3]},
      pyramids:[[400,800,1200,800,400],[500,1000,1500,1000,500],[800,1200,1600,1200,800],[1000,1500,2000,1500,1000]],
      progressive:[[1000,1500,2000],[800,1200,1600,2000],[1000,1500,2000,2500],[500,1000,1500,2000,2500]],
      descending:[[2000,1500,1000,500],[2500,1500,1000],[2500,2000,1500,1000],[2500,1500,1000,500]],
      blocs:[[2,1500,1000],[2,2000,1000],[3,1500,1000],[2,2500,1000],[3,2000,1000],[2,2000,2000]],
      mixedS2:[[2,2000,1000],[2,2000,1500],[3,2000,1000],[2,3000,1000]],
      mixedS2MinGap:0.2
    },
    recovery:{
      byFractionDuration:[{max:2.75,v:1},{max:3.5,v:1.25},{max:5,v:1.5},{max:7,v:2},{max:9,v:2.5},{max:999,v:3}],
      blocs:{betweenFractions:1,betweenSets:3},
      mixedBetweenSets:3
    }
  },
  alternating10k:{distanceM:400,reps:[8,10],s1OffsetKmh:0.5,targetMinutes:[30,36],maxMinutes:38,fromProgress:0.67},
  weeklyFormats:{longFractionMinutes:6,complementMaxFractionMinutes:4},
  progression:{
    fractions:{firstMaxMinutes:{s1:8,s2:3,vo2:2,spec10k:4.5},firstTargetMinutes:{s1:4,s2:1.5,vo2:1,spec10k:2},maxRatio:1.5,maxIncreaseMinutes:2.5,preferredIncreaseMinutes:1,durationWeight:2},
    /* Surcharge progressive : faire progresser d'abord le volume ciblé ; intensité ou densité ensuite, sans cumuler les leviers. */
    priority:['volume','intensity','density'],
    maxSimultaneousLevers:1
  },
  mixed:{
    /* Une séance mixte n'est jamais une séance par défaut : uniquement transition, rappel ou assimilation. */
    allowedContexts:['transition','reminder','assimilation'],
    maxQualities:2,
    fasterFractionsShorter:true,
    allowTripleStandard:false,
    betweenBlocks:[1.5,2.5],
    componentTimes:{s1:{4:[3,6],5:[3,5],6:[2,4],8:[2,3],10:[2,2],12:[2,2]},s2:{3:[2,4],4:[2,3],5:[2,2],6:[2,2]},vo2:{0.5:[4,16],0.75:[4,10],1:[4,8]}},
    combinations:{
      's1>s2':{maxWork:35,maxPrimary:25,maxSecondary:12,contexts:['transition','assimilation'],transitionPrimaryFactor:0.75,transitionSecondaryMin:[8,12],assimPrimaryFactor:0.75,assimSecondaryFactor:0.55},
      's2>vo2':{maxWork:25,maxPrimary:18,maxSecondary:10,contexts:['reminder','assimilation'],reminderPrimaryMin:[10,14],reminderSecondaryFactor:0.60,assimPrimaryFactor:0.75,assimSecondaryFactor:0.55},
      's1>vo2':{maxWork:30,maxPrimary:24,maxSecondary:8,contexts:['reminder','assimilation'],reminderPrimaryMin:[12,16],reminderSecondaryFactor:0.60,assimPrimaryFactor:0.75,assimSecondaryFactor:0.55}
    }
  },
  load:{
    /* Repères descriptifs Planif, audit synthétique du 21/10/2026.
       Interpolation entre volumes audités seulement ; aucun plafond physiologique.
       Chaque ligne : sorties, qualités, minutes moyennes, effectif, part séance,
       part du travail S2 (percentiles 10–90 arrondis vers l'extérieur). */
    blockReview:{version:1,kind:'planif_heuristic',volumeTolerance:.1,progressionTolerance:.05,minSamples:8,
      s2:[
        [3,1,180,12,[44,48],[28,35]],[3,1,240,12,[38,42],[23,29]],
        [4,2,240,11,[30,36],[18,24]],[4,2,300,12,[29,34],[19,24]],[4,2,360,9,[27,32],[17,23]],
        [5,2,240,9,[29,35],[18,23]],[5,2,300,12,[29,34],[19,24]],[5,2,360,12,[26,30],[17,21]],
        [6,2,300,12,[27,33],[15,24]],[6,2,360,12,[26,30],[17,21]],[6,2,420,12,[23,27],[15,20]],
        [6,3,360,12,[21,27],[12,20]],[6,3,420,12,[21,25],[14,19]]
      ]},
    /* coefficients d'intensité (S2 = 1,00) */
    intensity:{recovery:0.30,activeRec:0.35,easy:0.40,easyHigh:0.50,s1:0.65,between:0.80,s2:1.00,pace10k:1.10,pace5k:1.20,pace3k:1.30,vma100:1.40,vma105:1.60,vma110:1.80,max:2.00},
    /* vitesses d'ancrage des coefficients : fractions du S1 bas ou de la VMA */
    anchors:{recoveryOfS1Low:0.78,easyOfS1Low:0.88,easyHighOfS1Low:0.95,pace3kOfVma:0.95,vma105:1.05,vma110:1.10,insertMargin:0.1},
    /* densité : [ratio récup/effort, coefficient], interpolé ; récup courte par fraction jamais « confortable » */
    density:[[0.15,1.05],[0.40,1.03],[0.75,1.00],[1.50,0.95]],
    densityShortRecovery:{recEachBelow:1.5,floor:1.0},
    /* semaine chargée : points de travail qualitatif par minute de course */
    heavyWeek:0.18,
    /* classement d'une vitesse dans les zones de charge */
    zones:{z4OfVma:0.9,z3BelowS2:0.35,z2BelowS1Low:0.1},
    /* zone affichée d'une séance selon sa vitesse */
    sessionZone:{z4OfVma:0.9,z3BelowS2:0.15}
  },
  volume:{
    /* facteur volume hebdo sur le travail ciblé : référence 5h, maximum atteint à 3h30 et 7h */
    weeklyFactor:{ref:5,low:3.5,high:7,amp:{s1:{down:0.15,up:0.12},s2:{down:0.13,up:0.10},vo2:{down:0.10,up:0.07},spec10k:{down:0.12,up:0.08}}},
    /* rampe d'un bloc : base + perWeek × (semaines − 2), plafonnée */
    blockRamp:{base:0.12,perWeek:0.02,max:0.2},
    assimilationFactor:0.78,
    weekTolerance:0.025,
    deviationAlert:0.05,
    footingStep:5
  },
  recovery:{
    adaptiveFootings:{normalFrom:50,normalMax:70,prolongedFrom:65,prolongedMax:80,absoluteMax:90,maxProlonged:2,protectedMax:45},
    footing:{
      rec:{range:[35,45],default:40,intensityPctLT1:[0.75,0.83]},
      std:{range:[40,60],default:50,intensityPctLT1:[0.84,0.91]},
      pro:{range:[60,75],intensityPctLT1:[0.84,0.91]}
    },
    prolongedAllowed:{weeklyMinutesFrom:360,runsUpTo:4},
    calendarContext:{bridgePriority:80,afterQuality:30,beforeQuality:35,beforeLongRun:35,vo2Bonus:10,beforeRestDiscount:15,normalTarget:50,recoveryTarget:45},
    secondRecoveryFootingWhenHeavy:2
  },
  organization:{
    weeklyFeasibility:{minimumWorkScale:0.4,scaleStep:0.15,maxAttempts:5,singleQualityShare:0.35,combinedQualityShare:0.5},
    vo2MinimumWarmup:20,
    preparationByVolume:[{below:180,warmup:15,cooldown:5},{below:240,warmup:20,cooldown:8},{below:Infinity,warmup:24,cooldown:10}],
    qualityFrequency:{
      minRuns:{1:3,2:4,3:6},
      recommendedRuns:{1:3,2:5,3:6},
      thirdQualityFactor:0.6
    },
    activeEndurance:{
      weeklyMax:1,minRuns:4,maxRuns:6,
      blockWhenFourRunsAndTwoQualities:true,
      work:[15,45],warmup:20,cooldown:10,intensityPctLT1:[0.92,0.98],
      allowedContexts:['aero','assimilation'],
      formats:['continuous','blocks']
    },
    assimilationActive:{blockMinutes:[10,15,20],preferredWarmup:20,cooldown:10,minEasy:10},
    warmup:{vma:[27,10],vmaShort:[27,10],s2:[24,10],s1:[24,10],fartlek:[27,10],mixed:[24,10],spec:[27,10],hills:[24,10]},
    longRun:{share:0.25,minMinutes:50,minShare:0.2,softShare:0.28,maxShare:0.35,cap:{default:110,aero:130,spec:[105,90,130,160]}}
  },
  library:{
    /* pertinence de chaque famille selon la phase du bloc : [début, milieu, fin, assimilation] */
    phaseWeights:{
      's1.dist':[1,0.9,0.6,0.7],'s1.time':[1,0.8,0.5,0.9],'s1.long':[0.3,0.7,1,0.4],'s1.cont':[0.3,0.6,1,0.8],'s1.progCont':[0.3,0.8,0.9,0.5],
      's1.progFrac':[0.4,0.9,0.8,0.3],'s1.pyr':[0.4,1,0.7,0.2],'s1.desc':[0.3,0.9,1,0.2],'s1.mix':[0.3,0.8,0.9,0.3],
      's2.dense':[1,0.5,0.2,0.3],'s2.dist':[0.8,1,0.6,0.8],'s2.longDist':[0.2,0.6,1,0.4],'s2.time':[0.9,1,0.6,1],'s2.longTime':[0.2,0.6,1,0.4],
      's2.pyr':[0.4,1,0.7,0.2],'s2.deg':[0.2,0.8,1,0.2],'s2.prog':[0.2,0.8,1,0.2],'s2.blocs':[0.3,0.7,1,0.8],
      'vo2.int':[1,0.8,0.6,0.8],'vo2.shortDist':[0.9,0.8,0.5,0.6],'vo2.medDist':[0.7,1,0.8,0.6],'vo2.medTime':[0.7,1,0.8,0.6],
      'vo2.longDist':[0.4,0.7,1,0.6],'vo2.longTime':[0.4,0.7,1,0.6],'vo2.pyr':[0.3,0.9,0.8,0.3],
      'p10.short':[1,0.6,0.4,0.7],'p10.med':[0.7,1,0.7,0.9],'p10.long':[0.3,0.7,1,0.4],'p10.xlong':[0,0,0.3,0],'p10.time':[0.9,0.8,0.6,0.8],
      'p10.pyr':[0.4,0.9,0.7,0.2],'p10.prog':[0.3,0.8,0.9,0.2],'p10.deg':[0.3,0.7,1,0.2],'p10.blocs':[0.3,0.8,1,0.5],'p10.mix':[0.6,0.9,0.6,0.3],'p10.alternating':[0,0.4,1,0]
    },
    phaseBoundaries:[0.34,0.67],
    selection:{phaseWeight:3,volumeGap:4,sameFormat:4,sameSize:1.2,sameFamily:0.6,tieBreak:0.15,
      optionBLoadTolerance:0.1,optionBSameKind:1,optionBSameSize:1.5,memoryWeeks:2},
    /* équivalence des deux options : max(relative × travail, absolute minutes) */
    equivalence:{relative:0.05,absolute:2}
  },
  blocks:{
    /* volume de travail ciblé [début, fin de bloc] en minutes (km pour le spécifique), budget qualité en % du temps */
    vma:{budget:[10,20],A:{fam:'vma',W:[12,18],min:10},B:[{fam:'s1',W:[25,35],min:20}]},
    s1:{budget:[15,30],A:{fam:'s1',W:[35,55],min:30},B:[{fam:'s2',W:[18,22],min:15},{fam:'vmaShort',W:[10,12],min:8}]},
    s2:{budget:[10,25],A:{fam:'s2',W:[22,34],min:18,assimW:20},B:[{fam:'s1',W:[30,35],min:25},{fam:'vmaShort',W:[12,12],min:8}],
      /* séquence des séances complémentaires : semaines paires S1, impaires rappel VO₂ (plus léger en dernière semaine de charge) */
      sequence:{even:{fam:'s1',W:[30,35],min:25},odd:{fam:'vmaShort',W:[12,12],min:8},oddLastW:[10,10]},
      longRunS1EndMinutes:15},
    eco:{budget:[10,20],A:{fam:'hills',W:[8,14],min:6},B:[{fam:'s2',W:[20,28],min:18}]},
    aero:{
      budget:[5,15],ramp:0.06,maxQualities:1,
      A:{fam:'fartlek',W:[8,24],min:8,assimW:8},
      B:[{fam:'fartlek',W:[8,24],min:8}],
      fartlek:{effort:'controlled_by_feel',paceTarget:false,recovery:'easy_jog'},
      shortHills:{weeks:'alternate',reps:[6,10],seconds:[10,15],gradePct:[6,10],recovery:'complete'}
    },
    spec:{
      0:{budget:[10,20],K:[3,4.5],min:2.4,repsA:[400,500,600,800],repsB:[1000,1200,1500,1600],B:[{fam:'s2',W:[20,26],min:18}]},
      1:{budget:[10,22],K:[5,8],min:4,assimK:4,repsA:[1000,1200,1500],repsB:[2000,2500,3000],B:[{fam:'vma',W:[12,15],min:10},{fam:'s2',W:[20,26],min:18}]},
      2:{budget:[18,28],K:[8,12],min:6,repsA:[2000,3000],repsB:[3000,4000,4500,5000,6000],B:[{fam:'vmaShort',W:[10,12],min:8},{fam:'s1',W:[25,35],min:20}]},
      3:{budget:[20,30],K:[10,16],min:8,B:[{fam:'s2',W:[20,26],min:18},{fam:'vmaShort',W:[10,12],min:8}]}
    },
    /* semaine d'assimilation : travail en fraction du début de bloc */
    assimilation:{mainOfFirstWeek:0.7,secondOfFirstWeek:0.75}
  },
  /* côtes : durée totale = travail × totalFactor + sprints ; récupération en descente = travail × descentRecoveryFactor */
  hills:{short:{reps:[0.5,0.75],n:[6,16]},long:{reps:[1.5,2],n:[4,8]},totalFactor:2.2,descentRecoveryFactor:1.2,sprintMinutes:6,
    sprintSpeedOfVma:1.15,longEffortAboveS2:0.4},
  specOther:{
    durationAndEquivalence:{marathonDistanceStepKm:0.1,taperDistanceStepM:50},
    /* générateurs historiques 5 km / semi / marathon (pas encore migrés dans la bibliothèque) */
    recoveryByDistance:[{max:500,v:1},{max:1200,v:1.5},{max:2000,v:2},{max:3000,v:2.5},{max:999999,v:3}],
    minReps:2,
    marathonLongRun:{shareOfWeek:0.3,minOverWork:40,cap:165,minEasy:15,cooldown:10,threeBlocksFromKm:12}
  },
  prediction:{
    profileSteps:[0.8,0.9,1.0,1.1,1.2],
    marathonPenalty:0.1,
    measuredStepClamp:[0.5,1.5],
    measuredFallbackStep:1.0
  },
  calendar:{
    /* séquence des blocs (10 km) selon le nombre total de semaines : première ligne dont upTo ≥ N */
    phaseSequence:[{upTo:4,blocks:['spec']},{upTo:7,blocks:['s2','spec']},{upTo:15,blocks:['s1','s2','spec']},{upTo:19,blocks:['aero','s1','s2','spec']},{upTo:999,blocks:['aero','vma','s1','s2','spec']}],
    /* départage à coût égal : de 12 à 15 semaines (3 blocs) on allonge S1, puis S2, puis spécifique ; sinon spécifique puis S2 */
    tieBreak:{earlyFirst:{fromWeeks:12,toWeeks:15,blocks:3,weights:[0.03,0.02,0.01]},default:{last:0.02,beforeLast:0.01}},
    segment:{preferredWeeks:3,lengthTiers:[[2,4],[2,5],[1,5],[1,6]],maxBlocksWhenExtending:8},
    assimilationAfterLoadWeeks:3,
    minSpecificWeeks:{fromWeeks:9,weeks:3},
    specific10k:{preferredWeeks:4,fallbackWeeks:5},
    longRun10k:{capMinutes:90,preRaceDays:7,preRaceCapMinutes:60},
    maxConsecutiveLoadWeeks:5,
    /* enveloppe de volume (fractions du volume moyen saisi) */
    envelope:{loadStart:0.92,loadSpan:0.16,assimilation:0.78,taper:0.62,intro:0.6,peakCap:1.10},
    introWeekMinDays:4,
    taper:{
      reminderA:{reps:4,minutes:2,recovery:1.5},reminderB:{reps:2,meters:1000,recovery:2},
      warmup:20,cooldown:10,raceWarmup:20,raceCooldown:10,
      eveMinutes:20,eveRange:[15,25],eveStrides:[3,5],eveStrideSeconds:[10,15],jMinus2Rest:true,eveFromRuns:3,footing:[30,40],reminderDaysBefore:[3,4]
    },
    introFooting:[35,60],
    placement:{minDaysBetweenQualities:2,firstDayFreeIfMoreThan:3}
  },
  safeguards:{
    caps:{s1:60,s2:40,vo2:20,above105:8},
    above105OfVma:1.05,
    capTolerance:0.5
  }
};
return RULES;
});
