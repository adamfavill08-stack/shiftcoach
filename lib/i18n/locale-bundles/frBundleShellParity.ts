/**
 * French strings for keys defined inline on `en.ts` / `es.ts` but absent from the
 * modular FR merges — keeps `fr` bundle at parity with English for CI.
 */
export const frBundleShellParity: Record<string, string> = {
  'upgrade.backToSettingsAria': 'Retour aux réglages',
  'upgrade.pageTitle': 'Passer à Pro',
  'upgrade.trustedBy': 'Plébiscité par les travailleurs postés dans le monde',
  'upgrade.bannerKicker': 'ShiftCoach Pro',
  'upgrade.bannerTitle': 'Accédez à tous vos outils santé pour horaires décalés',
  'upgrade.bannerSubtitle':
    'Débloquez des analyses plus poussées et des fonctions de coaching premium pensées pour les plannings tournants.',
  'upgrade.benefitsTitle': 'Ce que vous débloquez',
  'upgrade.benefits.unlimitedHistory': 'Historique illimité des équipes et événements',
  'upgrade.benefits.noAds': 'Sans publicité',
  'upgrade.benefits.adjustedCalories': 'Calories ajustées',
  'upgrade.benefits.nextMealWindow': 'Fenêtre du prochain repas',
  'upgrade.benefits.shiftLagInsights': 'Analyses du décalage posté',
  'upgrade.benefits.calorieProfileSetup': 'Réglage calories / profil',
  'upgrade.benefits.allBlogArticles': 'Tous les articles du blog',
  'upgrade.buttons.monthly': 'Pro mensuel',
  'upgrade.buttons.monthlyWithPrice': 'Pro mensuel',
  'upgrade.buttons.monthlyWithDynamicPrice': 'Pro mensuel — {price}',
  'upgrade.buttons.annual': 'Pro annuel',
  'upgrade.buttons.annualWithPrice': 'Pro annuel',
  'upgrade.buttons.annualWithDynamicPrice': 'Pro annuel — {price}',
  'upgrade.buttons.annualSavings': '35 % moins cher que le mensuel',
  'upgrade.buttons.annualSavingsDynamic': '{percent} % moins cher que le mensuel',
  'upgrade.buttons.restore': 'Restaurer les achats',
  'upgrade.buttons.continuePurchase': "Continuer vers l'achat",
  'upgrade.buttons.restorePurchasesLink': 'Restaurer les achats',
  'upgrade.buttons.processing': 'Traitement…',
  'upgrade.buttons.restoring': 'Restauration…',
  'upgrade.planCard.monthlyTitle': 'Pro mensuel',
  'upgrade.planCard.monthlySubtitle': 'Accès Pro complet',
  'upgrade.planCard.yearlyTitle': 'Pro annuel',
  'upgrade.planCard.yearlySubtitle': 'Meilleur rapport qualité-prix',
  'upgrade.planCard.perMonth': 'Par mois',
  'upgrade.planCard.perYear': 'Par an',
  'upgrade.planCard.saveBadge': 'Économisez {percent} %',
  'upgrade.planCard.saveBadgeStatic': 'Économisez 35 %',
  'upgrade.alreadyPro.title': 'Vous êtes déjà en Pro.',
  'upgrade.alreadyPro.message': 'Toutes les fonctions premium sont déjà débloquées sur votre compte.',
  'upgrade.purchasesUnavailable': 'Les achats sont disponibles dans l’application mobile ShiftCoach.',

  'subscription.upgradeCard.cta': 'Passer à Pro',
  'subscription.upgradeCard.supporting':
    'Passez à Pro pour une expérience sans pub et un accès complet aux fonctions.',

  'auth.signIn.emailConfirmedNotice':
    'Votre e-mail est confirmé. Connectez-vous avec votre mot de passe pour continuer.',
  'auth.language.label': "Langue de l'application",
  'auth.language.hint': 'Vous pourrez la modifier à tout moment dans Réglages.',
  'auth.reset.title': 'Réinitialiser le mot de passe',
  'auth.reset.emailPlaceholder': 'E-mail',
  'auth.reset.submit': 'Envoyer le lien',
  'auth.reset.sending': 'Envoi…',
  'auth.reset.success': 'Vérifiez votre e-mail pour le lien de réinitialisation.',
  'auth.updatePassword.title': 'Nouveau mot de passe',
  'auth.updatePassword.passwordPlaceholder': 'Nouveau mot de passe',
  'auth.updatePassword.hint': 'Au moins 6 caractères',
  'auth.updatePassword.submit': 'Mettre à jour le mot de passe',
  'auth.updatePassword.updating': 'Mise à jour…',
  'auth.updatePassword.success': 'Mot de passe mis à jour. Redirection…',

  'welcome.logoAlt': 'ShiftCoach',
  'welcome.kcalUnit': 'kcal',

  'detail.bodyClock.todaySuffix': 'aujourd’hui',
  'detail.bodyClock.statSevenDayAvg': 'Moy. 7 j',
  'detail.bodyClock.statBestDay': 'Meilleur jour',
  'detail.bodyClock.statTrend': 'Tendance',
  'detail.bodyClock.metricPeak': 'Pic de vigilance',
  'detail.bodyClock.metricLow': 'Basse énergie',
  'detail.bodyClock.metricMidpoint': 'Décalage du point médian',
  'detail.bodyClock.scoreForecastHeading': 'Prévision du score',
  'detail.bodyClock.forecastLabelToday': 'Aujourd’hui',
  'detail.bodyClock.forecastLabelTomorrow': 'Demain',
  'detail.bodyClock.forecastLabelPlusThree': '+3 jours',
  'detail.bodyClock.forecastPtsDown': '↓ {n} pts',
  'detail.bodyClock.forecastPtsUp': '↑ {n} pts',
  'detail.bodyClock.breakdownFilterAll': 'Tout',
  'detail.bodyClock.breakdownFilterSleepRhythm': 'Sommeil et rythme',
  'detail.bodyClock.breakdownFilterDay': 'Facteurs de jour',
  'detail.bodyClock.breakdownShowLess': 'Moins',
  'detail.bodyClock.breakdownToggleAria': 'Afficher ou masquer tous les facteurs du score',
  'detail.bodyClock.habitTileSleepMidpoint': 'Point médian du sommeil ±90 min',
  'detail.bodyClock.habitTileAnchorMeal': 'Repas ancrage chaque jour',
  'detail.bodyClock.habitTileLightWaking': 'Lumière au réveil',
  'detail.bodyClock.habitTileCaffeine': 'Pas de caféine 4 h avant le sommeil',
  'detail.bodyClock.motivationUnderTarget':
    '{prefix}Vous êtes un peu sous l’objectif aujourd’hui. Même 30–60 minutes de sommeil protégé ou une sieste prévue peut stabiliser la semaine.',
  'detail.bodyClock.motivationSteady':
    '{prefix}Vous êtes proche d’un rythme solide. De petits ajustements sur les horaires de sommeil aujourd’hui peuvent relever le reste de la semaine.',
  'detail.bodyClock.motivationStrong':
    '{prefix}Votre horloge biologique est en bonne forme. Continuez à protéger le sommeil de récupération entre les équipes exigeantes.',
  'detail.bodyClock.motivationForecastDip':
    '{prefix}Le score pourrait légèrement baisser demain. Un peu de sommeil protégé ou une courte sieste maintenant peut garder la semaine sur les rails.',
  'detail.bodyClock.motivationLoading':
    '{prefix}Patience — nous mettons à jour votre profil de rythme.',
  'detail.bodyClock.motivationGeneric':
    '{prefix}Continuez à enregistrer sommeil et équipes pour que le coaching reste aligné sur votre semaine.',

  'detail.fatigueRisk.whyTitle': 'Pourquoi à cette heure ?',
  'detail.fatigueRisk.whySubtitle': 'Selon votre planning et votre rythme',
  'detail.fatigueRisk.whyNoWindow':
    'Continuez à enregistrer sommeil et équipes pour afficher quand la fatigue sera la plus forte des jours comme celui-ci.',
  'detail.fatigueRisk.whyNightsYesterday':
    'Votre planning indique des nuits la nuit dernière. Le travail de nuit retarde l’horloge biologique : le creux de vigilance le plus marqué aujourd’hui se situe vers {time}. Cette plage comporte un risque accru pour la concentration et la sécurité.',
  'detail.fatigueRisk.whyNightsToday':
    'Vous avez des nuits aujourd’hui. En traversant le creux circadien, {time} est une fenêtre à risque pour la vigilance — protégez le sommeil avant et après la garde si possible.',
  'detail.fatigueRisk.whyEarlyLateYesterday':
    'Hier sur votre planning : {shiftDesc}, ce qui décale votre creux circadien. D’où le pic de fatigue vers {time}.',
  'detail.fatigueRisk.whyNightsFromSignals':
    'Vos signaux montrent encore une charge de nuit : le creux le plus fort est vers {time}.',
  'detail.fatigueRisk.whyDefault':
    'Selon votre sommeil, vos équipes et votre rythme circadien, la fenêtre de fatigue la plus risquée aujourd’hui est vers {time}.',
  'detail.fatigueRisk.whySleepDebt':
    ' Vous portez aussi environ {hours} h de dette de sommeil, ce qui accentue ce creux.',
  'detail.fatigueRisk.whyDriverFollow': ' Signal le plus fort dans vos données : {driver}',
  'detail.fatigueRisk.shiftEarlyDesc': 'une entrée très matinale',
  'detail.fatigueRisk.shiftLateDesc': 'une sortie tardive',
  'detail.fatigueRisk.driversIntro':
    'Touchez un facteur pour le développer. Classés par impact sur votre score.',
  'detail.fatigueRisk.driverExpandAria': 'Voir plus sur ce facteur',
  'detail.fatigueRisk.driverCollapseAria': 'Masquer les détails de ce facteur',
  'detail.fatigueRisk.driverFooterHint':
    'Ces signaux se mettent à jour quand vous enregistrez sommeil, équipes et récupération.',
  'detail.fatigueRisk.motivationLoading': '{prefix}Analyse de vos signaux de fatigue…',
  'detail.fatigueRisk.motivationNoData':
    '{prefix}Enregistrez sommeil et équipes pour que ce message reflète votre ressenti au travail.',
  'detail.fatigueRisk.motivationHigh':
    '{prefix}Risque de fatigue élevé — privilégiez un sommeil protégé ou une courte sieste avant la prochaine période chargée.',
  'detail.fatigueRisk.motivationModerate':
    '{prefix}Fatigue modérée aujourd’hui : repas réguliers, hydratation et horaires de sommeil aident à rester plus vif.',
  'detail.fatigueRisk.motivationLow':
    '{prefix}Le risque semble gérable pour l’instant — continuez à protéger le sommeil de récupération sur la semaine.',
  'detail.fatigueRisk.motivationCurveRise':
    '{prefix}Votre courbe monte plus tard aujourd’hui — du sommeil protégé ou une courte sieste maintenant peut sécuriser la semaine.',
  'detail.fatigueRisk.motivationConfidenceLow':
    '{prefix}Il nous faut un peu plus de données — continuez à enregistrer sommeil et équipes pour personnaliser.',
  'detail.fatigueRisk.motivationDriverSleep':
    '{prefix}Le sommeil tire vers le bas — visez un bon bloc de décompression avant la prochaine garde.',
  'detail.fatigueRisk.motivationDriverCircadian':
    '{prefix}Tension sur le rythme — des horaires de coucher et de lever plus stables soulagent la charge.',
  'detail.fatigueRisk.motivationDriverShift':
    '{prefix}La charge du planning se voit — glissez du repos entre les services, même par courts blocs.',
  'detail.fatigueRisk.motivationDriverTiming':
    '{prefix}Le creux biologique compte aujourd’hui — soyez prudent avec concentration et conduite en fin de nuit.',
  'detail.fatigueRisk.motivationDriverPhysiology':
    '{prefix}Les signaux de récupération sont bruités — privilégiez sommeil, hydratation et effort plus léger jusqu’à vous sentir plus stable.',

  'detail.hydration.todaysGoal': 'Objectif eau du jour',
  'detail.hydration.selected': 'Sélectionné',
  'detail.hydration.litreSuffix': 'L',
  'detail.hydration.ariaIncrease': 'Augmenter l’eau',
  'detail.hydration.ariaDecrease': 'Diminuer l’eau',
  'detail.hydration.ariaLogLitres': 'Enregistrer {n} litres',
  'detail.hydration.jugHelp':
    'Imaginez votre pichet d’eau. Touchez un niveau ou utilisez les flèches pour refléter ce que vous avez bu aujourd’hui.',
  'detail.hydration.motivationEmpty': 'Commencez par un petit verre et montez progressivement.',
  'detail.hydration.motivationLow': 'Bon début — chaque gorgée aide énergie et concentration.',
  'detail.hydration.motivationMid': 'Vous y êtes presque — continuez à remplir le pichet.',
  'detail.hydration.motivationHigh': 'Bravo — vous approchez de l’objectif du jour.',
  'detail.hydration.motivationFull': 'Presque atteint — excellente régularité d’hydratation.',
  'detail.hydration.whyTitle': 'Pourquoi c’est important en postés',
  'detail.hydration.whyP1':
    'Les équipes longues et de nuit, la lumière vive et la caféine favorisent la déshydratation discrète. Cela peut nuire à l’énergie, au focus et à la récupération.',
  'detail.hydration.whyP2':
    'L’objectif journalier est le total sur la journée, pas à boire d’un coup. Répartissez de petites quantités avant, pendant et après la garde.',
  'detail.hydration.weeklyTitle': 'Hydratation sur 7 jours',
  'detail.hydration.weeklySub': 'Les barres montrent ce que vous avez bu par rapport à votre objectif quotidien.',

  'detail.bingeRisk.scoreLabel': 'Score',
  'detail.bingeRisk.bandLow': 'Risque faible',
  'detail.bingeRisk.bandMedium': 'Risque moyen',
  'detail.bingeRisk.bandHigh': 'Risque élevé',
  'detail.bingeRisk.levelLow': 'Faible',
  'detail.bingeRisk.levelMedium': 'Moyen',
  'detail.bingeRisk.levelHigh': 'Élevé',
  'detail.bingeRisk.headlineLow': 'Envies plutôt stables',
  'detail.bingeRisk.headlineMedium': 'Envies plus probables sur des postes fatigués',
  'detail.bingeRisk.headlineHigh': 'Risque élevé de fortes envies et d’excès alimentaires',
  'detail.bingeRisk.explainerDefault':
    'Selon votre sommeil récent, vos équipes et vos habitudes, ceci estime la probabilité de fortes envies ou d’excès dans le jour ou deux suivants.',
  'detail.bingeRisk.sectionKicker': 'Risque d’excès en postés',
  'detail.bingeRisk.noRecentData': 'Pas de données récentes',
  'detail.bingeRisk.driversTitle': 'Principaux facteurs cette semaine',
  'detail.bingeRisk.factsLine1':
    'Le risque d’excès estime la probabilité de manger en trop selon le sommeil, les équipes et les habitudes récentes.',
  'detail.bingeRisk.factsLine2':
    'Faible = stable. Moyen = surveillez les déclencheurs. Élevé = soutien et planification renforcés.',
  'detail.bingeRisk.colorsTitle': 'Signification des couleurs',
  'detail.bingeRisk.colorLow': 'Faible',
  'detail.bingeRisk.colorLowDesc': 'Schéma équilibré et stable.',
  'detail.bingeRisk.colorMedium': 'Moyen',
  'detail.bingeRisk.colorMediumDesc':
    'Quelques signaux d’alerte — soyez plus attentif aux repas, au sommeil et à la caféine.',
  'detail.bingeRisk.colorHigh': 'Élevé',
  'detail.bingeRisk.colorHighDesc':
    'Votre corps est à plat — planifiez soutien et récupération dès maintenant.',
  'detail.bingeRisk.axisLow': 'Faible',
  'detail.bingeRisk.axisHigh': 'Élevé',
  'detail.bingeRisk.whyTitle': 'Pourquoi les postés font plus d’excès',
  'detail.bingeRisk.whyLi1':
    'Dette de sommeil : moins de sommeil = plus de ghreline (faim) et moins de signal de satiété (leptine).',
  'detail.bingeRisk.whyLi2':
    'Décalage circadien : manger vers 3h–4h quand le corps attend le sommeil favorise les envies de sucré-salé et le stockage.',
  'detail.bingeRisk.whyLi3':
    'Stress et émotions : des gardes longues et denses sans pauses font de la nourriture la récompense la plus facile.',
  'detail.bingeRisk.whyLi4':
    'Environnement : distributeurs, plats à emporter et boissons énergisantes toujours dispo la nuit.',
  'detail.bingeRisk.helpsTitle': 'Comment ShiftCoach vous aide',
  'detail.bingeRisk.helpsLi1':
    'Garde le sommeil sur les rails : vous oriente vers assez de sommeil et de meilleurs horaires pour vos équipes.',
  'detail.bingeRisk.helpsLi2':
    'Cadence les repas sur votre planning : repas riches en protéines quand vous êtes le plus alerte, pas quand le corps attend le sommeil.',
  'detail.bingeRisk.helpsLi3':
    'Signale les fenêtres à risque : les nuits critiques apparaissent sur le tableau de bord pour anticiper.',
  'detail.bingeRisk.helpsLi4':
    'Favorise un apport régulier : au lieu de jeûner puis craquer, des petits repas réguliers sont suggérés.',
  'detail.bingeRisk.tipsTitle': 'Actions rapides si le risque est moyen ou élevé',
  'detail.bingeRisk.tipsLi1':
    'Mangez une collation prévue (protéines + fibres) avant de rentrer après une longue garde ou de nuit.',
  'detail.bingeRisk.tipsLi2':
    'Fixez une heure de « cuisine fermée » pour éviter le grignotage tardif.',
  'detail.bingeRisk.tipsLi3':
    'Choisissez une récompense non alimentaire après le travail : douche, musique, marche, appel, jeu, etc.',
  'detail.bingeRisk.tipsLi4':
    'Les jours off, privilégiez un sommeil principal solide plutôt que de nombreuses micro-siestes.',
  'detail.bingeRisk.tipsFooter':
    'L’objectif n’est pas la perfection : il s’agit de pencher la balance pour que les excès restent rares, pas votre norme.',
  'detail.bingeRisk.chipSleepLabel': 'Sommeil',
  'detail.bingeRisk.chipShiftLabel': 'Charge des équipes',
  'detail.bingeRisk.chipEatingLabel': 'Repas',
  'detail.bingeRisk.chipLoading': '…',
  'detail.bingeRisk.chipSleepDebt': '{h} h de dette',
  'detail.bingeRisk.chipSleepBalanced': 'Équilibré',
  'detail.bingeRisk.chipSleepSurplus': 'Légèrement au-dessus',
  'detail.bingeRisk.chipSleepNoData': 'Enregistrez le sommeil pour voir la dette',
  'detail.bingeRisk.chipShiftUnknown': 'Enregistrez les équipes pour la charge',
  'detail.bingeRisk.chipEatingStable': 'Stable',
  'detail.bingeRisk.chipEatingWatch': 'À surveiller',
  'detail.bingeRisk.chipEatingIrregular': 'Irrégulier',

  'detail.wearablesSetup.title': 'Connecter votre wearable',
  'detail.wearablesSetup.howReadsData': 'Comment ShiftCoach lit vos données',
  'detail.wearablesSetup.appleWatch': 'Apple Watch',
  'detail.wearablesSetup.appleWatchDesc': 'Apple Health sur votre iPhone (montre + téléphone)',
  'detail.wearablesSetup.samsungAndroid': 'Montre Samsung / Android',
  'detail.wearablesSetup.samsungAndroidDesc': 'Health Connect (montre, téléphone et apps)',
  'detail.wearablesSetup.otherWearable': 'Autre wearable (Fitbit, Garmin, etc.)',
  'detail.wearablesSetup.otherWearableDesc': 'Pour l’instant, connectez via les apps santé du téléphone',
  'detail.wearablesSetup.stepsApple': 'Étapes pour Apple Watch / iPhone',
  'detail.wearablesSetup.appleStep1':
    'Vérifiez que la montre est appairée à l’iPhone et qu’Apple Health est activé dans l’app Montre.',
  'detail.wearablesSetup.appleStep2':
    'Ouvrez l’app Santé sur l’iPhone et vérifiez que Pas (et sommeil) sont cohérents. Apple Health peut combiner iPhone et Apple Watch ; activez Mouvement et fitness pour compter les pas téléphone.',
  'detail.wearablesSetup.appleStep3':
    'Dans ShiftCoach, allez dans Réglages → Synchroniser les wearables (ou le bouton d’accueil) et suivez les invites lorsque « Connecter Apple Health » est disponible.',
  'detail.wearablesSetup.appleBeta':
    'Pour la bêta actuelle, les données Apple Watch apparaîtront lorsque le support HealthKit sera activé sur la version App Store de ShiftCoach.',
  'detail.wearablesSetup.stepsSamsung': 'Étapes pour montres Samsung / Android',
  'detail.wearablesSetup.samsungStep1': 'Ouvrez Samsung Health sur le téléphone → Réglages → Services connectés.',
  'detail.wearablesSetup.samsungStep2':
    'Connectez Health Connect et activez la synchro pas, sommeil et fréquence cardiaque (libellés variables selon les apps).',
  'detail.wearablesSetup.samsungStep3':
    'Vérifiez que l’app montre (ex. Samsung Health) écrit pas, sommeil et FC dans Health Connect.',
  'detail.wearablesSetup.samsungStep4':
    'Dans ShiftCoach, touchez « Synchroniser les wearables » sur le tableau de bord et connectez-vous avec le même compte Google.',
  'detail.wearablesSetup.samsungDone':
    'Ensuite, ShiftCoach récupère automatiquement pas, sommeil et FC depuis Health Connect à l’ouverture.',
  'detail.wearablesSetup.otherTitle': 'Autres wearables (Fitbit, Garmin, etc.)',
  'detail.wearablesSetup.otherP1':
    'Les connexions directes pour d’autres marques arriveront plus tard. Pour l’instant, synchronisez l’appareil vers Apple Health ou Health Connect sur le téléphone, puis laissez ShiftCoach lire depuis là.',
  'detail.wearablesSetup.otherP2':
    'Beaucoup d’apps (Fitbit, Garmin, etc.) peuvent écrire pas et sommeil dans ces hubs depuis leurs réglages.',
  'detail.wearablesSetup.whatYouGet': 'Une fois connecté',
  'detail.wearablesSetup.benefit1': 'Pas et mouvement automatiques sur l’accueil et la page Activité.',
  'detail.wearablesSetup.benefit2': 'Scores sommeil et Shift Lag plus fiables, basés sur de vraies nuits.',
  'detail.wearablesSetup.benefit3':
    'Meilleurs signaux mouvement et récupération sur le tableau de bord quand équipes, sommeil et activité sont réels.',
  'detail.wearablesSetup.readyToSync': 'Prêt à synchroniser ?',
  'detail.wearablesSetup.tapBelow': 'Touchez ci-dessous après avoir suivi les étapes de votre appareil.',
  'detail.wearablesSetup.statusConnected': 'Données santé connectées',
  'detail.wearablesSetup.statusConnectedDesc':
    'Apple Health ou Health Connect est lié. Touchez synchroniser pour récupérer les derniers pas, sommeil et FC.',
  'detail.wearablesSetup.verifiedWorking': 'Connexion vérifiée — les données santé arrivent dans ShiftCoach.',
  'detail.wearablesSetup.stepsToday': 'Pas aujourd’hui : {count}',
  'detail.wearablesSetup.verifiedConfirmation':
    'Connecté et opérationnel. Pas, sommeil et FC apparaîtront sur le tableau de bord après synchro (Apple Health ou Health Connect, téléphone + montre si le système les fusionne).',
  'detail.wearablesSetup.statusNotConnected': 'Non connecté',
  'detail.wearablesSetup.notConnectedWhy':
    'ShiftCoach a besoin de lire Pas, Sommeil et Fréquence cardiaque depuis Apple Health (iPhone) ou Health Connect (Android). Les données doivent déjà exister dans Health Connect (Samsung Health, Google Fit ou autres sources autorisées). Si Samsung Health reste bloqué, essayez Google Fit vers Health Connect — voir l’aide ci-dessus.',
  'detail.wearablesSetup.notConnectedWhyInfo': 'Pourquoi la connexion santé est nécessaire',
  'detail.wearablesSetup.notConnectedHint': "Touchez l’icône d’info pour plus de détails.",
  'detail.wearablesSetup.connectGoogleFit': 'Ouvrir la configuration wearable',
}
