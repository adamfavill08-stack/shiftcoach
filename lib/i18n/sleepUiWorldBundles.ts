/**
 * Sleep UI strings for DE / FR / PL / pt-BR beyond the small overrides in sleepUiMessages.ts.
 * Covers modals, charts, timeline, ShiftLag, quick sleep, log cards, FAB, session list.
 */
export const sleepUiWorldDe: Record<string, string> = {
  'sleepJetlag.category.low': 'Niedrig',
  'sleepJetlag.category.moderate': 'Mittel',
  'sleepJetlag.category.high': 'Hoch',

  'sleepLog.title': 'Schlaf erfassen',
  'sleepLog.logNap': 'Nickerchen erfassen',

  'sleepLogs.shiftOff': 'FREI',
  'sleepLogs.duration0': '0 Std.',
  'sleepLogs.durationH': '{h} Std.',
  'sleepLogs.durationHM': '{h} Std. {m} Min.',
  'sleepCard.durationHM': '{h} Std. {m} Min.',

  'sleepSW.pageTitle': 'Schlaf',
  'sleepSW.backHome': 'Zurück zur Startseite',
  'sleepSW.loading': 'Schlafdaten werden geladen…',
  'sleepSW.metricsTitle': 'Schlafmetriken',
  'sleepSW.metricsHeading': 'Ziel für heute Nacht & Wochenüberblick',
  'sleepSW.tonightTarget': 'Ziel für heute Nacht',
  'sleepSW.tonightHint': 'Schlafziel für heute Nacht laut deinem Profil.',
  'sleepSW.consistency': 'Regelmäßigkeit',
  'sleepSW.consistencyLine': '{pct}/100 · Hauptschlaf-Rhythmus',
  'sleepSW.deficit': 'Schlafdefizit',
  'sleepSW.deficitAhead': '{h} h im Vorsprung',
  'sleepSW.deficitBehind': '{h} h im Rückstand',
  'sleepSW.deficitSubError': 'Woche vs. Ziel (7 Tage).',
  'sleepSW.deficitSubAhead': 'Über dem wöchentlichen Schlafziel.',
  'sleepSW.deficitSubBehind': 'Hinter dem wöchentlichen Schlafziel.',
  'sleepSW.consistencySub': 'Regelmäßigkeit der Schlafenszeit aus Hauptschlaf (letzte 7 Tage).',
  'sleepSW.consistencyNeedData': 'Erfasse mindestens zwei Hauptschlaf-Sitzungen für die Bewertung.',
  'sleepSW.stage.deep': 'Tiefschlaf',
  'sleepSW.stage.rem': 'REM',
  'sleepSW.stage.light': 'Leichtschlaf',
  'sleepSW.stage.awake': 'Wach',
  'sleepSW.stageDesc.deep': 'Erholsamer Schlaf für körperliche Regeneration',
  'sleepSW.stageDesc.rem': 'Traumschlaf für Gedächtnis und Lernen',
  'sleepSW.stageDesc.light': 'Übergangsschlaf zwischen Phasen',
  'sleepSW.stageDesc.awake': 'Kurze Wachphasen im Schlaf',
  'sleepSW.debtNoData':
    'Noch keine Daten zur Schlafschuld. Erfasse einige Tage Hauptschlaf, um diese Ansicht freizuschalten.',
  'sleepSW.debtWeeklyTitle': 'Wöchentliche Schlafschuld',
  'sleepSW.debtWeeklySub': 'Basierend auf deinen letzten 7 Schicht-Tagen und idealem Nachtziel.',
  'sleepSW.behindAhead': 'Rückstand / Vorsprung',
  'sleepSW.debtBanked': 'Schlaf gut im Plus',
  'sleepSW.debtBankedMsg':
    'Du liegst diese Woche leicht über dem Schlafziel. Schütze diesen Puffer bei intensiven Schichtphasen.',
  'sleepSW.debtMild': 'Leichte Schlafschuld',
  'sleepSW.debtMildMsg':
    'Du bist nur wenig im Rückstand. Ein oder zwei frühere Nächte oder ein Erholungsnickerchen holen dich ein.',
  'sleepSW.debtModerate': 'Mittlere Schlafschuld',
  'sleepSW.debtModerateMsg':
    'Plane zusätzliche Schlafblöcke an freien Tagen und vermeide nach Möglichkeit noch mehr Nachtschichten hintereinander.',
  'sleepSW.debtHigh': 'Hohe Schlafschuld',
  'sleepSW.debtHighMsg':
    'Du liegst deutlich hinter der Erholung. Behandle diese Woche als hohes Risiko für Müdigkeit und Fehler.',
  'sleepSW.timelineTitle': '24-Stunden-Schlaf-Zeitleiste',
  'sleepSW.last30Title': 'Letzte 30 Tage',
  'sleepSW.last30Sub':
    'Wähle einen Tag, um zu sehen, ob dein Schlaf für diese Schicht ausreichte – basierend auf deinem Profil.',
  'sleepSW.editLogs': 'Schlaf erfassen',
  'sleepSW.totalSleepShiftedDay': 'Gesamtschlaf an diesem Schicht-Tag',
  'sleepSW.historyEmpty':
    'Noch kein Schlafverlauf in den letzten 30 Tagen. Erfasse Schlaf, um Hinweise zu erhalten.',
  'sleepSW.stagesTitle': 'Schlafphasen',
  'sleepSW.stagesSub': 'Aus Wearable-Daten oder geschätzt aus deinem letzten Schlaf.',
  'sleepSW.rating.noneLabel': 'Kein Schlaf erfasst',
  'sleepSW.rating.noneMsg': 'Erfasse Hauptschlaf und Nickerchen für Hinweise.',
  'sleepSW.rating.greatLabel': 'Sehr gut',
  'sleepSW.rating.greatMsg':
    'Du hast deine ideale Schlafdosis für dein Profil erreicht oder leicht überschritten. Halte dieses Muster, wenn es geht.',
  'sleepSW.rating.okLabel': 'Okay, geht besser',
  'sleepSW.rating.okMsg':
    'Du bist nah am Ideal – weitere 30–60 Minuten würden der Erholung stark helfen.',
  'sleepSW.rating.warnLabel': 'Gerät ins Hintertreffen',
  'sleepSW.rating.warnMsg':
    'Zu wenig Schlaf für deine Bedürfnisse. Plane Erholungsschlaf oder Nickerchen in deinem nächsten freien Fenster.',
  'sleepSW.rating.badLabel': 'Läufst auf Reserve',
  'sleepSW.rating.badMsg':
    'Sehr kurzer Schlaf für dein Profil. Sieh heute als hohes Risiko für Müdigkeit, Heißhunger und Fehler.',
  'sleepSW.weekMetricsError': 'Wöchentliche Metriken konnten nicht geladen werden.',
  'sleepSW.noWearable': 'Noch kein Wearable verbunden. In Wearables einrichten.',
  'sleepSW.syncFailed': 'Wearable-Sync fehlgeschlagen',
  'sleepSW.deleteSessionFailed': 'Sitzung konnte nicht gelöscht werden',
  'sleepSW.loggedSessionsTitle': 'Deine Schlafeinträge',

  'sleepCard.last7': 'Letzte 7 Tage',
  'sleepCard.chartSub': 'Letzte 7 Ortszeit-Tage bis heute · Ziel {target} h',
  'sleepCard.selectedDay': 'Ausgewählter Tag:',
  'sleepCard.pctOfTarget': '({pct} % des Ziels)',
  'sleepCard.sourceNoneLogged': 'Noch kein Schlaf erfasst',
  'sleepCard.sourceNoData': 'Keine Quelldaten',
  'sleepCard.sourceManual': 'Manuelle Daten',
  'sleepCard.sourceWearable': 'Wearable-Daten',
  'sleepCard.sourceMixed': 'Gemischte Daten',
  'sleepCard.syncManualOnly': 'Nur manuell',
  'sleepCard.syncAwaiting': 'Warte auf ersten Sync',
  'sleepCard.hcSleepPermissionHint': 'Schlafberechtigung ist in Health Connect nicht aktiviert.',
  'sleepCard.hcNoSleepRecordsHint': 'Noch keine Health-Connect-Schlafdaten gefunden.',
  'sleepCard.syncJustNow': 'Zuletzt gerade eben synchronisiert',
  'sleepCard.syncMinAgo': 'Zuletzt vor {m} Min. synchronisiert',
  'sleepCard.syncHoursAgo': 'Zuletzt vor {h} Std. synchronisiert',
  'sleepCard.syncDaysAgo': 'Zuletzt vor {d} Tagen synchronisiert',
  'sleepCard.warnStale':
    'Wearable-Sync verzögert. Jetzt synchronisieren, damit die heutigen Summen stimmen.',
  'sleepCard.btnSyncing': 'Synchronisiert…',
  'sleepCard.btnSyncNow': 'Jetzt synchronisieren',
  'sleepCard.btnLogSleep': 'Schlaf erfassen',
  'sleepCard.btnAddSleep': 'Schlaf hinzufügen',
  'sleepCard.btnEditLogs': 'Schlaf erfassen',
  'sleepCard.btnLogManually': 'Manuell erfassen',
  'sleepCard.btnEditToday': 'Schlaf bearbeiten',
  'sleepCard.hl.logPostShift': 'Schlaf nach der Schicht erfassen',
  'sleepCard.hl.postRecovery': 'Erholung nach der Schicht nötig',
  'sleepCard.hl.recoveryBelow': 'Erholungstag – unter dem Ziel',
  'sleepCard.hl.logYourSleep': 'Schlaf erfassen',
  'sleepCard.hl.belowTarget': 'Heute unter dem Ziel',
  'sleepCard.hl.progressing': 'Auf dem Weg zum Ziel',
  'sleepCard.hl.onTrack': 'Heute im Plan',
  'sleepCard.hl.recoveryCovered': 'Erholungsbedarf gedeckt',
  'sleepCard.hl.overview': 'Schlafüberblick',
  'sleepCard.sub.noSleep':
    'Für diesen Tag ist noch kein Schlaf erfasst. Erfasse Hauptschlaf oder Nickerchen für ein genaues Körperuhr-Signal.',
  'sleepCard.sub.nightLogged':
    'Schlaf nach der Schicht erfasst. Du hast {primary} Hauptschlaf und {naps} Nickerchen protokolliert.',
  'sleepCard.sub.debt':
    'Du hast {primary} Hauptschlaf und {naps} Nickerchen erfasst. Erholungsschlaf wird empfohlen, um die Schuld zu senken.',
  'sleepCard.sub.onlyNaps':
    'Bisher nur Nickerchen. Heute hast du {naps} Nickerchen erfasst.',
  'sleepCard.sub.postShiftDom':
    'Heute trägt Schlaf nach der Schicht am meisten bei. Erfasst: {primary} Hauptschlaf, {naps} Nickerchen.',
  'sleepCard.sub.recoveryDom':
    'Heute dominiert Erholungsschlaf. Erfasst: {primary} Hauptschlaf, {naps} Nickerchen.',
  'sleepCard.sub.mainDom':
    'Hauptschlaf erfasst. Heute: {primary} Hauptschlaf, {naps} Nickerchen.',
  'sleepCard.sub.default': 'Heute erfasst: {primary} Hauptschlaf, {naps} Nickerchen.',
  'sleepCard.primarySleep': 'Hauptschlaf',
  'sleepCard.naps': 'Nickerchen',
  'sleepCard.primaryType': 'Haupttyp',
  'sleepCard.lastSync': 'Letzter Sync',
  'sleepCard.recoveryNeed': 'Erholungsbedarf',
  'sleepCard.recoveryLoading': 'Wird geladen',
  'sleepCard.recoveryNeeded': '{time} Erholung nötig',
  'sleepCard.recoveryCoveredLabel': 'Erholung gedeckt',
  'sleepCard.timingLabel': 'Timing zur Schicht:',
  'sleepCard.timingNone': 'Zu wenig Daten',
  'sleepCard.timingGood': 'Gut für diese Schicht',
  'sleepCard.timingOk': 'Akzeptabel für diese Schicht',
  'sleepCard.timingPoor': 'Passt schlecht zur Schicht',
  'sleepCard.typeNone': 'Keine',
  'sleepCard.ariaChart': 'Schlafstunden der letzten sieben Ortszeit-Tage. {summary}',
  'sleepCard.ariaChartTarget': 'Die grüne gestrichelte Linie zeigt das Ziel {hours}.',
  'sleepCard.barTotalTitle': '{date}: {h} h Schlaf gesamt',
  'sleepCard.dayTotalCaption': 'Gesamtschlafzeit',
  'sleepCard.dayTotalHrsShort': 'Std.',
  'sleepCard.dayTotalMinsShort': 'Min.',

  'sleepType.main_sleep': 'Hauptschlaf',
  'sleepType.post_shift_sleep': 'Schlaf nach der Schicht',
  'sleepType.recovery_sleep': 'Erholungsschlaf',
  'sleepType.nap': 'Nickerchen',
  'sleepType.default': 'Schlaf',

  'sleepMetricsInfo.title': 'Schlafmetriken erklärt',
  'sleepMetricsInfo.subtitle': 'Was deine Schlafdaten bedeuten',
  'sleepMetricsInfo.suggestionsEmpty': 'Derzeit keine Vorschläge verfügbar.',
  'sleepMetricsInfo.suggestionsLoadError':
    'Personalisierte Vorschläge konnten nicht geladen werden. Bitte später erneut versuchen.',
  'sleepMetricsInfo.sectionTargetIntro':
    'So wird deine empfohlene Schlafdauer für heute Nacht berechnet:',
  'sleepMetricsInfo.sectionTargetBullet1':
    'Dein aktueller Schlafdefizit-Überblick (Rückstand oder Vorsprung zur Wochenzielschlafzeit)',
  'sleepMetricsInfo.sectionTargetBullet2': 'Deine nächste Schichtart (Nacht, Tag oder frei)',
  'sleepMetricsInfo.sectionTargetBullet3':
    'Dein Grundschlafbedarf (typisch 7,5 Stunden für viele Schichtarbeitende)',
  'sleepMetricsInfo.sectionTargetFoot':
    'Das Ziel passt sich an, damit du Schlafschuld abbauen oder deinen Rhythmus halten kannst – abgestimmt auf deinen Schichtplan.',
  'sleepMetricsInfo.consistencyIntro':
    'Diese Punktzahl (0–100) misst, wie regelmäßig deine Schlafenszeit in den letzten 7 Tagen war:',
  'sleepMetricsInfo.consistencyB1':
    '{range} Sehr regelmäßige Schlafenszeiten (ideal für Schichtarbeit)',
  'sleepMetricsInfo.consistencyB2':
    '{range} Mittelmäßig regelmäßig (Schichtwechsel erklären oft Abweichungen)',
  'sleepMetricsInfo.consistencyB3':
    '{range} Große Schwankungen der Schlafenszeit (kann die Erholung beeinträchtigen)',
  'sleepMetricsInfo.consistencyFoot':
    'Berechnet aus der Streuung deiner Hauptschlaf-Zubettgehzeiten. Weniger Streuung = höhere Punktzahl.',
  'sleepMetricsInfo.consistencyShiftNote':
    'Bei Schichtarbeit ist etwas Variation normal. Ziel ist es, innerhalb jeder Schichtart möglichst konstant zu bleiben.',
  'sleepMetricsInfo.deficitIntro':
    'Zeigt, wie weit du hinter oder vor deinem wöchentlichen Schlafziel liegst:',
  'sleepMetricsInfo.deficitB1': '{label} Du liegst hinter dem Wochenziel (du brauchst mehr Schlaf)',
  'sleepMetricsInfo.deficitB2': '{label} Du liegst über dem Wochenziel (Schlafüberschuss)',
  'sleepMetricsInfo.deficitB3':
    'Berechnet aus den letzten 7 Tagen im Vergleich zum Wochenziel (typisch 52,5 Std. bei 7,5 h × 7 Tage)',
  'sleepMetricsInfo.deficitFoot':
    'Kategorien: Überschuss/Niedrig (im Plan), Mittel (Aufmerksamkeit), Hoch (Erholung priorisieren).',
  'sleepMetricsInfo.personalizedTitle': 'Personalisierte Vorschläge',
  'sleepMetricsInfo.generating': 'Vorschläge werden erstellt…',
  'sleepMetricsInfo.suggestionsUnavailable': 'Vorschläge können derzeit nicht geladen werden.',
  'sleepMetricsInfo.gotIt': 'Verstanden',
  'sleepMetricsInfo.range80100': '80–100:',
  'sleepMetricsInfo.range6079': '60–79:',
  'sleepMetricsInfo.rangeBelow60': 'Unter 60:',
  'sleepMetricsInfo.positiveLabel': 'Positive Zahl:',
  'sleepMetricsInfo.negativeLabel': 'Negative Zahl:',
  'sleepMetricsInfo.notePrefix': 'Hinweis:',

  'sleepQualityChart.kicker': 'SCHLAFQUALITÄT',
  'sleepQualityChart.title': 'Schlafqualität',
  'sleepQualityChart.infoAria': 'Informationen zur Schlafqualität',
  'sleepQualityChart.errLoad': 'Schlafqualitätsdaten konnten nicht geladen werden',
  'sleepQualityChart.emptyTitle': 'Keine Schlafdaten',
  'sleepQualityChart.emptyBody': 'Erfasse Schlaf, um deine Qualitätswerte zu sehen',
  'sleepQualityChart.labelDuration': 'Schlafdauer',
  'sleepQualityChart.labelTimeAsleep': 'Tatsächliche Schlafzeit',
  'sleepQualityChart.labelEfficiency': 'Schlafeffizienz',
  'sleepQualityChart.modalSubtitle': 'Deine Schlafmetriken verstehen',
  'sleepQualityChart.closeAria': 'Schließen',
  'sleepQualityChart.whatIsTitle': 'Was ist Schlafqualität?',
  'sleepQualityChart.whatIsBody':
    'Deine Schlafqualitätsbewertung (0–100) spiegelt wider, wie gut du geschlafen hast – aus Bewertung, Effizienz und tatsächlicher Schlafzeit.',
  'sleepQualityChart.explainDuration':
    'Die gesamte Zeit im Bett von Einschlafen bis Aufwachen.',
  'sleepQualityChart.explainTimeAsleep':
    'Die Zeit, in der du wirklich geschlafen hast, ohne nächtliche Wachphasen.',
  'sleepQualityChart.explainEfficiency':
    'Der Anteil der Bettzeit, in dem du geschlafen hast. Höher ist besser – strebe etwa 85 % oder mehr an.',
  'sleepQualityChart.improveTitle': 'So kannst du verbessern',
  'sleepQualityChart.improve1': 'Halte den Schlafrhythmus möglichst fest, auch an freien Tagen',
  'sleepQualityChart.improve2': 'Dunkle, ruhige und kühlere Umgebung schaffen',
  'sleepQualityChart.improve3': '1–2 Stunden vor dem Schlafengehen Bildschirme und grelles Licht meiden',
  'sleepQualityChart.improve4': 'Koffein und schwere Mahlzeiten kurz vor dem Schlaf reduzieren',
  'sleepQualityChart.improve5': 'Verdunkelung und Schlafmaske für Tagschlaf nutzen',

  'sleepLogList.kicker': 'SCHLAFTAGEBUCH',
  'sleepLogList.title': 'Letzte Schlafphasen',
  'sleepLogList.viewLogs': 'Einträge anzeigen',
  'sleepLogList.emptyTitle': 'Noch kein Schlaf erfasst',
  'sleepLogList.viewAll': 'Alle Schlafeinträge',

  'socialJetlagInfo.title': 'Sozialer Jetlag erklärt',
  'socialJetlagInfo.subtitle': 'Deine Verschiebung im Schlafzeitmuster',
  'socialJetlagInfo.s1Title': 'Was ist sozialer Jetlag?',
  'socialJetlagInfo.s1p1':
    'Sozialer Jetlag misst, wie stark sich dein aktuelles Schlafzeitmuster vom gewohnten unterscheidet. Für Schichtarbeit ist das besonders wichtig, weil sich der Plan zwischen Tag- und Nachtschicht natürlich ändert.',
  'socialJetlagInfo.s1p2':
    'Anders als Jetlag nach Reisen entsteht sozialer Jetlag, wenn der innere Rhythmus durch Schichtwechsel, unregelmäßige Zeiten oder Lebensstil aus dem Takt gerät.',
  'socialJetlagInfo.s2Title': 'So wird es berechnet',
  'socialJetlagInfo.s2Intro': 'ShiftCoach berechnet sozialen Jetlag aus deinen Schlafdaten:',
  'socialJetlagInfo.s2b1':
    'Schlaf wird in „ShiftCoach-Tagen“ gruppiert (07:00 → 07:00, nicht Mitternacht zu Mitternacht)',
  'socialJetlagInfo.s2b2':
    'Pro Tag: Schlafmittelpunkt (Mitte zwischen erstem Schlafbeginn und letztem Schlafende)',
  'socialJetlagInfo.s2b3':
    'Referenz aus dem Median der Mittelpunkte deiner vorherigen 7–10 stabilen Tage',
  'socialJetlagInfo.s2b4':
    'Vergleich des heutigen Mittelpunkts mit der Referenz → Versatz in Stunden',
  'socialJetlagInfo.dataBoxTitle': 'Deine aktuellen Daten',
  'socialJetlagInfo.baselineMid': 'Referenz-Mittelpunkt: {time}',
  'socialJetlagInfo.currentMid': 'Aktueller Mittelpunkt: {time}',
  'socialJetlagInfo.misalignmentHours': 'Versatz: {h} Stunden',
  'socialJetlagInfo.s3Title': 'Bewertungsstufen',
  'socialJetlagInfo.catLowTitle': 'Niedrig (0–1,5 h):',
  'socialJetlagInfo.catLowBody':
    'Dein Schlafzeitmuster liegt nah am Gewohnten – gut für die innere Uhr.',
  'socialJetlagInfo.catModTitle': 'Mittel (1,5–3,5 h):',
  'socialJetlagInfo.catModBody':
    'Der Mittelpunkt hat sich spürbar verschoben, oft nach Schichtwechseln. Ggf. Anpassung nötig.',
  'socialJetlagInfo.catHighTitle': 'Hoch (>3,5 h):',
  'socialJetlagInfo.catHighBody':
    'Die innere Uhr weicht stark ab – häufig nach Wechsel zwischen Tag- und Nachtschicht.',
  'socialJetlagInfo.s3Foot':
    'Bei Schichtarbeit ist etwas Schwankung normal. Ziel sind weniger extreme Sprünge und sanftere Anpassung.',

  'sleepTimeline.noSleepYet': 'Für diesen Schicht-Tag ist noch kein Schlaf erfasst.',
  'sleepTimeline.shifted24h': '24-Stunden-Timeline (Schicht-Tag)',
  'sleepTimeline.shiftPrefix': 'Schicht:',
  'sleepTimeline.todayLegend': 'Heute:',
  'sleepTimeline.sumNightPostFrag':
    'Längster Schlaf nach der Schicht; Schlaf auf mehrere Blöcke verteilt.',
  'sleepTimeline.sumNightPost': 'Längster Schlaf nach der Schicht.',
  'sleepTimeline.sumNightOffFrag':
    'Längster Schlaf außerhalb des typischen Fensters nach der Schicht; mehrere Blöcke.',
  'sleepTimeline.sumNightOff': 'Längster Schlaf außerhalb des typischen Fensters nach der Schicht.',
  'sleepTimeline.sumDefaultFrag':
    'Schlaf auf mehrere Blöcke verteilt; der längste Block ist hervorgehoben.',
  'sleepTimeline.sumDefault': 'Längster Schlafblock ist zur schnellen Übersicht hervorgehoben.',
  'sleepTimeline.sumMulti': 'Schlaf auf mehrere Blöcke verteilt.',
  'sleepTimeline.sumSingle': 'Ein Schlafblock in diesem Schicht-Tag erfasst.',
  'sleepTimeline.sessionTooltip': '{type} · {start}–{end} ({h} Std.)',

  'shiftLag.kicker': 'ShiftLag',
  'shiftLag.title': 'Jetlag durch deine Schichten',
  'shiftLag.refreshAria': 'ShiftLag aktualisieren',
  'shiftLag.errNoData': 'ShiftLag-Daten nicht verfügbar',
  'shiftLag.errLoad': 'ShiftLag-Daten konnten nicht geladen werden',
  'shiftLag.errBannerTitle': 'ShiftLag',
  'shiftLag.noData': 'Keine Daten',
  'shiftLag.contributingFactors': 'Mitwirkende Faktoren',
  'shiftLag.recommendations': 'Empfehlungen',
  'shiftLag.scoreBreakdown': 'Punkteaufteilung',
  'shiftLag.labelSleepDebt': 'Schlafschuld',
  'shiftLag.labelMisalignment': 'Zirkadiane Fehlausrichtung',
  'shiftLag.labelInstability': 'Plan-Instabilität',
  'shiftLag.emDash': '—',

  'quickSleep.notSignedIn': 'Nicht angemeldet',
  'quickSleep.saved': 'Gespeichert',
  'quickSleep.dateLabel': 'Datum',
  'quickSleep.typeLabel': 'Art',
  'quickSleep.startLabel': 'Beginn',
  'quickSleep.endLabel': 'Ende',
  'quickSleep.qualityLabel': 'Qualität: {q}/5',
  'quickSleep.presetLastNight': 'Letzte Nacht',
  'quickSleep.presetPostNight': 'Nach Nachtschicht',
  'quickSleep.presetNap20': 'Nickerchen 20 Min.',

  'sleepLogCard.kicker': 'SCHLAFTAGEBUCH',
  'sleepLogCard.edit': 'Bearbeiten',
  'sleepLogCard.last7': 'Letzte 7 Tage',
  'sleepLogCard.lastNightSub': 'Schlaf / Nickerchen letzte Nacht',
  'sleepLogCard.stagesTitle': 'Schlafphasen',
  'sleepLogCard.noStageData': 'Keine Schlafdaten',
  'sleepLogCard.shiftCoach': 'Shift Coach',
  'sleepLogCard.coachGoodLead': 'Gut gemacht!',
  'sleepLogCard.coachGoodRest':
    'Du hast letzte Nacht {h} Stunden geschlafen. Halte diesen Rhythmus möglichst bei – das unterstützt innere Uhr und Erholung.',
  'sleepLogCard.coachMid':
    'Du hast letzte Nacht {h} Stunden geschlafen – unter der Empfehlung von 7–9 Stunden. Versuche heute früher ins Bett oder eine kurze Ruhepause. Regelmäßigkeit ist bei Schichtarbeit wichtig.',
  'sleepLogCard.coachLowLead': 'Schlafwarnung:',
  'sleepLogCard.coachLowRest':
    'Nur {h} Stunden letzte Nacht – deutlich unter der Empfehlung. Priorisiere früheres Zubettgehen und ggf. 20–30 Minuten Nickerchen bei Müdigkeit. Der Körper braucht ausreichend Ruhe.',
  'sleepLogCard.durationM': '{m} Min.',

  'sleepFab.ariaAdd': 'Schlaf hinzufügen',

  'sleepSessionList.loading': 'Schlafsitzungen werden geladen…',
  'sleepSessionList.empty': 'Für diesen Tag keine Schlafsitzungen erfasst.',
  'sleepSessionList.quality': 'Qualität: {q}',

  'sleepShiftLog.timeline': 'Zeitverlauf',
  'sleepShiftLog.hoursUnit': 'Stunden',
  'sleepShiftLog.oneSession': '1 Eintrag',
  'sleepShiftLog.nSessions': '{n} Einträge',
  'sleepShiftLog.todaySleep': 'Schlaf heute ({start} – {end})',
  'sleepShiftLog.daySleep': '{date} ({start} – {end})',
  'sleepShiftLog.windowFallback': 'Schlaf heute (07:00 → 07:00)',
  'sleepShiftLog.noSleepYet': 'Noch kein Schlaf erfasst',

  'sleepQuality.excellent': 'Ausgezeichnet',
  'sleepQuality.good': 'Gut',
  'sleepQuality.fair': 'Mäßig',
  'sleepQuality.poor': 'Schlecht',
  'sleepQuality.veryPoor': 'Sehr schlecht',
  'sleep7.editAria': 'Bearbeiten',
  'sleep7.deleteAria': 'Löschen',
  'sleepForm.typeMain': 'Hauptschlaf',
  'sleepForm.typeNap': 'Nickerchen',
  'sleepForm.cancel': 'Abbrechen',
  'sleepForm.save': 'Speichern',

  'sleepClassify.reasoning.day_sleep':
    'Tagschlaf (4–8 Std.), typisch nach einer Nachtschicht.',
  'sleepClassify.reasoning.post_shift_recovery': 'Erholungsschlaf nach einer Nachtschicht.',
  'sleepClassify.reasoning.pre_shift_nap': 'Nickerchen vor der Schicht für mehr Wachheit.',
  'sleepClassify.reasoning.micro_nap': 'Kurzer Schlaf für schnelle Energie.',
  'sleepClassify.reasoning.main_sleep': 'Hauptschlaf zu typischen Nachtstunden.',
  'sleepClassify.reasoning.split_sleep': 'Mögliches geteiltes Schlafmuster.',
  'sleepClassify.reasoning.irregular_sleep': 'Zeitmuster entspricht keinen gängigen Mustern.',
}

export const sleepUiWorldFr: Record<string, string> = {
  'sleepJetlag.category.low': 'Faible',
  'sleepJetlag.category.moderate': 'Modéré',
  'sleepJetlag.category.high': 'Élevé',

  'sleepLog.title': 'Enregistrer le sommeil',
  'sleepLog.logNap': 'Enregistrer une sieste',

  'sleepLogs.shiftOff': 'OFF',
  'sleepLogs.duration0': '0 h',
  'sleepLogs.durationH': '{h} h',
  'sleepLogs.durationHM': '{h} h {m} min',
  'sleepCard.durationHM': '{h} h {m} min',

  'sleepSW.pageTitle': 'Sommeil',
  'sleepSW.backHome': "Retour à l'accueil",
  'sleepSW.loading': 'Chargement des données de sommeil…',
  'sleepSW.metricsTitle': 'Indicateurs de sommeil',
  'sleepSW.metricsHeading': 'Objectif de cette nuit et aperçu hebdomadaire',
  'sleepSW.tonightTarget': 'Objectif de cette nuit',
  'sleepSW.tonightHint': 'Objectif de sommeil pour cette nuit selon votre profil.',
  'sleepSW.consistency': 'Régularité',
  'sleepSW.consistencyLine': '{pct}/100 · rythme de sommeil principal',
  'sleepSW.deficit': 'Déficit de sommeil',
  'sleepSW.deficitAhead': '{h} h d’avance',
  'sleepSW.deficitBehind': '{h} h de retard',
  'sleepSW.deficitSubError': 'Semaine vs objectif (7 jours).',
  'sleepSW.deficitSubAhead': 'Au-dessus de l’objectif hebdomadaire de sommeil.',
  'sleepSW.deficitSubBehind': 'En dessous de l’objectif hebdomadaire de sommeil.',
  'sleepSW.consistencySub':
    'Régularité des couchers sur le sommeil principal (7 derniers jours).',
  'sleepSW.consistencyNeedData':
    'Enregistrez au moins deux sessions de sommeil principal pour obtenir un score.',
  'sleepSW.stage.deep': 'Profond',
  'sleepSW.stage.rem': 'REM',
  'sleepSW.stage.light': 'Léger',
  'sleepSW.stage.awake': 'Éveil',
  'sleepSW.stageDesc.deep': 'Sommeil réparateur pour la récupération physique',
  'sleepSW.stageDesc.rem': 'Sommeil paradoxal pour la mémoire et l’apprentissage',
  'sleepSW.stageDesc.light': 'Sommeil de transition entre les phases',
  'sleepSW.stageDesc.awake': 'Courtes périodes d’éveil pendant le sommeil',
  'sleepSW.debtNoData':
    'Pas encore de données sur la dette de sommeil. Enregistrez quelques jours de sommeil principal pour débloquer cette vue.',
  'sleepSW.debtWeeklyTitle': 'Dette de sommeil hebdomadaire',
  'sleepSW.debtWeeklySub':
    'Basé sur vos 7 derniers jours décalés et votre objectif de nuit idéal.',
  'sleepSW.behindAhead': 'Retard / avance',
  'sleepSW.debtBanked': 'Sommeil en avance',
  'sleepSW.debtBankedMsg':
    'Vous êtes légèrement au-dessus de votre sommeil cette semaine. Protégez cette marge sur les périodes de gardes intenses.',
  'sleepSW.debtMild': 'Dette de sommeil légère',
  'sleepSW.debtMildMsg':
    'Vous n’êtes qu’un peu en retard. Une ou deux nuits plus tôt ou une sieste de récupération suffiront.',
  'sleepSW.debtModerate': 'Dette de sommeil modérée',
  'sleepSW.debtModerateMsg':
    'Prévoyez des blocs de sommeil en plus les jours de repos et évitez d’enchaîner les nuits si possible.',
  'sleepSW.debtHigh': 'Dette de sommeil élevée',
  'sleepSW.debtHighMsg':
    'Vous êtes très en retard sur la récupération. Traitez cette semaine comme à haut risque de fatigue et d’erreurs.',
  'sleepSW.timelineTitle': 'Chronologie du sommeil sur 24 h',
  'sleepSW.last30Title': '30 derniers jours',
  'sleepSW.last30Sub':
    'Choisissez un jour pour voir si votre sommeil suffisait pour cette garde, selon votre profil.',
  'sleepSW.editLogs': 'Enregistrer le sommeil',
  'sleepSW.totalSleepShiftedDay': 'Sommeil total ce jour décalé',
  'sleepSW.historyEmpty':
    'Pas encore d’historique sur les 30 derniers jours. Commencez à enregistrer pour obtenir des conseils.',
  'sleepSW.stagesTitle': 'Phases du sommeil',
  'sleepSW.stagesSub': 'Données wearable ou estimation à partir de votre dernier sommeil.',
  'sleepSW.rating.noneLabel': 'Aucun sommeil enregistré',
  'sleepSW.rating.noneMsg': 'Enregistrez votre sommeil principal et vos siestes pour des conseils.',
  'sleepSW.rating.greatLabel': 'Très bien',
  'sleepSW.rating.greatMsg':
    'Vous avez atteint ou légèrement dépassé votre dose idéale pour votre profil. Gardez ce rythme quand vous le pouvez.',
  'sleepSW.rating.okLabel': 'Correct, peut mieux faire',
  'sleepSW.rating.okMsg':
    'Vous êtes proche de l’idéal — 30 à 60 minutes de plus aideraient vraiment la récupération.',
  'sleepSW.rating.warnLabel': 'En retard',
  'sleepSW.rating.warnMsg':
    'Sommeil insuffisant pour vos besoins. Prévoyez un bloc de récupération ou une sieste à votre prochain créneau libre.',
  'sleepSW.rating.badLabel': 'Sur la réserve',
  'sleepSW.rating.badMsg':
    'Sommeil très court pour votre profil. Considérez aujourd’hui comme à haut risque de fatigue, fringales et erreurs.',
  'sleepSW.weekMetricsError': 'Impossible de charger les indicateurs hebdomadaires.',
  'sleepSW.noWearable': 'Aucun wearable connecté. Configurez-le dans Wearables.',
  'sleepSW.syncFailed': 'Échec de la synchronisation',
  'sleepSW.deleteSessionFailed': 'Suppression de la session impossible',
  'sleepSW.loggedSessionsTitle': 'Vos sessions de sommeil',

  'sleepCard.last7': '7 derniers jours',
  'sleepCard.chartSub': '7 derniers jours locaux jusqu’à aujourd’hui · objectif {target} h',
  'sleepCard.selectedDay': 'Jour sélectionné :',
  'sleepCard.pctOfTarget': '({pct} % de l’objectif)',
  'sleepCard.sourceNoneLogged': 'Pas encore de sommeil enregistré',
  'sleepCard.sourceNoData': 'Aucune donnée source',
  'sleepCard.sourceManual': 'Données manuelles',
  'sleepCard.sourceWearable': 'Données wearable',
  'sleepCard.sourceMixed': 'Données mixtes',
  'sleepCard.syncManualOnly': 'Manuel uniquement',
  'sleepCard.syncAwaiting': 'En attente de la première synchro',
  'sleepCard.hcSleepPermissionHint': 'L’autorisation Sommeil n’est pas activée dans Health Connect.',
  'sleepCard.hcNoSleepRecordsHint': 'Aucune session de sommeil Health Connect pour l’instant.',
  'sleepCard.syncJustNow': 'Dernière synchro à l’instant',
  'sleepCard.syncMinAgo': 'Dernière synchro il y a {m} min',
  'sleepCard.syncHoursAgo': 'Dernière synchro il y a {h} h',
  'sleepCard.syncDaysAgo': 'Dernière synchro il y a {d} j',
  'sleepCard.warnStale':
    'Synchro wearable retardée. Synchronisez maintenant pour des totaux du jour fiables.',
  'sleepCard.btnSyncing': 'Synchronisation…',
  'sleepCard.btnSyncNow': 'Synchroniser',
  'sleepCard.btnLogSleep': 'Enregistrer le sommeil',
  'sleepCard.btnAddSleep': 'Ajouter du sommeil',
  'sleepCard.btnEditLogs': 'Enregistrer le sommeil',
  'sleepCard.btnLogManually': 'Saisie manuelle',
  'sleepCard.btnEditToday': 'Modifier le sommeil',
  'sleepCard.hl.logPostShift': 'Enregistrer le sommeil après la garde',
  'sleepCard.hl.postRecovery': 'Récupération après la garde nécessaire',
  'sleepCard.hl.recoveryBelow': 'Jour de récupération — sous l’objectif',
  'sleepCard.hl.logYourSleep': 'Enregistrez votre sommeil',
  'sleepCard.hl.belowTarget': 'Sous l’objectif aujourd’hui',
  'sleepCard.hl.progressing': 'Progression vers l’objectif',
  'sleepCard.hl.onTrack': 'Dans les temps aujourd’hui',
  'sleepCard.hl.recoveryCovered': 'Besoins de récupération couverts',
  'sleepCard.hl.overview': 'Aperçu du sommeil',
  'sleepCard.sub.noSleep':
    'Aucun sommeil enregistré pour ce jour. Enregistrez le sommeil principal ou des siestes pour un rythme circadien fiable.',
  'sleepCard.sub.nightLogged':
    'Sommeil après garde enregistré. Vous avez noté {primary} de sommeil principal et {naps} de siestes.',
  'sleepCard.sub.debt':
    'Vous avez enregistré {primary} de sommeil principal et {naps} de siestes. Un sommeil de récupération est recommandé pour réduire la dette.',
  'sleepCard.sub.onlyNaps':
    'Seulement des siestes pour l’instant. Vous avez enregistré {naps} de siestes aujourd’hui.',
  'sleepCard.sub.postShiftDom':
    'Le sommeil après garde domine aujourd’hui. Enregistré : {primary} principal, {naps} siestes.',
  'sleepCard.sub.recoveryDom':
    'Le sommeil de récupération domine aujourd’hui. Enregistré : {primary} principal, {naps} siestes.',
  'sleepCard.sub.mainDom':
    'Sommeil principal enregistré. Aujourd’hui : {primary} principal, {naps} siestes.',
  'sleepCard.sub.default': 'Aujourd’hui : {primary} de sommeil principal et {naps} de siestes.',
  'sleepCard.primarySleep': 'Sommeil principal',
  'sleepCard.naps': 'Siestes',
  'sleepCard.primaryType': 'Type principal',
  'sleepCard.lastSync': 'Dernière synchro',
  'sleepCard.recoveryNeed': 'Besoin de récupération',
  'sleepCard.recoveryLoading': 'Chargement',
  'sleepCard.recoveryNeeded': '{time} de récupération nécessaires',
  'sleepCard.recoveryCoveredLabel': 'Récupération couverte',
  'sleepCard.timingLabel': 'Alignement horaire :',
  'sleepCard.timingNone': 'Pas assez de données',
  'sleepCard.timingGood': 'Bon pour cette garde',
  'sleepCard.timingOk': 'Acceptable pour cette garde',
  'sleepCard.timingPoor': 'Décalé pour cette garde',
  'sleepCard.typeNone': 'Aucun',
  'sleepCard.ariaChart': 'Heures de sommeil sur sept jours locaux. {summary}',
  'sleepCard.ariaChartTarget': 'La ligne pointillée verte indique l’objectif {hours}.',
  'sleepCard.barTotalTitle': '{date} : {h} h de sommeil au total',
  'sleepCard.dayTotalCaption': 'Temps de sommeil total',
  'sleepCard.dayTotalHrsShort': 'h',
  'sleepCard.dayTotalMinsShort': 'min',

  'sleepType.main_sleep': 'Sommeil principal',
  'sleepType.post_shift_sleep': 'Sommeil après la garde',
  'sleepType.recovery_sleep': 'Sommeil de récupération',
  'sleepType.nap': 'Sieste',
  'sleepType.default': 'Sommeil',

  'sleepMetricsInfo.title': 'Indicateurs de sommeil expliqués',
  'sleepMetricsInfo.subtitle': 'Comprendre vos données de sommeil',
  'sleepMetricsInfo.suggestionsEmpty': 'Aucune suggestion pour le moment.',
  'sleepMetricsInfo.suggestionsLoadError':
    'Impossible de charger les suggestions personnalisées. Réessayez plus tard.',
  'sleepMetricsInfo.sectionTargetIntro':
    'Voici comment est calculée votre durée de sommeil recommandée pour cette nuit :',
  'sleepMetricsInfo.sectionTargetBullet1':
    'Votre déficit de sommeil actuel (retard ou avance par rapport à l’objectif hebdomadaire)',
  'sleepMetricsInfo.sectionTargetBullet2': 'Votre prochain type de garde (nuit, jour ou repos)',
  'sleepMetricsInfo.sectionTargetBullet3':
    'Votre besoin de base (souvent 7,5 h pour les travailleurs postés)',
  'sleepMetricsInfo.sectionTargetFoot':
    'L’objectif s’ajuste pour rattraper une dette de sommeil ou préserver votre rythme, selon vos gardes.',
  'sleepMetricsInfo.consistencyIntro':
    'Ce score (0–100) mesure la régularité de votre coucher sur les 7 derniers jours :',
  'sleepMetricsInfo.consistencyB1':
    '{range} Couchers très réguliers (idéal en horaires décalés)',
  'sleepMetricsInfo.consistencyB2':
    '{range} Régularité modérée (des écarts sont normaux lors des changements de garde)',
  'sleepMetricsInfo.consistencyB3':
    '{range} Forte variation des couchers (peut nuire à la récupération)',
  'sleepMetricsInfo.consistencyFoot':
    'Calculé à partir de l’écart-type des couchers du sommeil principal. Moins d’écart = score plus élevé.',
  'sleepMetricsInfo.consistencyShiftNote':
    'En horaires décalés, une certaine variation est attendue. L’objectif est d’être régulier à l’intérieur de chaque type de garde.',
  'sleepMetricsInfo.deficitIntro':
    'Indique votre retard ou avance par rapport à l’objectif de sommeil hebdomadaire :',
  'sleepMetricsInfo.deficitB1': '{label} Vous êtes en retard sur l’objectif hebdomadaire (il faut plus dormir)',
  'sleepMetricsInfo.deficitB2': '{label} Vous êtes en avance sur l’objectif (surplus de sommeil)',
  'sleepMetricsInfo.deficitB3':
    'Calcul sur les 7 derniers jours par rapport à l’objectif (souvent 52,5 h pour 7,5 h × 7 jours)',
  'sleepMetricsInfo.deficitFoot':
    'Catégories : Surplus / faible (dans l’objectif), moyen (à surveiller), élevé (prioriser la récupération).',
  'sleepMetricsInfo.personalizedTitle': 'Suggestions personnalisées',
  'sleepMetricsInfo.generating': 'Génération des suggestions…',
  'sleepMetricsInfo.suggestionsUnavailable': 'Impossible de charger les suggestions pour le moment.',
  'sleepMetricsInfo.gotIt': 'Compris',
  'sleepMetricsInfo.range80100': '80–100 :',
  'sleepMetricsInfo.range6079': '60–79 :',
  'sleepMetricsInfo.rangeBelow60': 'Moins de 60 :',
  'sleepMetricsInfo.positiveLabel': 'Nombre positif :',
  'sleepMetricsInfo.negativeLabel': 'Nombre négatif :',
  'sleepMetricsInfo.notePrefix': 'Remarque :',

  'sleepQualityChart.kicker': 'QUALITÉ DU SOMMEIL',
  'sleepQualityChart.title': 'Qualité du sommeil',
  'sleepQualityChart.infoAria': 'Infos sur la qualité du sommeil',
  'sleepQualityChart.errLoad': 'Échec du chargement des données de qualité',
  'sleepQualityChart.emptyTitle': 'Aucune donnée de sommeil',
  'sleepQualityChart.emptyBody': 'Enregistrez du sommeil pour voir vos indicateurs',
  'sleepQualityChart.labelDuration': 'Durée du sommeil',
  'sleepQualityChart.labelTimeAsleep': 'Temps endormi',
  'sleepQualityChart.labelEfficiency': 'Efficacité du sommeil',
  'sleepQualityChart.modalSubtitle': 'Comprendre vos indicateurs de sommeil',
  'sleepQualityChart.closeAria': 'Fermer',
  'sleepQualityChart.whatIsTitle': "Qu'est-ce que la qualité du sommeil ?",
  'sleepQualityChart.whatIsBody':
    'Votre score (0–100) reflète la qualité de votre sommeil selon votre évaluation, l’efficacité et le temps endormi.',
  'sleepQualityChart.explainDuration':
    'Le temps total passé au lit, du coucher au réveil.',
  'sleepQualityChart.explainTimeAsleep':
    'Le temps réellement endormi, sans les réveils nocturnes.',
  'sleepQualityChart.explainEfficiency':
    'La part du temps au lit passée endormi. Plus c’est élevé, mieux c’est — visez au moins 85 %.',
  'sleepQualityChart.improveTitle': 'Comment s’améliorer',
  'sleepQualityChart.improve1': 'Gardez des horaires de sommeil stables, même les jours off',
  'sleepQualityChart.improve2': 'Environnement sombre, calme et frais',
  'sleepQualityChart.improve3': 'Évitez écrans et lumière vive 1 à 2 h avant le coucher',
  'sleepQualityChart.improve4': 'Limitez caféine et repas lourds avant de dormir',
  'sleepQualityChart.improve5': 'Stores occultants et masque pour le sommeil de jour',

  'sleepLogList.kicker': 'JOURNAL DE SOMMEIL',
  'sleepLogList.title': 'Sessions récentes',
  'sleepLogList.viewLogs': 'Voir le journal',
  'sleepLogList.emptyTitle': 'Aucun sommeil enregistré',
  'sleepLogList.viewAll': 'Tout le journal de sommeil',

  'socialJetlagInfo.title': 'Jet lag social expliqué',
  'socialJetlagInfo.subtitle': 'Comprendre le décalage de votre horaire de sommeil',
  'socialJetlagInfo.s1Title': "Qu'est-ce que le jet lag social ?",
  'socialJetlagInfo.s1p1':
    'Le jet lag social mesure l’écart entre votre horaire de sommeil actuel et votre habitude. Pour les horaires décalés, c’est crucial car le planning change entre jour et nuit.',
  'socialJetlagInfo.s1p2':
    'Contrairement au décalage horaire du voyage, le jet lag social vient des changements de garde, d’horaires irréguliers ou du mode de vie.',
  'socialJetlagInfo.s2Title': 'Comment c’est calculé',
  'socialJetlagInfo.s2Intro': 'ShiftCoach calcule le jet lag social à partir de vos données :',
  'socialJetlagInfo.s2b1':
    'Regroupe le sommeil par « jours ShiftCoach » (07:00 → 07:00, pas minuit–minuit)',
  'socialJetlagInfo.s2b2':
    'Chaque jour : point médian du sommeil (entre le premier début et la dernière fin)',
  'socialJetlagInfo.s2b3':
    'Référence = médiane des points médians sur 7–10 jours stables précédents',
  'socialJetlagInfo.s2b4':
    'Compare le point médian du jour à la référence → décalage en heures',
  'socialJetlagInfo.dataBoxTitle': 'Vos données actuelles',
  'socialJetlagInfo.baselineMid': 'Point médian de référence : {time}',
  'socialJetlagInfo.currentMid': 'Point médian actuel : {time}',
  'socialJetlagInfo.misalignmentHours': 'Décalage : {h} heures',
  'socialJetlagInfo.s3Title': 'Catégories de score',
  'socialJetlagInfo.catLowTitle': 'Faible (0–1,5 h) :',
  'socialJetlagInfo.catLowBody':
    'Votre timing reste proche de l’habituel — idéal pour l’horloge biologique.',
  'socialJetlagInfo.catModTitle': 'Modéré (1,5–3,5 h) :',
  'socialJetlagInfo.catModBody':
    'Le point médian a nettement bougé, souvent après un changement de garde.',
  'socialJetlagInfo.catHighTitle': 'Élevé (>3,5 h) :',
  'socialJetlagInfo.catHighBody':
    'Fort décalage de l’horloge biologique — fréquent après alternance jour/nuit.',
  'socialJetlagInfo.s3Foot':
    'En horaires décalés, une certaine variation est normale. L’objectif est d’éviter les grands à-coups.',

  'sleepTimeline.noSleepYet': 'Aucun sommeil enregistré pour ce jour décalé.',
  'sleepTimeline.shifted24h': 'Timeline 24 h (jour décalé)',
  'sleepTimeline.shiftPrefix': 'Garde :',
  'sleepTimeline.todayLegend': 'Aujourd’hui :',
  'sleepTimeline.sumNightPostFrag':
    'Le plus long sommeil après la garde ; sommeil fragmenté en plusieurs blocs.',
  'sleepTimeline.sumNightPost': 'Le plus long sommeil après la garde.',
  'sleepTimeline.sumNightOffFrag':
    'Le plus long sommeil hors de la fenêtre typique après garde ; plusieurs blocs.',
  'sleepTimeline.sumNightOff': 'Le plus long sommeil hors de la fenêtre typique après garde.',
  'sleepTimeline.sumDefaultFrag':
    'Sommeil fragmenté ; le bloc le plus long est mis en évidence.',
  'sleepTimeline.sumDefault': 'Le bloc de sommeil le plus long est mis en évidence.',
  'sleepTimeline.sumMulti': 'Sommeil réparti sur plusieurs blocs.',
  'sleepTimeline.sumSingle': 'Un seul bloc de sommeil ce jour-là.',
  'sleepTimeline.sessionTooltip': '{type} · {start}–{end} ({h} h)',

  'shiftLag.kicker': 'ShiftLag',
  'shiftLag.title': 'Décalage lié à vos gardes',
  'shiftLag.refreshAria': 'Actualiser ShiftLag',
  'shiftLag.errNoData': 'Données ShiftLag indisponibles',
  'shiftLag.errLoad': 'Impossible de charger ShiftLag',
  'shiftLag.errBannerTitle': 'ShiftLag',
  'shiftLag.noData': 'Aucune donnée',
  'shiftLag.contributingFactors': 'Facteurs contributifs',
  'shiftLag.recommendations': 'Recommandations',
  'shiftLag.scoreBreakdown': 'Détail du score',
  'shiftLag.labelSleepDebt': 'Dette de sommeil',
  'shiftLag.labelMisalignment': 'Désalignement circadien',
  'shiftLag.labelInstability': 'Instabilité du planning',
  'shiftLag.emDash': '—',

  'quickSleep.notSignedIn': 'Non connecté',
  'quickSleep.saved': 'Enregistré',
  'quickSleep.dateLabel': 'Date',
  'quickSleep.typeLabel': 'Type',
  'quickSleep.startLabel': 'Début',
  'quickSleep.endLabel': 'Fin',
  'quickSleep.qualityLabel': 'Qualité : {q}/5',
  'quickSleep.presetLastNight': 'Cette nuit',
  'quickSleep.presetPostNight': 'Après garde de nuit',
  'quickSleep.presetNap20': 'Sieste 20 min',

  'sleepLogCard.kicker': 'JOURNAL DE SOMMEIL',
  'sleepLogCard.edit': 'Modifier',
  'sleepLogCard.last7': '7 derniers jours',
  'sleepLogCard.lastNightSub': 'Sommeil / sieste de la nuit dernière',
  'sleepLogCard.stagesTitle': 'Phases de sommeil',
  'sleepLogCard.noStageData': 'Aucune donnée de sommeil',
  'sleepLogCard.shiftCoach': 'Shift Coach',
  'sleepLogCard.coachGoodLead': 'Bravo !',
  'sleepLogCard.coachGoodRest':
    'Vous avez dormi {h} h cette nuit. Gardez ce rythme régulier pour votre horloge biologique et votre récupération.',
  'sleepLogCard.coachMid':
    'Vous avez dormi {h} h, sous la fourchette recommandée 7–9 h. Couchez-vous plus tôt ou faites une courte sieste. La régularité compte en horaires décalés.',
  'sleepLogCard.coachLowLead': 'Alerte sommeil :',
  'sleepLogCard.coachLowRest':
    'Seulement {h} h cette nuit — bien en dessous des recommandations. Priorisez un coucher plus tôt et une sieste de 20–30 min si vous êtes fatigué.',
  'sleepLogCard.durationM': '{m} min',

  'sleepFab.ariaAdd': 'Ajouter du sommeil',

  'sleepSessionList.loading': 'Chargement des sessions…',
  'sleepSessionList.empty': 'Aucune session de sommeil ce jour.',
  'sleepSessionList.quality': 'Qualité : {q}',

  'sleepShiftLog.timeline': 'Chronologie',
  'sleepShiftLog.hoursUnit': 'heures',
  'sleepShiftLog.oneSession': '1 session',
  'sleepShiftLog.nSessions': '{n} sessions',
  'sleepShiftLog.todaySleep': 'Sommeil du jour ({start} – {end})',
  'sleepShiftLog.daySleep': '{date} ({start} – {end})',
  'sleepShiftLog.windowFallback': 'Sommeil du jour (07:00 → 07:00)',
  'sleepShiftLog.noSleepYet': 'Pas encore de sommeil enregistré',

  'sleepQuality.excellent': 'Excellent',
  'sleepQuality.good': 'Bon',
  'sleepQuality.fair': 'Moyen',
  'sleepQuality.poor': 'Faible',
  'sleepQuality.veryPoor': 'Très mauvais',
  'sleep7.editAria': 'Modifier',
  'sleep7.deleteAria': 'Supprimer',
  'sleepForm.typeMain': 'Sommeil principal',
  'sleepForm.typeNap': 'Sieste',
  'sleepForm.cancel': 'Annuler',
  'sleepForm.save': 'Enregistrer',

  'sleepClassify.reasoning.day_sleep':
    'Sommeil de jour (4–8 h), typique après une garde de nuit.',
  'sleepClassify.reasoning.post_shift_recovery': 'Sommeil de récupération après une nuit.',
  'sleepClassify.reasoning.pre_shift_nap': 'Sieste avant la garde pour rester vigilant.',
  'sleepClassify.reasoning.micro_nap': 'Sieste courte pour un coup d’énergie.',
  'sleepClassify.reasoning.main_sleep': 'Sommeil principal aux heures de nuit habituelles.',
  'sleepClassify.reasoning.split_sleep': 'Schéma de sommeil fragmenté possible.',
  'sleepClassify.reasoning.irregular_sleep': 'Horaires qui ne correspondent pas aux schémas courants.',
}

export const sleepUiWorldPl: Record<string, string> = {
  'sleepJetlag.category.low': 'Niski',
  'sleepJetlag.category.moderate': 'Umiarkowany',
  'sleepJetlag.category.high': 'Wysoki',

  'sleepLog.title': 'Zapisz sen',
  'sleepLog.logNap': 'Zapisz drzemkę',

  'sleepLogs.shiftOff': 'WOLNE',
  'sleepLogs.duration0': '0 godz.',
  'sleepLogs.durationH': '{h} godz.',
  'sleepLogs.durationHM': '{h} godz. {m} min',
  'sleepCard.durationHM': '{h} godz. {m} min',

  'sleepSW.pageTitle': 'Sen',
  'sleepSW.backHome': 'Powrót do strony głównej',
  'sleepSW.loading': 'Ładowanie danych snu…',
  'sleepSW.metricsTitle': 'Metryki snu',
  'sleepSW.metricsHeading': 'Cel na dziś i podsumowanie tygodnia',
  'sleepSW.tonightTarget': 'Cel na dziś',
  'sleepSW.tonightHint': 'Cel snu na dziś według profilu.',
  'sleepSW.consistency': 'Regularność',
  'sleepSW.consistencyLine': '{pct}/100 · rytm głównego snu',
  'sleepSW.deficit': 'Deficyt snu',
  'sleepSW.deficitAhead': '{h} h ponad celem',
  'sleepSW.deficitBehind': '{h} h poniżej celu',
  'sleepSW.deficitSubError': 'Tydzień vs cel (7 dni).',
  'sleepSW.deficitSubAhead': 'Powyżej tygodniowego celu snu.',
  'sleepSW.deficitSubBehind': 'Poniżej tygodniowego celu snu.',
  'sleepSW.consistencySub': 'Regularność pójścia spać z głównego snu (ostatnie 7 dni).',
  'sleepSW.consistencyNeedData':
    'Zapisz co najmniej dwie sesje głównego snu, aby ocenić regularność.',
  'sleepSW.stage.deep': 'Głęboki',
  'sleepSW.stage.rem': 'REM',
  'sleepSW.stage.light': 'Płytki',
  'sleepSW.stage.awake': 'Czuwanie',
  'sleepSW.stageDesc.deep': 'Regeneracyjny sen dla odpoczynku fizycznego',
  'sleepSW.stageDesc.rem': 'Sen z marzeniami dla pamięci i nauki',
  'sleepSW.stageDesc.light': 'Przejściowy sen między fazami',
  'sleepSW.stageDesc.awake': 'Krótkie przebudzenia w trakcie snu',
  'sleepSW.debtNoData':
    'Brak danych o zadłużeniu snu. Zapisz kilka dni głównego snu, aby odblokować ten widok.',
  'sleepSW.debtWeeklyTitle': 'Tygodniowe zadłużenie snu',
  'sleepSW.debtWeeklySub':
    'Na podstawie ostatnich 7 dni zmianowych i idealnego celu na noc.',
  'sleepSW.behindAhead': 'Zaległość / nadwyżka',
  'sleepSW.debtBanked': 'Sen w nadwyżce',
  'sleepSW.debtBankedMsg':
    'Jesteś nieco ponad celem snu w tym tygodniu. Chron tę nadwyżkę przy intensywnych seriach zmian.',
  'sleepSW.debtMild': 'Niewielkie zadłużenie snu',
  'sleepSW.debtMildMsg':
    'Jesteś tylko trochę w tyle. Jedna lub dwie wcześniejsze noce albo drzemka regeneracyjna to nadrobią.',
  'sleepSW.debtModerate': 'Umiarkowane zadłużenie snu',
  'sleepSW.debtModerateMsg':
    'Zaplanuj dodatkowe bloki snu w dni wolne i unikaj dokładania kolejnych nocnych zmian, jeśli możesz.',
  'sleepSW.debtHigh': 'Wysokie zadłużenie snu',
  'sleepSW.debtHighMsg':
    'Jesteś wyraźnie w tyle z regeneracją. Potraktuj ten tydzień jako wysokie ryzyko zmęczenia i pomyłek.',
  'sleepSW.timelineTitle': 'Oś czasu snu — 24 godziny',
  'sleepSW.last30Title': 'Ostatnie 30 dni',
  'sleepSW.last30Sub':
    'Wybierz dzień, by sprawdzić, czy sen wystarczył na tę zmianę — wg profilu.',
  'sleepSW.editLogs': 'Zapisz sen',
  'sleepSW.totalSleepShiftedDay': 'Łączny sen w ten dzień zmianowy',
  'sleepSW.historyEmpty':
    'Brak historii snu z ostatnich 30 dni. Zacznij logować, by uzyskać wskazówki.',
  'sleepSW.stagesTitle': 'Fazy snu',
  'sleepSW.stagesSub': 'Z danych wearable lub szacunku z ostatniego snu.',
  'sleepSW.rating.noneLabel': 'Brak zapisanego snu',
  'sleepSW.rating.noneMsg': 'Zapisz główny sen i drzemki, by otrzymać wskazówki.',
  'sleepSW.rating.greatLabel': 'Świetnie',
  'sleepSW.rating.greatMsg':
    'Osiągnąłeś lub nieznacznie przekroczyłeś idealną dawkę snu dla profilu. Utrzymuj ten schemat, gdy możesz.',
  'sleepSW.rating.okLabel': 'OK, może być lepiej',
  'sleepSW.rating.okMsg':
    'Jesteś blisko ideału — kolejne 30–60 minut mocno pomogą w regeneracji.',
  'sleepSW.rating.warnLabel': 'Robi się zaległość',
  'sleepSW.rating.warnMsg':
    'Za mało snu względem potrzeb. Zaplanuj blok regeneracji lub drzemkę przy najbliższym oknie wolnym.',
  'sleepSW.rating.badLabel': 'Na oparach',
  'sleepSW.rating.badMsg':
    'Bardzo krótki sen jak na profil. Potraktuj dziś jako wysokie ryzyko zmęczenia, apetytu i błędów.',
  'sleepSW.weekMetricsError': 'Nie udało się wczytać tygodniowych metryk.',
  'sleepSW.noWearable': 'Brak podłączonego wearable. Skonfiguruj w sekcji Wearables.',
  'sleepSW.syncFailed': 'Synchronizacja wearable nie powiodła się',
  'sleepSW.deleteSessionFailed': 'Nie udało się usunąć sesji',
  'sleepSW.loggedSessionsTitle': 'Twoje wpisy snu',

  'sleepCard.last7': 'Ostatnie 7 dni',
  'sleepCard.chartSub': 'Ostatnie 7 dni lokalnych do dziś · cel {target} h',
  'sleepCard.selectedDay': 'Wybrany dzień:',
  'sleepCard.pctOfTarget': '({pct}% celu)',
  'sleepCard.sourceNoneLogged': 'Jeszcze brak zarejestrowanego snu',
  'sleepCard.sourceNoData': 'Brak danych źródłowych',
  'sleepCard.sourceManual': 'Dane ręczne',
  'sleepCard.sourceWearable': 'Dane z wearable',
  'sleepCard.sourceMixed': 'Dane mieszane',
  'sleepCard.syncManualOnly': 'Tylko ręcznie',
  'sleepCard.syncAwaiting': 'Oczekiwanie na pierwszą synchronizację',
  'sleepCard.hcSleepPermissionHint': 'Uprawnienie do snu nie jest włączone w Health Connect.',
  'sleepCard.hcNoSleepRecordsHint': 'Brak jeszcze rekordów snu z Health Connect.',
  'sleepCard.syncJustNow': 'Ostatnia synchronizacja przed chwilą',
  'sleepCard.syncMinAgo': 'Ostatnia synchronizacja {m} min temu',
  'sleepCard.syncHoursAgo': 'Ostatnia synchronizacja {h} godz. temu',
  'sleepCard.syncDaysAgo': 'Ostatnia synchronizacja {d} dni temu',
  'sleepCard.warnStale':
    'Synchronizacja wearable opóźniona. Zsynchronizuj teraz, by dzisiejsze sumy były dokładne.',
  'sleepCard.btnSyncing': 'Synchronizacja…',
  'sleepCard.btnSyncNow': 'Synchronizuj teraz',
  'sleepCard.btnLogSleep': 'Zapisz sen',
  'sleepCard.btnAddSleep': 'Dodaj sen',
  'sleepCard.btnEditLogs': 'Zapisz sen',
  'sleepCard.btnLogManually': 'Zapisz ręcznie',
  'sleepCard.btnEditToday': 'Edytuj sen',
  'sleepCard.hl.logPostShift': 'Zapisz sen po zmianie',
  'sleepCard.hl.postRecovery': 'Potrzebna regeneracja po zmianie',
  'sleepCard.hl.recoveryBelow': 'Dzień regeneracji — poniżej celu',
  'sleepCard.hl.logYourSleep': 'Zapisz swój sen',
  'sleepCard.hl.belowTarget': 'Dziś poniżej celu',
  'sleepCard.hl.progressing': 'Zbliżasz się do celu',
  'sleepCard.hl.onTrack': 'Dziś zgodnie z celem',
  'sleepCard.hl.recoveryCovered': 'Zapotrzebowanie na regenerację pokryte',
  'sleepCard.hl.overview': 'Przegląd snu',
  'sleepCard.sub.noSleep':
    'Na dziś nie zapisano jeszcze snu. Zapisz główny sen lub drzemki, by zachować dokładny rytm dobowy.',
  'sleepCard.sub.nightLogged':
    'Zapisano sen po zmianie. Masz {primary} głównego snu i {naps} drzemek.',
  'sleepCard.sub.debt':
    'Zapisano {primary} głównego snu i {naps} drzemek. Zalecany sen regeneracyjny, by zmniejszyć zaległość.',
  'sleepCard.sub.onlyNaps':
    'Na razie tylko drzemki. Dziś zapisano {naps} drzemek.',
  'sleepCard.sub.postShiftDom':
    'Dziś dominuje sen po zmianie. Zapisano: {primary} głównego, {naps} drzemek.',
  'sleepCard.sub.recoveryDom':
    'Dziś dominuje sen regeneracyjny. Zapisano: {primary} głównego, {naps} drzemek.',
  'sleepCard.sub.mainDom':
    'Zapisano główny sen. Dziś: {primary} głównego, {naps} drzemek.',
  'sleepCard.sub.default': 'Dziś: {primary} głównego snu i {naps} drzemek.',
  'sleepCard.primarySleep': 'Główny sen',
  'sleepCard.naps': 'Drzemki',
  'sleepCard.primaryType': 'Typ główny',
  'sleepCard.lastSync': 'Ostatnia synchronizacja',
  'sleepCard.recoveryNeed': 'Potrzeba regeneracji',
  'sleepCard.recoveryLoading': 'Ładowanie',
  'sleepCard.recoveryNeeded': 'Potrzeba {time} regeneracji',
  'sleepCard.recoveryCoveredLabel': 'Regeneracja pokryta',
  'sleepCard.timingLabel': 'Dopasowanie czasu do zmiany:',
  'sleepCard.timingNone': 'Za mało danych',
  'sleepCard.timingGood': 'Dobrze na tę zmianę',
  'sleepCard.timingOk': 'Akceptowalnie na tę zmianę',
  'sleepCard.timingPoor': 'Słabo dopasowane do zmiany',
  'sleepCard.typeNone': 'Brak',
  'sleepCard.ariaChart': 'Godziny snu z ostatnich siedmiu dni lokalnych. {summary}',
  'sleepCard.ariaChartTarget': 'Zielona linia kropkowana pokazuje cel {hours}.',
  'sleepCard.barTotalTitle': '{date}: łącznie {h} h snu',
  'sleepCard.dayTotalCaption': 'Łączny czas snu',
  'sleepCard.dayTotalHrsShort': 'godz.',
  'sleepCard.dayTotalMinsShort': 'min',

  'sleepType.main_sleep': 'Sen główny',
  'sleepType.post_shift_sleep': 'Sen po zmianie',
  'sleepType.recovery_sleep': 'Sen regeneracyjny',
  'sleepType.nap': 'Drzemka',
  'sleepType.default': 'Sen',

  'sleepMetricsInfo.title': 'Metryki snu — wyjaśnienie',
  'sleepMetricsInfo.subtitle': 'Zrozumienie danych o śnie',
  'sleepMetricsInfo.suggestionsEmpty': 'Brak sugestii w tym momencie.',
  'sleepMetricsInfo.suggestionsLoadError':
    'Nie udało się wczytać spersonalizowanych sugestii. Spróbuj później.',
  'sleepMetricsInfo.sectionTargetIntro':
    'Tak wyliczamy zalecaną długość snu na dziś:',
  'sleepMetricsInfo.sectionTargetBullet1':
    'Bieżący bilans snu w tygodniu (zaległość lub nadwyżka względem celu)',
  'sleepMetricsInfo.sectionTargetBullet2': 'Nadchodzący typ zmiany (noc, dzień lub wolne)',
  'sleepMetricsInfo.sectionTargetBullet3':
    'Podstawowa potrzeba snu (zwykle 7,5 h u wielu pracujących zmianowo)',
  'sleepMetricsInfo.sectionTargetFoot':
    'Cel dostosowuje się, by nadrobić zaległość lub utrzymać rytm — pod Twój harmonogram zmian.',
  'sleepMetricsInfo.consistencyIntro':
    'Wynik 0–100 mierzy regularność pójścia spać przez ostatnie 7 dni:',
  'sleepMetricsInfo.consistencyB1':
    '{range} Bardzo regularne pójścia spać (idealnie przy pracy zmianowej)',
  'sleepMetricsInfo.consistencyB2':
    '{range} Umiarkowana regularność (wahania są normalne przy zmianach)',
  'sleepMetricsInfo.consistencyB3':
    '{range} Duże rozrzuty godzin snu (może obniżyć regenerację)',
  'sleepMetricsInfo.consistencyFoot':
    'Liczone ze odchylenia standardowego godzin snu głównego. Mniejsze rozrzuty = wyższy wynik.',
  'sleepMetricsInfo.consistencyShiftNote':
    'Przy zmianach pewna zmienność jest naturalna. Chodzi o stabilność w ramach danego typu zmiany.',
  'sleepMetricsInfo.deficitIntro':
    'Pokazuje, ile brakuje lub ile masz ponad tygodniowy cel snu:',
  'sleepMetricsInfo.deficitB1': '{label} Jesteś poniżej celu tygodniowego (potrzebujesz więcej snu)',
  'sleepMetricsInfo.deficitB2': '{label} Jesteś powyżej celu (nadwyżka snu)',
  'sleepMetricsInfo.deficitB3':
    'Z ostatnich 7 dni względem celu (zwykle 52,5 h przy 7,5 h × 7 dni)',
  'sleepMetricsInfo.deficitFoot':
    'Kategorie: nadwyżka/niski (OK), średni (uwaga), wysoki (priorytet: odpoczynek).',
  'sleepMetricsInfo.personalizedTitle': 'Spersonalizowane sugestie',
  'sleepMetricsInfo.generating': 'Generowanie sugestii…',
  'sleepMetricsInfo.suggestionsUnavailable': 'Sugestii nie można teraz wczytać.',
  'sleepMetricsInfo.gotIt': 'Rozumiem',
  'sleepMetricsInfo.range80100': '80–100:',
  'sleepMetricsInfo.range6079': '60–79:',
  'sleepMetricsInfo.rangeBelow60': 'Poniżej 60:',
  'sleepMetricsInfo.positiveLabel': 'Liczba dodatnia:',
  'sleepMetricsInfo.negativeLabel': 'Liczba ujemna:',
  'sleepMetricsInfo.notePrefix': 'Uwaga:',

  'sleepQualityChart.kicker': 'JAKOŚĆ SNU',
  'sleepQualityChart.title': 'Jakość snu',
  'sleepQualityChart.infoAria': 'Informacje o jakości snu',
  'sleepQualityChart.errLoad': 'Nie udało się wczytać danych o jakości snu',
  'sleepQualityChart.emptyTitle': 'Brak danych o śnie',
  'sleepQualityChart.emptyBody': 'Zapisz sen, aby zobaczyć metryki jakości',
  'sleepQualityChart.labelDuration': 'Czas snu',
  'sleepQualityChart.labelTimeAsleep': 'Czas faktycznego snu',
  'sleepQualityChart.labelEfficiency': 'Efektywność snu',
  'sleepQualityChart.modalSubtitle': 'Zrozumienie metryk snu',
  'sleepQualityChart.closeAria': 'Zamknij',
  'sleepQualityChart.whatIsTitle': 'Czym jest jakość snu?',
  'sleepQualityChart.whatIsBody':
    'Wynik 0–100 odzwierciedla jakość snu na podstawie Twojej oceny, efektywności i czasu faktycznego snu.',
  'sleepQualityChart.explainDuration':
    'Całkowity czas w łóżku od zaśnięcia do pobudki.',
  'sleepQualityChart.explainTimeAsleep':
    'Czas rzeczywistego snu, bez nocnych przebudzeń.',
  'sleepQualityChart.explainEfficiency':
    'Odsetek czasu w łóżku, gdy śpisz. Im wyżej, tym lepiej — celuj w ok. 85% lub więcej.',
  'sleepQualityChart.improveTitle': 'Jak poprawić',
  'sleepQualityChart.improve1': 'Utrzymuj stałe godziny snu także w dni wolne',
  'sleepQualityChart.improve2': 'Ciemno, cisza i chłód w sypialni',
  'sleepQualityChart.improve3': 'Unikaj ekranów i jasnego światła 1–2 h przed snem',
  'sleepQualityChart.improve4': 'Ogranicz kofeinę i ciężkie posiłki przed snem',
  'sleepQualityChart.improve5': 'Zaciemnienie i opaska na oczy przy śnie w dzień',

  'sleepLogList.kicker': 'DZIENNIK SNU',
  'sleepLogList.title': 'Ostatnie sesje snu',
  'sleepLogList.viewLogs': 'Zobacz wpisy',
  'sleepLogList.emptyTitle': 'Brak zapisanego snu',
  'sleepLogList.viewAll': 'Cały dziennik snu',

  'socialJetlagInfo.title': 'Jet lag społeczny — wyjaśnienie',
  'socialJetlagInfo.subtitle': 'Przesunięcie Twojego rytmu snu',
  'socialJetlagInfo.s1Title': 'Czym jest jet lag społeczny?',
  'socialJetlagInfo.s1p1':
    'Mierzy, o ile obecny harmonogram snu odbiega od zwykłego. Przy pracy zmianowej ma to duże znaczenie, bo plan zmienia się między dniami a nocami.',
  'socialJetlagInfo.s1p2':
    'W przeciwieństwie do jet lagu z podróży, jet lag społeczny wynika ze zmian grafiku, nieregularności lub stylu życia.',
  'socialJetlagInfo.s2Title': 'Jak to liczymy',
  'socialJetlagInfo.s2Intro': 'ShiftCoach wylicza jet lag społeczny z Twoich danych:',
  'socialJetlagInfo.s2b1':
    'Sen grupujemy w „dni ShiftCoach” (07:00 → 07:00, nie od północy)',
  'socialJetlagInfo.s2b2':
    'Dla każdego dnia: punkt środkowy snu (między pierwszym początkiem a końcem ostatniego bloku)',
  'socialJetlagInfo.s2b3':
    'Baza z mediany punktów środkowych z poprzednich 7–10 stabilnych dni',
  'socialJetlagInfo.s2b4':
    'Porównanie dzisiejszego punktu z bazą → przesunięcie w godzinach',
  'socialJetlagInfo.dataBoxTitle': 'Twoje bieżące dane',
  'socialJetlagInfo.baselineMid': 'Punkt odniesienia: {time}',
  'socialJetlagInfo.currentMid': 'Bieżący punkt środkowy: {time}',
  'socialJetlagInfo.misalignmentHours': 'Przesunięcie: {h} godz.',
  'socialJetlagInfo.s3Title': 'Kategorie wyniku',
  'socialJetlagInfo.catLowTitle': 'Niski (0–1,5 h):',
  'socialJetlagInfo.catLowBody':
    'Harmonogram snu blisko zwykłego — dobrze dla zegara biologicznego.',
  'socialJetlagInfo.catModTitle': 'Umiarkowany (1,5–3,5 h):',
  'socialJetlagInfo.catModBody':
    'Wyraźny przesun punktu środkowego, często po zmianie zmian.',
  'socialJetlagInfo.catHighTitle': 'Wysoki (>3,5 h):',
  'socialJetlagInfo.catHighBody':
    'Duże przesunięcie rytmu — częste przy przejściu dzień/noc.',
  'socialJetlagInfo.s3Foot':
    'Przy zmianach pewna zmienność jest normalna. Chodzi o unikanie gwałtownych skoków.',

  'sleepTimeline.noSleepYet': 'Brak snu zarejestrowanego w ten dzień zmianowy.',
  'sleepTimeline.shifted24h': 'Oś 24 h (dzień zmianowy)',
  'sleepTimeline.shiftPrefix': 'Zmiana:',
  'sleepTimeline.todayLegend': 'Dziś:',
  'sleepTimeline.sumNightPostFrag':
    'Najdłuższy sen po zmianie; sen rozłożony na kilka bloków.',
  'sleepTimeline.sumNightPost': 'Najdłuższy sen po zmianie.',
  'sleepTimeline.sumNightOffFrag':
    'Najdłuższy sen poza typowym oknem po zmianie; kilka bloków.',
  'sleepTimeline.sumNightOff': 'Najdłuższy sen poza typowym oknem po zmianie.',
  'sleepTimeline.sumDefaultFrag':
    'Sen rozłożony na bloki; podświetlono najdłuższy.',
  'sleepTimeline.sumDefault': 'Najdłuższy blok snu jest podświetlony.',
  'sleepTimeline.sumMulti': 'Sen rozłożony na kilka bloków.',
  'sleepTimeline.sumSingle': 'Jeden blok snu w tym dniu zmiennym.',
  'sleepTimeline.sessionTooltip': '{type} · {start}–{end} ({h} h)',

  'shiftLag.kicker': 'ShiftLag',
  'shiftLag.title': 'Jet lag od zmian',
  'shiftLag.refreshAria': 'Odśwież ShiftLag',
  'shiftLag.errNoData': 'Brak danych ShiftLag',
  'shiftLag.errLoad': 'Nie udało się wczytać ShiftLag',
  'shiftLag.errBannerTitle': 'ShiftLag',
  'shiftLag.noData': 'Brak danych',
  'shiftLag.contributingFactors': 'Czynniki wpływające',
  'shiftLag.recommendations': 'Zalecenia',
  'shiftLag.scoreBreakdown': 'Rozkład punktów',
  'shiftLag.labelSleepDebt': 'Zadłużenie snu',
  'shiftLag.labelMisalignment': 'Niedopasowanie rytmu dobowego',
  'shiftLag.labelInstability': 'Niestabilność grafiku',
  'shiftLag.emDash': '—',

  'quickSleep.notSignedIn': 'Nie zalogowano',
  'quickSleep.saved': 'Zapisano',
  'quickSleep.dateLabel': 'Data',
  'quickSleep.typeLabel': 'Typ',
  'quickSleep.startLabel': 'Początek',
  'quickSleep.endLabel': 'Koniec',
  'quickSleep.qualityLabel': 'Jakość: {q}/5',
  'quickSleep.presetLastNight': 'Ostatnia noc',
  'quickSleep.presetPostNight': 'Po nocnej',
  'quickSleep.presetNap20': 'Drzemka 20 min',

  'sleepLogCard.kicker': 'DZIENNIK SNU',
  'sleepLogCard.edit': 'Edytuj',
  'sleepLogCard.last7': 'Ostatnie 7 dni',
  'sleepLogCard.lastNightSub': 'Sen / drzemka z ostatniej nocy',
  'sleepLogCard.stagesTitle': 'Fazy snu',
  'sleepLogCard.noStageData': 'Brak danych o śnie',
  'sleepLogCard.shiftCoach': 'Shift Coach',
  'sleepLogCard.coachGoodLead': 'Świetnie!',
  'sleepLogCard.coachGoodRest':
    'Spałeś(-aś) {h} h tej nocy. Utrzymuj ten rytm dla zegara biologicznego i regeneracji.',
  'sleepLogCard.coachMid':
    '{h} h to mniej niż zalecane 7–9 h. Spróbuj pójść wcześniej spać lub zdrzemnąć się. Regularność ma znaczenie przy zmianach.',
  'sleepLogCard.coachLowLead': 'Alert snu:',
  'sleepLogCard.coachLowRest':
    'Tylko {h} h tej nocy — znacznie poniżej normy. Priorytet: wcześniejszy sen i ewentualnie drzemka 20–30 min przy zmęczeniu.',
  'sleepLogCard.durationM': '{m} min',

  'sleepFab.ariaAdd': 'Dodaj sen',

  'sleepSessionList.loading': 'Wczytywanie sesji snu…',
  'sleepSessionList.empty': 'Brak sesji snu tego dnia.',
  'sleepSessionList.quality': 'Jakość: {q}',

  'sleepShiftLog.timeline': 'Oś czasu',
  'sleepShiftLog.hoursUnit': 'godz.',
  'sleepShiftLog.oneSession': '1 sesja',
  'sleepShiftLog.nSessions': '{n} sesji',
  'sleepShiftLog.todaySleep': 'Sen dziś ({start} – {end})',
  'sleepShiftLog.daySleep': '{date} ({start} – {end})',
  'sleepShiftLog.windowFallback': 'Sen dziś (07:00 → 07:00)',
  'sleepShiftLog.noSleepYet': 'Brak zapisanego snu',

  'sleepQuality.excellent': 'Doskonale',
  'sleepQuality.good': 'Dobry',
  'sleepQuality.fair': 'Średni',
  'sleepQuality.poor': 'Słaby',
  'sleepQuality.veryPoor': 'Bardzo słaby',
  'sleep7.editAria': 'Edytuj',
  'sleep7.deleteAria': 'Usuń',
  'sleepForm.typeMain': 'Sen główny',
  'sleepForm.typeNap': 'Drzemka',
  'sleepForm.cancel': 'Anuluj',
  'sleepForm.save': 'Zapisz',

  'sleepClassify.reasoning.day_sleep':
    'Sen dzienny (4–8 h), typowy po nocnej zmianie.',
  'sleepClassify.reasoning.post_shift_recovery': 'Sen regeneracyjny po nocnej zmianie.',
  'sleepClassify.reasoning.pre_shift_nap': 'Drzemka przed zmianą dla lepszej czujności.',
  'sleepClassify.reasoning.micro_nap': 'Krótka drzemka na szybki zastrzyk energii.',
  'sleepClassify.reasoning.main_sleep': 'Główny sen w typowych godzinach nocnych.',
  'sleepClassify.reasoning.split_sleep': 'Możliwy wzorzec podzielonego snu.',
  'sleepClassify.reasoning.irregular_sleep': 'Timing snu nie pasuje do typowych wzorców.',
}

export const sleepUiWorldPtBR: Record<string, string> = {
  'sleepJetlag.category.low': 'Baixo',
  'sleepJetlag.category.moderate': 'Moderado',
  'sleepJetlag.category.high': 'Alto',

  'sleepLog.title': 'Registrar sono',
  'sleepLog.logNap': 'Registrar cochilo',

  'sleepLogs.shiftOff': 'FOLGA',
  'sleepLogs.duration0': '0 h',
  'sleepLogs.durationH': '{h} h',
  'sleepLogs.durationHM': '{h} h {m} min',
  'sleepCard.durationHM': '{h} h {m} min',

  'sleepSW.pageTitle': 'Sono',
  'sleepSW.backHome': 'Voltar ao início',
  'sleepSW.loading': 'Carregando dados de sono…',
  'sleepSW.metricsTitle': 'Métricas de sono',
  'sleepSW.metricsHeading': 'Meta desta noite e visão semanal',
  'sleepSW.tonightTarget': 'Meta desta noite',
  'sleepSW.tonightHint': 'Meta de sono para esta noite com base no seu perfil.',
  'sleepSW.consistency': 'Consistência',
  'sleepSW.consistencyLine': '{pct}/100 · ritmo do sono principal',
  'sleepSW.deficit': 'Déficit de sono',
  'sleepSW.deficitAhead': '{h} h à frente',
  'sleepSW.deficitBehind': '{h} h atrás',
  'sleepSW.deficitSubError': 'Semana vs meta (7 dias).',
  'sleepSW.deficitSubAhead': 'Acima da meta semanal de sono.',
  'sleepSW.deficitSubBehind': 'Abaixo da meta semanal de sono.',
  'sleepSW.consistencySub': 'Regularidade de deitar no sono principal (últimos 7 dias).',
  'sleepSW.consistencyNeedData':
    'Registre pelo menos duas sessões de sono principal para pontuar consistência.',
  'sleepSW.stage.deep': 'Profundo',
  'sleepSW.stage.rem': 'REM',
  'sleepSW.stage.light': 'Leve',
  'sleepSW.stage.awake': 'Desperto',
  'sleepSW.stageDesc.deep': 'Sono restaurador para recuperação física',
  'sleepSW.stageDesc.rem': 'Sono com sonhos para memória e aprendizado',
  'sleepSW.stageDesc.light': 'Sono de transição entre fases',
  'sleepSW.stageDesc.awake': 'Breves despertares durante o sono',
  'sleepSW.debtNoData':
    'Ainda sem dados de dívida de sono. Registre alguns dias de sono principal para desbloquear.',
  'sleepSW.debtWeeklyTitle': 'Dívida de sono semanal',
  'sleepSW.debtWeeklySub':
    'Com base nos últimos 7 dias do seu turno e na meta noturna ideal.',
  'sleepSW.behindAhead': 'Atraso / à frente',
  'sleepSW.debtBanked': 'Sono em excesso',
  'sleepSW.debtBankedMsg':
    'Você está um pouco acima do sono nesta semana. Proteja essa folga em períodos pesados de turno.',
  'sleepSW.debtMild': 'Dívida de sono leve',
  'sleepSW.debtMildMsg':
    'Você está só um pouco atrás. Uma ou duas noites mais cedo ou um cochilo de recuperação resolvem.',
  'sleepSW.debtModerate': 'Dívida de sono moderada',
  'sleepSW.debtModerateMsg':
    'Planeje blocos extras de sono nos dias de folga e evite acumular mais turnos noturnos se puder.',
  'sleepSW.debtHigh': 'Dívida de sono alta',
  'sleepSW.debtHighMsg':
    'Você está bem atrás na recuperação. Trate esta semana como alto risco de fadiga e erros.',
  'sleepSW.timelineTitle': 'Linha do tempo de sono em 24 h',
  'sleepSW.last30Title': 'Últimos 30 dias',
  'sleepSW.last30Sub':
    'Escolha um dia para ver se o sono foi suficiente para aquele turno, com base no seu perfil.',
  'sleepSW.editLogs': 'Registrar sono',
  'sleepSW.totalSleepShiftedDay': 'Sono total naquele dia do turno',
  'sleepSW.historyEmpty':
    'Ainda sem histórico de sono nos últimos 30 dias. Comece a registrar para ver orientações.',
  'sleepSW.stagesTitle': 'Fases do sono',
  'sleepSW.stagesSub': 'De wearable ou estimado a partir do seu último sono.',
  'sleepSW.rating.noneLabel': 'Nenhum sono registrado',
  'sleepSW.rating.noneMsg': 'Registre sono principal e cochilos para receber orientação.',
  'sleepSW.rating.greatLabel': 'Indo muito bem',
  'sleepSW.rating.greatMsg':
    'Você atingiu ou passou um pouco da dose ideal para o seu perfil. Mantenha esse padrão quando puder.',
  'sleepSW.rating.okLabel': 'Ok, dá para melhorar',
  'sleepSW.rating.okMsg':
    'Você está perto do ideal — mais 30–60 minutos ajudam muito na recuperação.',
  'sleepSW.rating.warnLabel': 'Ficando atrás',
  'sleepSW.rating.warnMsg':
    'Pouco sono para suas necessidades. Planeje um bloco de recuperação ou cochilo na próxima janela livre.',
  'sleepSW.rating.badLabel': 'No limite',
  'sleepSW.rating.badMsg':
    'Sono muito curto para o seu perfil. Trate hoje como alto risco de fadiga, compulsão alimentar e erros.',
  'sleepSW.weekMetricsError': 'Não foi possível carregar as métricas semanais.',
  'sleepSW.noWearable': 'Nenhum wearable conectado. Configure em Wearables.',
  'sleepSW.syncFailed': 'Falha ao sincronizar wearables',
  'sleepSW.deleteSessionFailed': 'Não foi possível excluir a sessão',
  'sleepSW.loggedSessionsTitle': 'Seus registros de sono',

  'sleepCard.last7': 'Últimos 7 dias',
  'sleepCard.chartSub': 'Últimos 7 dias locais até hoje · meta {target} h',
  'sleepCard.selectedDay': 'Dia selecionado:',
  'sleepCard.pctOfTarget': '({pct}% da meta)',
  'sleepCard.sourceNoneLogged': 'Ainda sem sono registrado',
  'sleepCard.sourceNoData': 'Sem dados de origem',
  'sleepCard.sourceManual': 'Dados manuais',
  'sleepCard.sourceWearable': 'Dados do wearable',
  'sleepCard.sourceMixed': 'Dados mistos',
  'sleepCard.syncManualOnly': 'Somente manual',
  'sleepCard.syncAwaiting': 'Aguardando primeira sincronização',
  'sleepCard.hcSleepPermissionHint': 'A permissão de sono não está ativada no Health Connect.',
  'sleepCard.hcNoSleepRecordsHint': 'Ainda não há registros de sono do Health Connect.',
  'sleepCard.syncJustNow': 'Última sincronização agora',
  'sleepCard.syncMinAgo': 'Última sincronização há {m} min',
  'sleepCard.syncHoursAgo': 'Última sincronização há {h} h',
  'sleepCard.syncDaysAgo': 'Última sincronização há {d} d',
  'sleepCard.warnStale':
    'Sincronização do wearable atrasada. Sincronize agora para manter os totais de hoje corretos.',
  'sleepCard.btnSyncing': 'Sincronizando…',
  'sleepCard.btnSyncNow': 'Sincronizar agora',
  'sleepCard.btnLogSleep': 'Registrar sono',
  'sleepCard.btnAddSleep': 'Adicionar sono',
  'sleepCard.btnEditLogs': 'Registrar sono',
  'sleepCard.btnLogManually': 'Registrar manualmente',
  'sleepCard.btnEditToday': 'Editar sono',
  'sleepCard.hl.logPostShift': 'Registrar sono pós-turno',
  'sleepCard.hl.postRecovery': 'Recuperação pós-turno necessária',
  'sleepCard.hl.recoveryBelow': 'Dia de recuperação — abaixo da meta',
  'sleepCard.hl.logYourSleep': 'Registre seu sono',
  'sleepCard.hl.belowTarget': 'Abaixo da meta hoje',
  'sleepCard.hl.progressing': 'Avançando em direção à meta',
  'sleepCard.hl.onTrack': 'Dentro da meta hoje',
  'sleepCard.hl.recoveryCovered': 'Necessidade de recuperação coberta',
  'sleepCard.hl.overview': 'Visão geral do sono',
  'sleepCard.sub.noSleep':
    'Ainda sem sono registrado neste dia. Registre sono principal ou cochilos para manter o ritmo circadiano preciso.',
  'sleepCard.sub.nightLogged':
    'Sono pós-turno registrado. Você registrou {primary} de sono principal e {naps} de cochilos.',
  'sleepCard.sub.debt':
    'Você registrou {primary} de sono principal e {naps} de cochilos. Sono de recuperação é recomendado para reduzir a dívida.',
  'sleepCard.sub.onlyNaps':
    'Por enquanto só cochilos. Você registrou {naps} de cochilos hoje.',
  'sleepCard.sub.postShiftDom':
    'O sono pós-turno é o principal hoje. Registrado: {primary} principal, {naps} cochilos.',
  'sleepCard.sub.recoveryDom':
    'O sono de recuperação lidera hoje. Registrado: {primary} principal, {naps} cochilos.',
  'sleepCard.sub.mainDom':
    'Sono principal registrado. Hoje: {primary} principal, {naps} cochilos.',
  'sleepCard.sub.default': 'Hoje: {primary} de sono principal e {naps} de cochilos.',
  'sleepCard.primarySleep': 'Sono principal',
  'sleepCard.naps': 'Cochilos',
  'sleepCard.primaryType': 'Tipo principal',
  'sleepCard.lastSync': 'Última sincronização',
  'sleepCard.recoveryNeed': 'Necessidade de recuperação',
  'sleepCard.recoveryLoading': 'Carregando',
  'sleepCard.recoveryNeeded': '{time} de recuperação necessários',
  'sleepCard.recoveryCoveredLabel': 'Recuperação coberta',
  'sleepCard.timingLabel': 'Alinhamento de horário:',
  'sleepCard.timingNone': 'Dados insuficientes',
  'sleepCard.timingGood': 'Bom para este turno',
  'sleepCard.timingOk': 'Aceitável para este turno',
  'sleepCard.timingPoor': 'Fora do ideal para este turno',
  'sleepCard.typeNone': 'Nenhum',
  'sleepCard.ariaChart': 'Horas de sono nos últimos sete dias locais. {summary}',
  'sleepCard.ariaChartTarget': 'A linha tracejada verde mostra a meta {hours}.',
  'sleepCard.barTotalTitle': '{date}: {h} h de sono no total',
  'sleepCard.dayTotalCaption': 'Tempo total de sono',
  'sleepCard.dayTotalHrsShort': 'h',
  'sleepCard.dayTotalMinsShort': 'min',

  'sleepType.main_sleep': 'Sono principal',
  'sleepType.post_shift_sleep': 'Sono pós-turno',
  'sleepType.recovery_sleep': 'Sono de recuperação',
  'sleepType.nap': 'Cochilo',
  'sleepType.default': 'Sono',

  'sleepMetricsInfo.title': 'Métricas de sono explicadas',
  'sleepMetricsInfo.subtitle': 'Entenda seus dados de sono',
  'sleepMetricsInfo.suggestionsEmpty': 'Nenhuma sugestão disponível no momento.',
  'sleepMetricsInfo.suggestionsLoadError':
    'Não foi possível carregar sugestões personalizadas. Tente mais tarde.',
  'sleepMetricsInfo.sectionTargetIntro':
    'Assim calculamos a duração recomendada de sono para esta noite:',
  'sleepMetricsInfo.sectionTargetBullet1':
    'Seu déficit atual de sono (atraso ou folga em relação à meta semanal)',
  'sleepMetricsInfo.sectionTargetBullet2': 'Seu próximo tipo de turno (noite, dia ou folga)',
  'sleepMetricsInfo.sectionTargetBullet3':
    'Sua necessidade base de sono (em geral 7,5 h para muitos trabalhadores de turno)',
  'sleepMetricsInfo.sectionTargetFoot':
    'A meta se ajusta para recuperar dívida de sono ou manter o ritmo, conforme sua escala.',
  'sleepMetricsInfo.consistencyIntro':
    'Esta pontuação (0–100) mede a regularidade da hora de dormir nos últimos 7 dias:',
  'sleepMetricsInfo.consistencyB1':
    '{range} Horários muito regulares (ideal em trabalho por turnos)',
  'sleepMetricsInfo.consistencyB2':
    '{range} Regularidade moderada (variação é normal ao mudar de turno)',
  'sleepMetricsInfo.consistencyB3':
    '{range} Grande variação nos horários (pode afetar a recuperação)',
  'sleepMetricsInfo.consistencyFoot':
    'Calculado pelo desvio-padrão das horas de deitar do sono principal. Menos variação = pontuação maior.',
  'sleepMetricsInfo.consistencyShiftNote':
    'Em turnos, alguma variação é esperada. O objetivo é manter consistência dentro de cada tipo de turno.',
  'sleepMetricsInfo.deficitIntro':
    'Mostra o quanto você está atrás ou à frente da meta semanal de sono:',
  'sleepMetricsInfo.deficitB1': '{label} Você está abaixo da meta semanal (precisa dormir mais)',
  'sleepMetricsInfo.deficitB2': '{label} Você está acima da meta (excesso de sono)',
  'sleepMetricsInfo.deficitB3':
    'Com base nos últimos 7 dias versus a meta (em geral 52,5 h para 7,5 h × 7 dias)',
  'sleepMetricsInfo.deficitFoot':
    'Categorias: Excesso/baixo (no caminho), médio (atenção), alto (priorize recuperação).',
  'sleepMetricsInfo.personalizedTitle': 'Sugestões personalizadas',
  'sleepMetricsInfo.generating': 'Gerando sugestões…',
  'sleepMetricsInfo.suggestionsUnavailable': 'Não foi possível carregar sugestões agora.',
  'sleepMetricsInfo.gotIt': 'Entendi',
  'sleepMetricsInfo.range80100': '80–100:',
  'sleepMetricsInfo.range6079': '60–79:',
  'sleepMetricsInfo.rangeBelow60': 'Abaixo de 60:',
  'sleepMetricsInfo.positiveLabel': 'Número positivo:',
  'sleepMetricsInfo.negativeLabel': 'Número negativo:',
  'sleepMetricsInfo.notePrefix': 'Obs.:',

  'sleepQualityChart.kicker': 'QUALIDADE DO SONO',
  'sleepQualityChart.title': 'Qualidade do sono',
  'sleepQualityChart.infoAria': 'Informações sobre qualidade do sono',
  'sleepQualityChart.errLoad': 'Falha ao carregar dados de qualidade do sono',
  'sleepQualityChart.emptyTitle': 'Sem dados de sono',
  'sleepQualityChart.emptyBody': 'Registre sono para ver suas métricas',
  'sleepQualityChart.labelDuration': 'Duração do sono',
  'sleepQualityChart.labelTimeAsleep': 'Tempo dormindo',
  'sleepQualityChart.labelEfficiency': 'Eficiência do sono',
  'sleepQualityChart.modalSubtitle': 'Entenda suas métricas de sono',
  'sleepQualityChart.closeAria': 'Fechar',
  'sleepQualityChart.whatIsTitle': 'O que é qualidade do sono?',
  'sleepQualityChart.whatIsBody':
    'Sua pontuação (0–100) reflete o quão bem você dormiu com base na avaliação, eficiência e tempo dormindo.',
  'sleepQualityChart.explainDuration':
    'Tempo total na cama, de quando adormece até acordar.',
  'sleepQualityChart.explainTimeAsleep':
    'O tempo em que você esteve realmente dormindo, sem contar despertares.',
  'sleepQualityChart.explainEfficiency':
    'A porcentagem do tempo na cama em que você dormiu. Quanto maior, melhor — mire em 85% ou mais.',
  'sleepQualityChart.improveTitle': 'Como melhorar',
  'sleepQualityChart.improve1': 'Mantenha horários de sono estáveis, inclusive nos dias de folga',
  'sleepQualityChart.improve2': 'Ambiente escuro, silencioso e fresco',
  'sleepQualityChart.improve3': 'Evite telas e luz forte 1–2 h antes de dormir',
  'sleepQualityChart.improve4': 'Limite cafeína e refeições pesadas perto de dormir',
  'sleepQualityChart.improve5': 'Cortinas blackout e máscara para sono diurno',

  'sleepLogList.kicker': 'REGISTRO DE SONO',
  'sleepLogList.title': 'Sessões recentes de sono',
  'sleepLogList.viewLogs': 'Ver registros',
  'sleepLogList.emptyTitle': 'Nenhum sono registrado ainda',
  'sleepLogList.viewAll': 'Ver todo o histórico de sono',

  'socialJetlagInfo.title': 'Jet lag social explicado',
  'socialJetlagInfo.subtitle': 'Entenda o deslocamento do seu horário de sono',
  'socialJetlagInfo.s1Title': 'O que é jet lag social?',
  'socialJetlagInfo.s1p1':
    'Mede o quanto seu horário de sono atual se afastou do habitual. Em turnos isso importa muito, pois o sono muda entre dia e noite.',
  'socialJetlagInfo.s1p2':
    'Diferente do jet lag de viagem, o social ocorre quando o relógio biológico se desalinha por mudanças de turno, horários irregulares ou estilo de vida.',
  'socialJetlagInfo.s2Title': 'Como é calculado',
  'socialJetlagInfo.s2Intro': 'O ShiftCoach calcula o jet lag social com seus dados:',
  'socialJetlagInfo.s2b1':
    'Agrupa o sono em “dias ShiftCoach” (07:00 → 07:00, não meia-noite a meia-noite)',
  'socialJetlagInfo.s2b2':
    'A cada dia: ponto médio do sono (entre o início do primeiro bloco e o fim do último)',
  'socialJetlagInfo.s2b3':
    'Linha de base pela mediana dos pontos médios dos 7–10 dias estáveis anteriores',
  'socialJetlagInfo.s2b4':
    'Compara o ponto médio de hoje com a linha de base → desalinhamento em horas',
  'socialJetlagInfo.dataBoxTitle': 'Seus dados atuais',
  'socialJetlagInfo.baselineMid': 'Ponto médio de referência: {time}',
  'socialJetlagInfo.currentMid': 'Ponto médio atual: {time}',
  'socialJetlagInfo.misalignmentHours': 'Desalinhamento: {h} horas',
  'socialJetlagInfo.s3Title': 'Categorias de pontuação',
  'socialJetlagInfo.catLowTitle': 'Baixo (0–1,5 h):',
  'socialJetlagInfo.catLowBody':
    'Seu horário de sono ficou perto do habitual — bom para o relógio biológico.',
  'socialJetlagInfo.catModTitle': 'Moderado (1,5–3,5 h):',
  'socialJetlagInfo.catModBody':
    'O ponto médio mudou bastante, muitas vezes após troca de turno.',
  'socialJetlagInfo.catHighTitle': 'Alto (>3,5 h):',
  'socialJetlagInfo.catHighBody':
    'Grande deslocamento do padrão — comum ao alternar dia e noite.',
  'socialJetlagInfo.s3Foot':
    'Em turnos, alguma variação é normal. O objetivo é evitar oscilações grandes.',

  'sleepTimeline.noSleepYet': 'Nenhum sono registrado neste dia de turno.',
  'sleepTimeline.shifted24h': 'Linha do tempo 24 h (dia de turno)',
  'sleepTimeline.shiftPrefix': 'Turno:',
  'sleepTimeline.todayLegend': 'Hoje:',
  'sleepTimeline.sumNightPostFrag':
    'O sono mais longo foi após o turno; sono dividido em vários blocos.',
  'sleepTimeline.sumNightPost': 'O sono mais longo foi após o turno.',
  'sleepTimeline.sumNightOffFrag':
    'O sono mais longo ficou fora da janela típica pós-turno; vários blocos.',
  'sleepTimeline.sumNightOff': 'O sono mais longo ficou fora da janela típica pós-turno.',
  'sleepTimeline.sumDefaultFrag':
    'Sono dividido em blocos; o mais longo está destacado.',
  'sleepTimeline.sumDefault': 'O bloco de sono mais longo está destacado.',
  'sleepTimeline.sumMulti': 'Sono dividido em vários blocos.',
  'sleepTimeline.sumSingle': 'Um único bloco de sono neste dia de turno.',
  'sleepTimeline.sessionTooltip': '{type} · {start}–{end} ({h} h)',

  'shiftLag.kicker': 'ShiftLag',
  'shiftLag.title': 'Jet lag dos seus turnos',
  'shiftLag.refreshAria': 'Atualizar ShiftLag',
  'shiftLag.errNoData': 'Dados do ShiftLag indisponíveis',
  'shiftLag.errLoad': 'Não foi possível carregar o ShiftLag',
  'shiftLag.errBannerTitle': 'ShiftLag',
  'shiftLag.noData': 'Sem dados',
  'shiftLag.contributingFactors': 'Fatores contribuintes',
  'shiftLag.recommendations': 'Recomendações',
  'shiftLag.scoreBreakdown': 'Detalhamento da pontuação',
  'shiftLag.labelSleepDebt': 'Dívida de sono',
  'shiftLag.labelMisalignment': 'Desalinhamento circadiano',
  'shiftLag.labelInstability': 'Instabilidade da escala',
  'shiftLag.emDash': '—',

  'quickSleep.notSignedIn': 'Não conectado',
  'quickSleep.saved': 'Salvo',
  'quickSleep.dateLabel': 'Data',
  'quickSleep.typeLabel': 'Tipo',
  'quickSleep.startLabel': 'Início',
  'quickSleep.endLabel': 'Fim',
  'quickSleep.qualityLabel': 'Qualidade: {q}/5',
  'quickSleep.presetLastNight': 'Noite passada',
  'quickSleep.presetPostNight': 'Pós-turno noturno',
  'quickSleep.presetNap20': 'Cochilo 20 min',

  'sleepLogCard.kicker': 'REGISTRO DE SONO',
  'sleepLogCard.edit': 'Editar',
  'sleepLogCard.last7': 'Últimos 7 dias',
  'sleepLogCard.lastNightSub': 'Sono / cochilo da noite passada',
  'sleepLogCard.stagesTitle': 'Estágios do sono',
  'sleepLogCard.noStageData': 'Sem dados de sono',
  'sleepLogCard.shiftCoach': 'Shift Coach',
  'sleepLogCard.coachGoodLead': 'Muito bem!',
  'sleepLogCard.coachGoodRest':
    'Você dormiu {h} h na noite passada. Mantenha esse ritmo para o relógio biológico e a recuperação.',
  'sleepLogCard.coachMid':
    'Você dormiu {h} h, abaixo do recomendado (7–9 h). Tente dormir mais cedo ou faça um cochilo. Consistência importa em turnos.',
  'sleepLogCard.coachLowLead': 'Alerta de sono:',
  'sleepLogCard.coachLowRest':
    'Apenas {h} h na noite passada — bem abaixo do recomendado. Priorize dormir mais cedo e considere cochilo de 20–30 min se estiver cansado.',
  'sleepLogCard.durationM': '{m} min',

  'sleepFab.ariaAdd': 'Adicionar sono',

  'sleepSessionList.loading': 'Carregando sessões de sono…',
  'sleepSessionList.empty': 'Nenhuma sessão de sono neste dia.',
  'sleepSessionList.quality': 'Qualidade: {q}',

  'sleepShiftLog.timeline': 'Linha do tempo',
  'sleepShiftLog.hoursUnit': 'horas',
  'sleepShiftLog.oneSession': '1 sessão',
  'sleepShiftLog.nSessions': '{n} sessões',
  'sleepShiftLog.todaySleep': 'Sono de hoje ({start} – {end})',
  'sleepShiftLog.daySleep': '{date} ({start} – {end})',
  'sleepShiftLog.windowFallback': 'Sono de hoje (07:00 → 07:00)',
  'sleepShiftLog.noSleepYet': 'Nenhum sono registrado ainda',

  'sleepQuality.excellent': 'Excelente',
  'sleepQuality.good': 'Bom',
  'sleepQuality.fair': 'Razoável',
  'sleepQuality.poor': 'Ruim',
  'sleepQuality.veryPoor': 'Muito ruim',
  'sleep7.editAria': 'Editar',
  'sleep7.deleteAria': 'Excluir',
  'sleepForm.typeMain': 'Sono principal',
  'sleepForm.typeNap': 'Cochilo',
  'sleepForm.cancel': 'Cancelar',
  'sleepForm.save': 'Salvar',

  'sleepClassify.reasoning.day_sleep':
    'Sono diurno (4–8 h), típico após turno noturno.',
  'sleepClassify.reasoning.post_shift_recovery': 'Sono de recuperação após turno noturno.',
  'sleepClassify.reasoning.pre_shift_nap': 'Cochilo pré-turno para mais alerta.',
  'sleepClassify.reasoning.micro_nap': 'Cochilo curto para um rápido estímulo de energia.',
  'sleepClassify.reasoning.main_sleep': 'Sono principal no horário noturno típico.',
  'sleepClassify.reasoning.split_sleep': 'Possível padrão de sono dividido.',
  'sleepClassify.reasoning.irregular_sleep': 'O horário não segue padrões comuns de sono.',
}
