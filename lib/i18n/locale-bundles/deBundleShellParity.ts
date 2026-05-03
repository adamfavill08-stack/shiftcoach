/**
 * German strings for keys defined inline on `en.ts` / `es.ts` but absent from the
 * modular DE merges — keeps `de` bundle at parity with English for CI.
 */
export const deBundleShellParity: Record<string, string> = {
  'upgrade.backToSettingsAria': 'Zurück zu den Einstellungen',
  'upgrade.pageTitle': 'Auf Pro upgraden',
  'upgrade.trustedBy': 'Vertraut von Schichtarbeitern weltweit',
  'upgrade.bannerKicker': 'ShiftCoach Pro',
  'upgrade.bannerTitle': 'Alle Gesundheitswerkzeuge für Schichtarbeit freischalten',
  'upgrade.bannerSubtitle':
    'Schalte tiefere Analysen und Premium-Coaching-Funktionen frei, die für wechselnde Dienstpläne gedacht sind.',
  'upgrade.benefitsTitle': 'Das schaltest du frei',
  'upgrade.benefits.unlimitedHistory': 'Unbegrenzte Historie für Schichten und Termine',
  'upgrade.benefits.noAds': 'Ohne Werbung',
  'upgrade.benefits.adjustedCalories': 'Angepasste Kalorien',
  'upgrade.benefits.nextMealWindow': 'Fenster für die nächste Mahlzeit',
  'upgrade.benefits.shiftLagInsights': 'Einblicke zum Schicht-Jetlag',
  'upgrade.benefits.calorieProfileSetup': 'Kalorien- und Profil-Setup',
  'upgrade.benefits.allBlogArticles': 'Alle Blog-Artikel',
  'upgrade.buttons.monthly': 'Pro monatlich',
  'upgrade.buttons.monthlyWithPrice': 'Pro monatlich',
  'upgrade.buttons.monthlyWithDynamicPrice': 'Pro monatlich — {price}',
  'upgrade.buttons.annual': 'Pro jährlich',
  'upgrade.buttons.annualWithPrice': 'Pro jährlich',
  'upgrade.buttons.annualWithDynamicPrice': 'Pro jährlich — {price}',
  'upgrade.buttons.annualSavings': '35 % günstiger als monatlich',
  'upgrade.buttons.annualSavingsDynamic': '{percent} % günstiger als monatlich',
  'upgrade.buttons.restore': 'Käufe wiederherstellen',
  'upgrade.buttons.continuePurchase': 'Weiter zum Kauf',
  'upgrade.buttons.restorePurchasesLink': 'Käufe wiederherstellen',
  'upgrade.buttons.processing': 'Wird verarbeitet…',
  'upgrade.buttons.restoring': 'Wird wiederhergestellt…',
  'upgrade.planCard.monthlyTitle': 'Pro monatlich',
  'upgrade.planCard.monthlySubtitle': 'Voller Pro-Zugang',
  'upgrade.planCard.yearlyTitle': 'Pro jährlich',
  'upgrade.planCard.yearlySubtitle': 'Bester Preis-Leistungs-Wert',
  'upgrade.planCard.perMonth': 'Pro Monat',
  'upgrade.planCard.perYear': 'Pro Jahr',
  'upgrade.planCard.saveBadge': 'Spare {percent} %',
  'upgrade.planCard.saveBadgeStatic': 'Spare 35 %',
  'upgrade.alreadyPro.title': 'Du bist bereits Pro.',
  'upgrade.alreadyPro.message': 'Alle Premium-Funktionen sind auf deinem Konto bereits freigeschaltet.',
  'upgrade.purchasesUnavailable': 'Käufe sind in der mobilen ShiftCoach-App verfügbar.',

  'subscription.upgradeCard.cta': 'Auf Pro upgraden',
  'subscription.upgradeCard.supporting':
    'Upgrade auf Pro für eine werbefreie Erfahrung und vollen Funktionszugriff.',

  'auth.signIn.emailConfirmedNotice':
    'Deine E-Mail ist bestätigt. Melde dich mit deinem Passwort an, um fortzufahren.',
  'auth.language.label': 'App-Sprache',
  'auth.language.hint': 'Du kannst sie jederzeit in den Einstellungen ändern.',
  'auth.reset.title': 'Passwort zurücksetzen',
  'auth.reset.emailPlaceholder': 'E-Mail',
  'auth.reset.submit': 'Link senden',
  'auth.reset.sending': 'Wird gesendet…',
  'auth.reset.success': 'Prüfe deine E-Mail auf den Link zum Zurücksetzen.',
  'auth.updatePassword.title': 'Neues Passwort',
  'auth.updatePassword.passwordPlaceholder': 'Neues Passwort',
  'auth.updatePassword.hint': 'Mindestens 6 Zeichen',
  'auth.updatePassword.submit': 'Passwort aktualisieren',
  'auth.updatePassword.updating': 'Wird aktualisiert…',
  'auth.updatePassword.success': 'Passwort aktualisiert. Weiterleitung…',

  'welcome.logoAlt': 'ShiftCoach',
  'welcome.kcalUnit': 'kcal',

  'detail.bodyClock.todaySuffix': 'heute',
  'detail.bodyClock.statSevenDayAvg': 'Ø 7 T',
  'detail.bodyClock.statBestDay': 'Bester Tag',
  'detail.bodyClock.statTrend': 'Trend',
  'detail.bodyClock.metricPeak': 'Wachheits-Spitze',
  'detail.bodyClock.metricLow': 'Niedrige Energie',
  'detail.bodyClock.metricMidpoint': 'Verschiebung des Mittelpunkts',
  'detail.bodyClock.scoreForecastHeading': 'Score-Prognose',
  'detail.bodyClock.forecastLabelToday': 'Heute',
  'detail.bodyClock.forecastLabelTomorrow': 'Morgen',
  'detail.bodyClock.forecastLabelPlusThree': '+3 Tage',
  'detail.bodyClock.forecastPtsDown': '↓ {n} Pkt.',
  'detail.bodyClock.forecastPtsUp': '↑ {n} Pkt.',
  'detail.bodyClock.breakdownFilterAll': 'Alle',
  'detail.bodyClock.breakdownFilterSleepRhythm': 'Schlaf und Rhythmus',
  'detail.bodyClock.breakdownFilterDay': 'Tagesfaktoren',
  'detail.bodyClock.breakdownShowLess': 'Weniger',
  'detail.bodyClock.breakdownToggleAria': 'Alle Score-Faktoren ein- oder ausblenden',
  'detail.bodyClock.habitTileSleepMidpoint': 'Schlaf-Mittelpunkt ±90 Min.',
  'detail.bodyClock.habitTileAnchorMeal': 'Anker-Mahlzeit jeden Tag',
  'detail.bodyClock.habitTileLightWaking': 'Licht beim Aufwachen',
  'detail.bodyClock.habitTileCaffeine': 'Keine Koffein 4 h vor dem Schlaf',
  'detail.bodyClock.motivationUnderTarget':
    '{prefix}Du liegst heute etwas unter dem Ziel. Schon 30–60 Minuten geschützter Schlaf oder eine geplante Nickerchen-Pause können die Woche stabilisieren.',
  'detail.bodyClock.motivationSteady':
    '{prefix}Du bist nah an einem soliden Rhythmus. Kleine Anpassungen an den Schlafzeiten heute können den Rest der Woche anheben.',
  'detail.bodyClock.motivationStrong':
    '{prefix}Deine innere Uhr steht gut da. Schütze weiter den Erholungsschlaf zwischen anspruchsvollen Schichten.',
  'detail.bodyClock.motivationForecastDip':
    '{prefix}Der Score könnte morgen leicht sinken. Etwas geschützter Schlaf oder ein kurzes Nickerchen jetzt kann die Woche halten.',
  'detail.bodyClock.motivationLoading':
    '{prefix}Einen Moment — wir aktualisieren dein Rhythmusprofil.',
  'detail.bodyClock.motivationGeneric':
    '{prefix}Trage weiter Schlaf und Schichten ein, damit das Coaching zu deiner Woche passt.',

  'detail.fatigueRisk.whyTitle': 'Warum zu dieser Uhrzeit?',
  'detail.fatigueRisk.whySubtitle': 'Nach Dienstplan und Rhythmus',
  'detail.fatigueRisk.whyNoWindow':
    'Trage weiter Schlaf und Schichten ein, um an solchen Tagen zu sehen, wann die Müdigkeit am stärksten ist.',
  'detail.fatigueRisk.whyNightsYesterday':
    'Dein Plan zeigt Nachtdienste in der letzten Nacht. Nachtarbeit verzögert die innere Uhr: Der ausgeprägteste Wachheits-Tiefpunkt heute liegt gegen {time}. In diesem Fenster steigen Konzentrations- und Sicherheitsrisiken.',
  'detail.fatigueRisk.whyNightsToday':
    'Du hast heute Nachtdienste. Beim Durchqueren des circadianen Tiefs ist {time} ein Risikofenster für die Wachheit — schütze den Schlaf vor und nach der Schicht, wenn möglich.',
  'detail.fatigueRisk.whyEarlyLateYesterday':
    'Gestern im Plan: {shiftDesc}, dadurch verschiebt sich dein circadianes Tief. Daher der Müdigkeits-Gipfel gegen {time}.',
  'detail.fatigueRisk.whyNightsFromSignals':
    'Deine Signale zeigen noch Nachtlast: Das stärkste Tief liegt gegen {time}.',
  'detail.fatigueRisk.whyDefault':
    'Nach Schlaf, Schichten und circadianem Rhythmus ist das riskanteste Müdigkeitsfenster heute gegen {time}.',
  'detail.fatigueRisk.whySleepDebt':
    ' Du hast außerdem etwa {hours} h Schlafschuld, was dieses Tief verstärkt.',
  'detail.fatigueRisk.whyDriverFollow': ' Stärkstes Signal in deinen Daten: {driver}',
  'detail.fatigueRisk.shiftEarlyDesc': 'ein sehr früher Dienstbeginn',
  'detail.fatigueRisk.shiftLateDesc': 'ein später Dienstende',
  'detail.fatigueRisk.driversIntro':
    'Tippe auf einen Faktor, um Details zu sehen. Sortiert nach Einfluss auf deinen Score.',
  'detail.fatigueRisk.driverExpandAria': 'Mehr zu diesem Faktor',
  'detail.fatigueRisk.driverCollapseAria': 'Details zu diesem Faktor ausblenden',
  'detail.fatigueRisk.driverFooterHint':
    'Diese Signale aktualisieren sich, wenn du Schlaf, Schichten und Erholung erfasst.',
  'detail.fatigueRisk.motivationLoading': '{prefix}Wir werten deine Müdigkeitssignale aus…',
  'detail.fatigueRisk.motivationNoData':
    '{prefix}Trage Schlaf und Schichten ein, damit dieser Hinweis zu deinem Gefühl bei der Arbeit passt.',
  'detail.fatigueRisk.motivationHigh':
    '{prefix}Hohes Müdigkeitsrisiko — priorisiere geschützten Schlaf oder ein kurzes Nickerchen vor der nächsten belastenden Phase.',
  'detail.fatigueRisk.motivationModerate':
    '{prefix}Heute moderate Müdigkeit: regelmäßige Mahlzeiten, Flüssigkeit und Schlafzeiten helfen, wacher zu bleiben.',
  'detail.fatigueRisk.motivationLow':
    '{prefix}Das Risiko wirkt vorerst beherrschbar — schütze weiter den Erholungsschlaf über die Woche.',
  'detail.fatigueRisk.motivationCurveRise':
    '{prefix}Deine Kurve steigt heute später — geschützter Schlaf oder ein kurzes Nickerchen jetzt kann die Woche absichern.',
  'detail.fatigueRisk.motivationConfidenceLow':
    '{prefix}Wir brauchen noch etwas mehr Daten — trage weiter Schlaf und Schichten ein zur Personalisierung.',
  'detail.fatigueRisk.motivationDriverSleep':
    '{prefix}Schlaf zieht nach unten — strebe einen guten Entspannungsblock vor der nächsten Schicht an.',
  'detail.fatigueRisk.motivationDriverCircadian':
    '{prefix}Belastung auf dem Rhythmus — stabilere Zu- und Aufstehzeiten entlasten.',
  'detail.fatigueRisk.motivationDriverShift':
    '{prefix}Die Dienstlast zeigt sich — schiebe Ruhe zwischen die Schichten, auch in kurzen Blöcken.',
  'detail.fatigueRisk.motivationDriverTiming':
    '{prefix}Das biologische Tief zählt heute — sei vorsichtig mit Konzentration und Fahren gegen Ende der Nacht.',
  'detail.fatigueRisk.motivationDriverPhysiology':
    '{prefix}Erholungssignale sind verrauscht — priorisiere Schlaf, Flüssigkeit und leichtere Belastung, bis du dich stabiler fühlst.',

  'detail.hydration.todaysGoal': 'Heutiges Wasserziel',
  'detail.hydration.selected': 'Ausgewählt',
  'detail.hydration.litreSuffix': 'L',
  'detail.hydration.ariaIncrease': 'Wasser erhöhen',
  'detail.hydration.ariaDecrease': 'Wasser verringern',
  'detail.hydration.ariaLogLitres': '{n} Liter eintragen',
  'detail.hydration.jugHelp':
    'Stell dir deine Wasserkanne vor. Tippe auf eine Stufe oder nutze die Pfeile, um wiederzugeben, was du heute getrunken hast.',
  'detail.hydration.motivationEmpty': 'Starte mit einem kleinen Glas und steigere dich schrittweise.',
  'detail.hydration.motivationLow': 'Guter Anfang — jeder Schluck hilft Energie und Fokus.',
  'detail.hydration.motivationMid': 'Fast da — füll die Kanne weiter.',
  'detail.hydration.motivationHigh': 'Gut — du näherst dich dem Tagesziel.',
  'detail.hydration.motivationFull': 'Fast erreicht — starke Trinkgewohnheit.',
  'detail.hydration.whyTitle': 'Warum das bei Schichtarbeit wichtig ist',
  'detail.hydration.whyP1':
    'Lange und Nachtschichten, helles Licht und Koffein begünstigen stille Dehydration. Das kann Energie, Fokus und Erholung beeinträchtigen.',
  'detail.hydration.whyP2':
    'Das Tagesziel ist die Summe über den Tag, nicht auf einmal trinken. Verteile kleine Mengen vor, während und nach der Schicht.',
  'detail.hydration.weeklyTitle': 'Hydration über 7 Tage',
  'detail.hydration.weeklySub': 'Die Balken zeigen dein Trinken im Vergleich zum Tagesziel.',

  'detail.bingeRisk.scoreLabel': 'Score',
  'detail.bingeRisk.bandLow': 'Niedriges Risiko',
  'detail.bingeRisk.bandMedium': 'Mittleres Risiko',
  'detail.bingeRisk.bandHigh': 'Hohes Risiko',
  'detail.bingeRisk.levelLow': 'Niedrig',
  'detail.bingeRisk.levelMedium': 'Mittel',
  'detail.bingeRisk.levelHigh': 'Hoch',
  'detail.bingeRisk.headlineLow': 'Heißhunger eher stabil',
  'detail.bingeRisk.headlineMedium': 'Heißhunger wahrscheinlicher bei müden Schichten',
  'detail.bingeRisk.headlineHigh': 'Hohes Risiko für starken Heißhunger und Essattacken',
  'detail.bingeRisk.explainerDefault':
    'Nach deinem letzten Schlaf, deinen Schichten und Gewohnheiten schätzt dies die Wahrscheinlichkeit von starkem Heißhunger oder Essattacken in den nächsten ein bis zwei Tagen.',
  'detail.bingeRisk.sectionKicker': 'Essattacken-Risiko bei Schichtarbeit',
  'detail.bingeRisk.noRecentData': 'Keine aktuellen Daten',
  'detail.bingeRisk.driversTitle': 'Wichtigste Faktoren diese Woche',
  'detail.bingeRisk.factsLine1':
    'Das Risiko schätzt die Wahrscheinlichkeit zu viel zu essen nach Schlaf, Schichten und jüngsten Gewohnheiten.',
  'detail.bingeRisk.factsLine2':
    'Niedrig = stabil. Mittel = Auslöser im Blick. Hoch = mehr Unterstützung und Planung.',
  'detail.bingeRisk.colorsTitle': 'Bedeutung der Farben',
  'detail.bingeRisk.colorLow': 'Niedrig',
  'detail.bingeRisk.colorLowDesc': 'Ausgewogenes, stabiles Muster.',
  'detail.bingeRisk.colorMedium': 'Mittel',
  'detail.bingeRisk.colorMediumDesc':
    'Einige Warnsignale — achte mehr auf Mahlzeiten, Schlaf und Koffein.',
  'detail.bingeRisk.colorHigh': 'Hoch',
  'detail.bingeRisk.colorHighDesc':
    'Dein Körper ist am Limit — plane jetzt Unterstützung und Erholung.',
  'detail.bingeRisk.axisLow': 'Niedrig',
  'detail.bingeRisk.axisHigh': 'Hoch',
  'detail.bingeRisk.whyTitle': 'Warum Schichtarbeit mehr Essattacken begünstigt',
  'detail.bingeRisk.whyLi1':
    'Schlafschuld: weniger Schlaf = mehr Ghrelin (Hunger) und weniger Sättigungssignal (Leptin).',
  'detail.bingeRisk.whyLi2':
    'Circadianer Versatz: Essen gegen 3–4 Uhr, wenn der Körper Schlaf erwartet, begünstigt süß-salzige Gelüste und Speicherung.',
  'detail.bingeRisk.whyLi3':
    'Stress und Emotionen: lange, dichte Schichten ohne Pausen machen Essen zur einfachsten Belohnung.',
  'detail.bingeRisk.whyLi4':
    'Umgebung: Automaten, Lieferessen und Energy-Drinks sind nachts immer da.',
  'detail.bingeRisk.helpsTitle': 'So hilft dir ShiftCoach',
  'detail.bingeRisk.helpsLi1':
    'Hält Schlaf im Rahmen: führt zu genug Schlaf und besseren Zeiten für deine Schichten.',
  'detail.bingeRisk.helpsLi2':
    'Taktet Mahlzeiten am Plan: proteinreiche Mahlzeiten, wenn du am wachsten bist — nicht, wenn der Körper Schlaf erwartet.',
  'detail.bingeRisk.helpsLi3':
    'Zeigt Risikofenster: kritische Nächte erscheinen auf dem Dashboard zum vorausschauenden Planen.',
  'detail.bingeRisk.helpsLi4':
    'Fördert regelmäßige Zufuhr: statt fasten und dann ausbrechen werden kleine, regelmäßige Mahlzeiten vorgeschlagen.',
  'detail.bingeRisk.tipsTitle': 'Schnelle Maßnahmen bei mittlerem oder hohem Risiko',
  'detail.bingeRisk.tipsLi1':
    'Iss eine geplante Zwischenmahlzeit (Protein + Ballaststoffe), bevor du nach langer oder Nachtschicht nach Hause kommst.',
  'detail.bingeRisk.tipsLi2':
    'Setze eine «Küche zu»-Uhr, um spätes Naschen zu vermeiden.',
  'detail.bingeRisk.tipsLi3':
    'Wähle eine nicht essbare Belohnung nach der Arbeit: Dusche, Musik, Spaziergang, Anruf, Spiel usw.',
  'detail.bingeRisk.tipsLi4':
    'An freien Tagen: lieber ein solider Hauptschlaf als viele Mikro-Nickerchen.',
  'detail.bingeRisk.tipsFooter':
    'Es geht nicht um Perfektion — sondern die Waage so zu legen, dass Essattacken selten bleiben, nicht zur Norm.',
  'detail.bingeRisk.chipSleepLabel': 'Schlaf',
  'detail.bingeRisk.chipShiftLabel': 'Dienstlast',
  'detail.bingeRisk.chipEatingLabel': 'Mahlzeiten',
  'detail.bingeRisk.chipLoading': '…',
  'detail.bingeRisk.chipSleepDebt': '{h} h Schulden',
  'detail.bingeRisk.chipSleepBalanced': 'Ausgeglichen',
  'detail.bingeRisk.chipSleepSurplus': 'Leicht darüber',
  'detail.bingeRisk.chipSleepNoData': 'Schlaf eintragen, um Schulden zu sehen',
  'detail.bingeRisk.chipShiftUnknown': 'Schichten eintragen für die Last',
  'detail.bingeRisk.chipEatingStable': 'Stabil',
  'detail.bingeRisk.chipEatingWatch': 'Im Blick behalten',
  'detail.bingeRisk.chipEatingIrregular': 'Unregelmäßig',

  'detail.wearablesSetup.title': 'Wearable verbinden',
  'detail.wearablesSetup.howReadsData': 'So liest ShiftCoach deine Daten',
  'detail.wearablesSetup.appleWatch': 'Apple Watch',
  'detail.wearablesSetup.appleWatchDesc': 'Apple Health auf deinem iPhone (Uhr + Telefon)',
  'detail.wearablesSetup.samsungAndroid': 'Samsung-Uhr / Android',
  'detail.wearablesSetup.samsungAndroidDesc': 'Health Connect (Uhr, Telefon und Apps)',
  'detail.wearablesSetup.otherWearable': 'Anderes Wearable (Fitbit, Garmin usw.)',
  'detail.wearablesSetup.otherWearableDesc': 'Vorerst über die Gesundheits-Apps des Telefons verbinden',
  'detail.wearablesSetup.stepsApple': 'Schritte für Apple Watch / iPhone',
  'detail.wearablesSetup.appleStep1':
    'Prüfe, ob die Uhr mit dem iPhone gekoppelt ist und Apple Health in der Watch-App aktiv ist.',
  'detail.wearablesSetup.appleStep2':
    'Öffne die Health-App auf dem iPhone und prüfe, ob Schritte (und Schlaf) plausibel sind. Apple Health kann iPhone und Apple Watch kombinieren; aktiviere «Bewegung und Fitness» für Telefon-Schritte.',
  'detail.wearablesSetup.appleStep3':
    'In ShiftCoach: Einstellungen → Wearables synchronisieren (oder Start-Button) und den Anweisungen folgen, wenn «Apple Health verbinden» verfügbar ist.',
  'detail.wearablesSetup.appleBeta':
    'In der aktuellen Beta erscheinen Apple-Watch-Daten, sobald HealthKit in der App-Store-Version von ShiftCoach freigeschaltet ist.',
  'detail.wearablesSetup.stepsSamsung': 'Schritte für Samsung-Uhren / Android',
  'detail.wearablesSetup.samsungStep1': 'Samsung Health auf dem Telefon öffnen → Einstellungen → Verbundene Dienste.',
  'detail.wearablesSetup.samsungStep2':
    'Health Connect verbinden und Sync für Schritte, Schlaf und Herzfrequenz aktivieren (Bezeichnungen je nach App unterschiedlich).',
  'detail.wearablesSetup.samsungStep3':
    'Prüfe, dass die Uhren-App (z. B. Samsung Health) Schritte, Schlaf und HF in Health Connect schreibt.',
  'detail.wearablesSetup.samsungStep4':
    'In ShiftCoach auf dem Dashboard «Wearables synchronisieren» tippen und mit demselben Google-Konto anmelden.',
  'detail.wearablesSetup.samsungDone':
    'Danach holt ShiftCoach beim Öffnen automatisch Schritte, Schlaf und HF aus Health Connect.',
  'detail.wearablesSetup.otherTitle': 'Andere Wearables (Fitbit, Garmin usw.)',
  'detail.wearablesSetup.otherP1':
    'Direkte Verbindungen für andere Marken kommen später. Vorerst das Gerät zu Apple Health oder Health Connect auf dem Telefon synchronisieren, dann liest ShiftCoach von dort.',
  'detail.wearablesSetup.otherP2':
    'Viele Apps (Fitbit, Garmin usw.) können Schritte und Schlaf in diese Hubs aus ihren Einstellungen schreiben.',
  'detail.wearablesSetup.whatYouGet': 'Sobald verbunden',
  'detail.wearablesSetup.benefit1': 'Automatische Schritte und Bewegung auf Start und Aktivitätsseite.',
  'detail.wearablesSetup.benefit2': 'Zuverlässigere Schlaf- und Shift-Lag-Scores aus echten Nächten.',
  'detail.wearablesSetup.benefit3':
    'Bessere Bewegungs- und Erholungssignale auf dem Dashboard, wenn Schichten, Schlaf und Aktivität real sind.',
  'detail.wearablesSetup.readyToSync': 'Bereit zum Synchronisieren?',
  'detail.wearablesSetup.tapBelow': 'Tippe unten, nachdem du die Schritte für dein Gerät erledigt hast.',
  'detail.wearablesSetup.statusConnected': 'Gesundheitsdaten verbunden',
  'detail.wearablesSetup.statusConnectedDesc':
    'Apple Health oder Health Connect ist verknüpft. Tippe auf Synchronisieren, um die neuesten Schritte, Schlaf und HF zu holen.',
  'detail.wearablesSetup.verifiedWorking': 'Verbindung geprüft — Gesundheitsdaten kommen in ShiftCoach an.',
  'detail.wearablesSetup.stepsToday': 'Schritte heute: {count}',
  'detail.wearablesSetup.verifiedConfirmation':
    'Verbunden und aktiv. Schritte, Schlaf und HF erscheinen nach der Sync auf dem Dashboard (Apple Health oder Health Connect; Telefon + Uhr, wenn das System zusammenführt).',
  'detail.wearablesSetup.statusNotConnected': 'Nicht verbunden',
  'detail.wearablesSetup.notConnectedWhy':
    'ShiftCoach muss Schritte, Schlaf und Herzfrequenz aus Apple Health (iPhone) oder Health Connect (Android) lesen. Die Daten müssen bereits in Health Connect existieren (Samsung Health, Google Fit oder andere freigegebene Quellen). Wenn Samsung Health hängt, versuche Google Fit zu Health Connect — siehe Hilfe oben.',
  'detail.wearablesSetup.notConnectedWhyInfo': 'Warum die Gesundheitsverbindung nötig ist',
  'detail.wearablesSetup.notConnectedHint': 'Tippe auf das Info-Symbol für mehr Details.',
  'detail.wearablesSetup.connectGoogleFit': 'Wearable-Einrichtung öffnen',
}
