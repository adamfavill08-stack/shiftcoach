/** Sleep hub UI: ShiftWorkerSleepPage, overview card, 7-day bars, modals — merged in language-provider. */

import {
  sleepUiWorldDe,
  sleepUiWorldFr,
  sleepUiWorldPl,
  sleepUiWorldPtBR,
} from './sleepUiWorldBundles'

const sleepInsightEn: Record<string, string> = {
  'sleepInsight.nightEmpty':
    'Start with your post-shift sleep block to give the app a reliable recovery signal for this night-shift day.',
  'sleepInsight.defaultEmpty':
    "Start with your main sleep block or a recovery nap to improve today's body clock signal.",
  'sleepInsight.nightDebt':
    'You are carrying meaningful sleep debt before or after a night shift. Prioritize a protected recovery sleep block.',
  'sleepInsight.defaultDebt':
    'You are carrying meaningful sleep debt. Prioritize recovery sleep before your next demanding shift.',
  'sleepInsight.onlyNaps':
    'You have only logged naps so far. Add your main sleep block to improve guidance accuracy.',
  'sleepInsight.postShiftDominant':
    'Post-shift sleep is doing most of the work today. Keep logging it consistently after night shifts.',
  'sleepInsight.poorNight':
    'Your post-shift sleep timing looks off your rota. A more consistent daytime sleep window may improve recovery.',
  'sleepInsight.poorDefault':
    'Your sleep timing looks off your usual rhythm. A more consistent main sleep window may improve recovery.',
  'sleepInsight.manualSource':
    'Manual logging is active. Connecting a wearable can improve stage estimates and sync freshness.',
  'sleepInsight.targetNight':
    'You have met your target for this night-shift day. Keep logging to maintain accurate recovery guidance.',
  'sleepInsight.targetDefault':
    'You have met your target for this shifted day. Keep logging to maintain accurate recovery guidance.',
  'sleepInsight.gapNight':
    "A short pre-shift nap or longer post-shift recovery sleep could help close today's gap.",
  'sleepInsight.gapDefault': "A short nap or added recovery sleep could help close today's gap.",
}

export const sleepUiMessagesEn: Record<string, string> = {
  ...sleepInsightEn,
  'sleepSW.pageTitle': 'Sleep',
  'sleepSW.backHome': 'Back to home',
  'sleepSW.loading': 'Loading sleep data...',
  'sleepSW.metricsTitle': 'Sleep metrics',
  'sleepSW.metricsHeading': "Tonight's target & weekly overview",
  'sleepSW.tonightTarget': "Tonight's target",
  'sleepSW.tonightHint': 'Goal sleep for tonight based on your profile.',
  'sleepSW.consistency': 'Consistency',
  'sleepSW.consistencyLine': '{pct}/100 · main sleep rhythm',
  'sleepSW.deficit': 'Sleep deficit',
  'sleepSW.deficitAhead': '{h}h ahead',
  'sleepSW.deficitBehind': '{h}h behind',
  'sleepSW.deficitSubError': 'Weekly vs target (7-day).',
  'sleepSW.deficitSubAhead': 'Ahead of weekly sleep target.',
  'sleepSW.deficitSubBehind': 'Behind on weekly sleep target.',
  'sleepSW.consistencySub': 'Bedtime regularity from main sleep (last 7 days).',
  'sleepSW.consistencyNeedData': 'Log at least two main-sleep sessions to score consistency.',
  'sleepSW.stage.deep': 'Deep',
  'sleepSW.stage.rem': 'REM',
  'sleepSW.stage.light': 'Light',
  'sleepSW.stage.awake': 'Awake',
  'sleepSW.stageDesc.deep': 'Restorative sleep for physical recovery',
  'sleepSW.stageDesc.rem': 'Dream sleep for memory and learning',
  'sleepSW.stageDesc.light': 'Transitional sleep between stages',
  'sleepSW.stageDesc.awake': 'Brief awakenings during sleep',
  'sleepSW.debtNoData':
    'No sleep debt data yet. Log a few days of main sleep to unlock this view.',
  'sleepSW.debtWeeklyTitle': 'Weekly sleep debt',
  'sleepSW.debtWeeklySub': 'Based on your last 7 shifted days and ideal nightly target.',
  'sleepSW.behindAhead': 'Behind / ahead',
  'sleepSW.debtBanked': 'Sleep banked',
  'sleepSW.debtBankedMsg':
    'You are slightly ahead on sleep this week. Protect this buffer on heavy shift runs.',
  'sleepSW.debtMild': 'Mild sleep debt',
  'sleepSW.debtMildMsg':
    'You are only a little behind. One or two early nights or a recovery nap will catch you up.',
  'sleepSW.debtModerate': 'Moderate sleep debt',
  'sleepSW.debtModerateMsg':
    'Plan extra sleep blocks on off days and avoid stacking more night shifts if you can.',
  'sleepSW.debtHigh': 'High sleep debt',
  'sleepSW.debtHighMsg':
    'You are well behind on recovery. Treat this like a high‑risk week for fatigue and mistakes.',
  'sleepSW.timelineTitle': '24‑hour sleep timeline',
  'sleepSW.last30Title': 'Last 30 days',
  'sleepSW.last30Sub':
    'Pick a day to see if your sleep was enough for that shift, based on your profile.',
  'sleepSW.editLogs': 'Log sleep',
  'sleepSW.totalSleepShiftedDay': 'Total sleep that shifted day',
  'sleepSW.historyEmpty':
    'No sleep history in the last 30 days yet. Start logging to unlock guidance.',
  'sleepSW.stagesTitle': 'Sleep stages',
  'sleepSW.stagesSub': 'From wearable data or estimated from your latest sleep.',
  'sleepSW.rating.noneLabel': 'No sleep logged',
  'sleepSW.rating.noneMsg': 'Log your main sleep and naps to get guidance.',
  'sleepSW.rating.greatLabel': 'Doing great',
  'sleepSW.rating.greatMsg':
    'You hit or slightly exceeded your ideal sleep dose for your profile. Keep this pattern when you can.',
  'sleepSW.rating.okLabel': 'Okay, could be better',
  'sleepSW.rating.okMsg':
    'You are close to your ideal amount – another 30–60 minutes would really help recovery.',
  'sleepSW.rating.warnLabel': 'Falling behind',
  'sleepSW.rating.warnMsg':
    'You are short on sleep for your needs. Plan a recovery block or nap on your next off‑duty window.',
  'sleepSW.rating.badLabel': 'Running on fumes',
  'sleepSW.rating.badMsg':
    'Very short sleep for your profile. Treat today as high‑risk for fatigue, cravings and mistakes.',
  'sleepSW.weekMetricsError': 'Unable to load weekly sleep metrics.',
  'sleepSW.noWearable': 'No wearable is connected yet. Connect a provider in Wearables setup.',
  'sleepSW.syncFailed': 'Failed to sync wearables',
  'sleepSW.deleteSessionFailed': 'Failed to delete session',
  'sleepSW.loggedSessionsTitle': 'Your sleep entries',
  'sleepSW.loggedSessionsDropdown.summary': 'Your sleep entries ({count})',

  'sleepPlan.tabOverview': 'Overview',
  'sleepPlan.tabYourPlan': 'Your plan',
  'sleepPlan.title': 'Suggested plan',
  'sleepPlan.subtitle':
    'Educational only — not medical advice. Uses sleep logged for today (local calendar) and your rota, including the next shift after that sleep when available.',
  'sleepPlan.scopeLine': 'Today · {ymd} · your time zone',
  'sleepPlan.insufficient.noMain': 'Log a main sleep block for today (not only naps) to see a suggested plan.',
  'sleepPlan.insufficient.noShift':
    'We could not match your sleep to a work shift on your rota. Check that your shift calendar covers this day.',
  'sleepPlan.insufficient.noSessions': 'No sleep entries for today yet.',
  'sleepPlan.section.sleepWindow': 'Sleep window',
  'sleepPlan.section.latestCaffeine': 'Latest caffeine cutoff',
  'sleepPlan.caffeineSensitivity.heading': 'Caffeine sensitivity',
  'sleepPlan.caffeineSensitivity.help':
    'Latest caffeine is set before your planned sleep start: typical −6h, lower −4h, higher −8h (not tied to shift end).',
  'sleepPlan.caffeineOption.low': 'Lower',
  'sleepPlan.caffeineOption.medium': 'Typical',
  'sleepPlan.caffeineOption.high': 'Higher',
  'sleepPlan.section.napWindow': 'Nap window',
  'sleepPlan.section.lightExposure': 'Light exposure',
  'sleepPlan.section.recovery': 'Recovery',
  'sleepPlan.windowExplainer':
    'Main sleep starts as soon as it is realistic after your shift (commute home and a short wind-down), for up to your sleep goal, and ends before you would need to be up for your next shift. Times use a 24-hour clock. Modelled block: {hours} h.',
  'sleepPlan.windowExplainerNoWindow':
    'We could not draw a full sleep window yet — often because the next work shift is outside the loaded rota range, or the gap between wind-down and your next start is very tight. Check your rota ahead a few days.',
  'sleepPlan.light.body':
    'After your main sleep block: get outdoor or bright light when you wake to anchor alertness for the day. Before that sleep: dim screens and use warm, low light in the last 60–90 minutes of wind-down.',
  'sleepPlan.recovery.body':
    'Stacked shifts add up — keep meals aligned to your shift clock and avoid heavy alcohol before sleep; it fragments recovery sleep. Rotating nights ↔ days: move meal and light cues gradually across changeovers where you can.',
  'sleepPlan.recovery.tightTurnaround':
    'Turnaround is tight — protect the sleep window you have, hydrate, and treat the pre-shift hour as prep time rather than cramming chores.',
  'sleepPlan.nap.whenApprox':
    '~{start} – {end} (optional nap about {napMin} min; ends about {beforeShift} min before shift start)',
  'sleepPlan.nap.none': 'No nap window suggested — either the sleep opportunity already meets your goal or the gap is too small.',
  'sleepPlan.feedbackDropdown.summary': 'Plan notes ({count})',
  'sleepPlan.feedback.overlap_shift': 'Logged sleep overlaps your previous work shift on the timeline we used.',
  'sleepPlan.feedback.shorter_than_planned': 'Logged sleep was shorter than the modelled window for your next shift.',
  'sleepPlan.feedback.wake_close_next_shift': 'Wake time is very close to when you would need to be up for the next shift.',
  'sleepPlan.feedback.missing_next_shift': 'No upcoming work shift found in your rota range — latest wake time is open-ended.',
  'sleepPlan.feedback.missing_prior_shift': 'No matching prior shift (informational).',
  'sleepPlan.feedback.tight_recovery_window':
    'Your rota leaves limited time between the shift that ended and the next one — the model shortens the sleep window to what fits safely. This is for planning, not a medical judgement.',
  'sleepPlan.feedback.tight_recovery_before_night':
    'This rota gives a tight recovery window before your night shift. The plan prioritises what can fit without overlapping work — for planning only, not a medical judgement.',
  'sleepPlan.feedback.pre_night_plan_split':
    'Because your next shift is a night shift, this plan uses a normal evening sleep plus a pre-shift nap when timing allows.',
  'sleepPlan.feedback.pre_night_avoid_rush_bed':
    'This avoids sending you to bed immediately after your day shift, which is unrealistic for most people.',
  'sleepPlan.feedback.pre_night_nap_timing':
    'Your pre-night nap is designed to finish before the shift so you are not waking too close to work.',
  'sleepPlan.feedback.pre_night_nap_adjusted':
    'The pre-shift nap window was shortened or moved so it does not overlap your main sleep, commute or prep time, or logged sleep.',
  'sleepPlan.feedback.sleep_debt_earlier_recovery':
    'You are carrying substantial sleep debt, so an earlier main-sleep start was allowed where the schedule still fits.',
  'sleepPlan.feedback.open_ended_recovery':
    'No next work shift is in the loaded rota range, so recovery sleep is not capped on the far side — we model a reasonable block after commute and wind-down only.',
  'sleepPlan.howTitle': 'How this was calculated',
  'sleepPlan.howToggleShow': 'Show details',
  'sleepPlan.howToggleHide': 'Hide details',
  'sleepPlan.calc.noMainSleep': 'No main sleep interval to analyse.',
  'sleepPlan.calc.needShiftBeforeSleep': 'Need a work shift on your rota that ends before (or overlaps) your sleep start.',
  'sleepPlan.calc.shiftEnd': 'Start from your previous shift end time.',
  'sleepPlan.calc.commuteHome': 'Add commute home (capped).',
  'sleepPlan.calc.windDown': 'Add a wind-down buffer before sleep.',
  'sleepPlan.calc.preNightEvening':
    'When your next duty is a night shift, earliest bed is not right at shift end — you get a realistic evening first; the model also aims for about 8–9 hours before that night block when the window allows.',
  'sleepPlan.calc.preNightEveningFloor':
    'A local evening “earliest bed” floor is applied before the night shift when the gap allows — later when there is a long gap until that night start, earlier only if sleep debt is high or the recovery window is genuinely tight.',
  'sleepPlan.calc.preNightEveningRelaxed':
    'The evening bed floor was relaxed so you can still fit at least a minimum main sleep before the night block.',
  'sleepPlan.calc.tightBeforeNight':
    'Same-calendar-day day work into a night start: recovery time is short, so the plan focuses on what can fit and flags the squeeze.',
  'sleepPlan.calc.sleepDebtEveningRelax':
    'Higher sleep debt relaxes the usual evening bed floor so recovery can start earlier when it still fits safely.',
  'sleepPlan.calc.preNightOff':
    'Rest day before a night block: we do not anchor bed to the start of the day off — the window is placed around realistic main sleep before that night, with an optional pre-shift nap if useful.',
  'sleepPlan.calc.preNightLongGap':
    'Long gap before sleep and a night shift ahead: earliest bed is nudged toward your logged sleep day so the model does not sit weeks in the past on the timeline.',
  'sleepPlan.calc.preNightTargetBand':
    'When there is enough room before the night shift, the model uses about 8–9 hours as a typical main-sleep aim (still clamped to what actually fits).',
  'sleepPlan.calc.preNightSplit':
    'Pre-night pattern: main sleep plus an optional pre-shift nap. Nap timing is derived from your next night shift start (wake buffer and nap length), not fixed clock guesses.',
  'sleepPlan.calc.preNightNapDynamic':
    'Pre-shift nap window is placed from your next night shift start minus a wake buffer, with length capped by what fits around main sleep and logged sleep.',
  'sleepPlan.calc.preNightNapBeforeMain':
    'When the gap is tight, the nap may sit after your day shift and before main evening sleep so it does not collide with the main sleep block.',
  'sleepPlan.calc.preNightNapShortened':
    'The pre-shift nap was shortened or shifted so it stays clear of main sleep, commute or prep, and the night shift itself.',
  'sleepPlan.calc.caffeinePreNight':
    'Caffeine cutoff is taken as the earlier of “before main sleep” and “before any suggested pre-shift nap”.',
  'sleepPlan.calc.tightTurnaround':
    'Turnaround between shifts is short on the timeline we used — the plan prioritises a feasible window and flags the squeeze.',
  'sleepPlan.calc.openEndedRecovery':
    'Without a next shift in range, recovery length uses your sleep goal up to a sensible maximum after wind-down — not stretched to an artificial far wake.',
  'sleepPlan.calc.nextShift': 'Use your next scheduled shift start from the rota (not a fixed +24 h guess).',
  'sleepPlan.calc.prepCommute': 'Subtract prep time and commute to work (capped) for latest wake.',
  'sleepPlan.calc.noNextShift': 'No next shift in range — cannot cap the sleep window.',
  'sleepPlan.calc.windowFit': 'Fit your sleep goal inside the available window (clamped to minimums where needed).',
  'sleepPlan.calc.noRoom': 'Not enough time between realistic sleep start and next shift — modelled sleep may be very short.',
  'sleepPlan.calc.caffeine':
    'Caffeine cutoff uses your sensitivity setting before the suggested main sleep start (and before a pre-shift nap when one is suggested).',
  'sleepPlan.calc.nap': 'Shortfall vs goal suggests an optional short nap before the next shift, when timing allows.',
  'sleepPlan.transition.unavailable': 'Transition type could not be determined from the available data.',
  'sleepPlan.transition.dayish_work_to_night':
    'Pattern: day-type work then a night block — we allow a normal evening before bed, aim for a fuller main sleep when the window allows, and may suggest a pre-shift nap.',
  'sleepPlan.transition.off_to_night':
    'Pattern: rest or off day before a night shift — bed is not modelled at the start of the day off; sleep is placed before the night block with optional nap support.',
  'sleepPlan.transition.early_to_night':
    'Pattern: early start then a night block — we avoid pushing sleep immediately after the early finish when a night follows; split recovery (main sleep + optional nap) is considered.',
  'sleepPlan.transition.late_to_early':
    'Pattern: late or evening-type start then an early start — turnaround may be tight; the plan fits what is safely possible and flags limited recovery time.',
  'sleepPlan.transition.night_to_night':
    'Pattern: night block followed by another night — main recovery sleep is modelled after your shift end as usual; a short pre-shift nap may help if you are short of your goal.',
  'sleepPlan.transition.night_to_off':
    'Pattern: night shift with no next work shift in range — recovery sleep is modelled after commute and wind-down without an artificial far wake cap.',
  'sleepPlan.transition.night_to_day':
    'Pattern: night shift into a day-type start — watch for a tight gap; the model shortens the window to what fits and warns when recovery time is limited.',
  'sleepPlan.transition.no_next_shift':
    'No upcoming work shift is in the loaded rota — the plan uses an open-ended recovery block after wind-down (educational only).',
  'sleepPlan.transition.other':
    'General shift spacing — standard commute, wind-down, and next-shift prep rules apply.',
  'sleepPlan.value.notApplicable': '—',
  'sleepPlan.disclaimerShort':
    'For education and wellbeing planning only. If you have a sleep disorder, pregnancy, or health concerns, speak with a qualified clinician.',
  'sleepPlan.sensitivity.low': 'lower sensitivity — earlier cutoff relative to sleep',
  'sleepPlan.sensitivity.medium': 'medium sensitivity',
  'sleepPlan.sensitivity.high': 'higher sensitivity — stop caffeine earlier',
  'sleepPlan.rota.shiftEnded': 'Previous shift ({label}) ended {time}.',
  'sleepPlan.rota.nextShift': 'Next shift ({label}) starts {time}.',
  'sleepPlan.rota.nextShiftUnknown': 'Next shift not in loaded rota range.',

  'sleepSW.motivate.title': 'A note for you',
  'sleepSW.motivate.noSleep':
    '{name}, when you log your main sleep we can tailor this message to how you are really doing. Your recovery story starts with one honest entry.',
  'sleepSW.motivate.highDebt':
    '{name}, you are short on sleep versus your goal for this shifted day. Block time for recovery sleep soon — your next shift will feel the difference.',
  'sleepSW.motivate.moderateDebt':
    '{name}, you are carrying some sleep debt today. Even an extra 30–60 minutes of protected sleep or a planned nap can help you catch up.',
  'sleepSW.motivate.ahead':
    '{name}, you have met or passed your sleep target for this day. That is strong groundwork — keep protecting those windows when work gets intense.',
  'sleepSW.motivate.strong':
    '{name}, you are close to your ideal sleep for today. Small consistent wins like this are what shift workers bank for the hard weeks.',
  'sleepSW.motivate.onTrack':
    '{name}, you are in a solid range for today. Staying near your target through changing shifts is the real win — keep going.',
  'sleepSW.motivate.catchUp':
    '{name}, you are close but carrying a little sleep debt. A slightly earlier wind-down or a short recovery nap can put you back in the green.',
  'sleepSW.motivate.low':
    '{name}, sleep is quite short versus what your profile suggests. Treat rest as safety today — lighter plans where you can, and sleep before the next heavy run.',
  'sleepSW.motivate.fallbackName': 'there',

  'sleepCard.last7': 'Last 7 days',
  'sleepCard.chartSub': 'Last 7 local days ending today · {target} h target',
  'sleepCard.chartSummarySegment': '{date}: {hours}',
  'sleepCard.chartHoursLabel': '{n} h',
  'sleepCard.selectedDay': 'Selected day:',
  'sleepCard.pctOfTarget': '({pct}% of target)',
  'sleepCard.sourceNoneLogged': 'No sleep logged yet',
  'sleepCard.dashboardTodaySleep': "Last night's sleep",
  'sleepCard.sourceNoData': 'No source data',
  'sleepCard.sourceManual': 'Manual data',
  'sleepCard.sourceWearable': 'Wearable data',
  'sleepCard.sourceMixed': 'Mixed data',
  'sleepCard.syncManualOnly': 'Manual only',
  'sleepCard.syncAwaiting': 'Awaiting first sync',
  'sleepCard.hcSleepPermissionHint': 'Sleep permission is not enabled in Health Connect.',
  'sleepCard.hcNoSleepRecordsHint': 'No Health Connect sleep records found yet.',
  'sleepCard.syncJustNow': 'Last sync just now',
  'sleepCard.syncMinAgo': 'Last sync {m}m ago',
  'sleepCard.syncHoursAgo': 'Last sync {h}h ago',
  'sleepCard.syncDaysAgo': 'Last sync {d}d ago',
  'sleepCard.warnStale': "Wearable sync delayed. Sync now to keep today's totals accurate.",
  'sleepCard.btnSyncing': 'Syncing…',
  'sleepCard.btnSyncNow': 'Sync now',
  'sleepCard.btnLogSleep': 'Log sleep',
  'sleepCard.btnAddSleep': 'Add sleep',
  'sleepCard.btnEditLogs': 'Log sleep',
  'sleepCard.btnLogManually': 'Log manually',
  'sleepCard.btnEditToday': 'Edit sleep',
  'sleepCard.hl.logPostShift': 'Log post-shift sleep',
  'sleepCard.hl.postRecovery': 'Post-shift recovery needed',
  'sleepCard.hl.recoveryBelow': 'Recovery day - below target',
  'sleepCard.hl.logYourSleep': 'Log your sleep',
  'sleepCard.hl.belowTarget': 'Below target for today',
  'sleepCard.hl.progressing': 'Progressing toward target',
  'sleepCard.hl.onTrack': 'On track for today',
  'sleepCard.hl.recoveryCovered': 'Recovery needs covered',
  'sleepCard.hl.overview': 'Sleep overview',
  'sleepCard.sub.noSleep':
    'No sleep logged yet for this day. Log main sleep or naps to keep your body clock accurate.',
  'sleepCard.sub.nightLogged':
    "Post-shift sleep logged. You've recorded {primary} primary sleep and {naps} naps.",
  'sleepCard.sub.debt':
    "You've logged {primary} of primary sleep and {naps} of naps. Recovery sleep is recommended to close your debt.",
  'sleepCard.sub.onlyNaps': "Only naps are logged so far. You've logged {naps} of naps today.",
  'sleepCard.sub.postShiftDom':
    "Post-shift sleep is the main contributor today. You've logged {primary} of primary sleep and {naps} of naps.",
  'sleepCard.sub.recoveryDom':
    "Recovery sleep is leading today. You've logged {primary} of primary sleep and {naps} of naps.",
  'sleepCard.sub.mainDom':
    "Primary sleep is logged. You've logged {primary} of primary sleep and {naps} of naps today.",
  'sleepCard.sub.default':
    "You've logged {primary} of primary sleep and {naps} of naps today.",
  'sleepCard.primarySleep': 'Primary sleep',
  'sleepCard.naps': 'Naps',
  'sleepCard.primaryType': 'Primary type',
  'sleepCard.lastSync': 'Last sync',
  'sleepCard.recoveryNeed': 'Recovery need',
  'sleepCard.recoveryLoading': 'Loading',
  'sleepCard.recoveryNeeded': '{time} recovery needed',
  'sleepCard.recoveryCoveredLabel': 'Recovery covered',
  'sleepCard.timingLabel': 'Timing alignment:',
  'sleepCard.timingNone': 'Not enough data',
  'sleepCard.timingGood': 'Good for this shift',
  'sleepCard.timingOk': 'Acceptable for this shift',
  'sleepCard.timingPoor': 'Off for this shift',
  'sleepCard.typeNone': 'None',
  'sleepCard.durationHM': '{h}h {m}m',

  'sleep7.loading': 'Loading sleep data...',
  'sleep7.header': 'Last 7 days',
  'sleep7.sub': 'Sleep duration and quality',
  'sleep7.empty': 'No sleep data yet. Log your sleep to see it here.',
  'sleep7.today': 'Today',
  'sleep7.yesterday': 'Yesterday',
  'sleep7.editSub': 'Edit sleep for this day',
  'sleep7.loadingSessions': 'Loading sessions...',
  'sleep7.noSessions': 'No sleep sessions logged for this day.',
  'sleep7.addSleep': 'Add sleep for this day',
  'sleep7.editAria': 'Edit',
  'sleep7.deleteAria': 'Delete',
  'sleep7.errDelete': 'Failed to delete session',
  'sleep7.errSave': 'Failed to save session',

  'sleepForm.errStartEnd': 'Please provide both start and end dates and times.',
  'sleepForm.errEndAfter': 'End time must be after start time.',
  'sleepForm.errSave': 'Failed to save session',
  'sleepForm.editTitle': 'Edit Sleep Session',
  'sleepForm.addTitle': 'Add Sleep Session',
  'sleepForm.startLabel': 'START',
  'sleepForm.endLabel': 'END',
  'sleepForm.typeLabel': 'TYPE',
  'sleepForm.typeMain': 'Main Sleep',
  'sleepForm.typeNap': 'Nap',
  'sleepForm.cancel': 'Cancel',
  'sleepForm.saving': 'Saving...',
  'sleepForm.save': 'Save',

  'sleepLog.title': 'Log sleep',
  'sleepLog.qualityLabel': 'QUALITY',
  'sleepLog.notesLabel': 'NOTES',
  'sleepLog.notesPlaceholder': 'Anything to remember about this sleep?',
  'sleepLog.errInvalid': 'Invalid date or time',
  'sleepLog.errEndAfter': 'End time must be after start time',
  'sleepLog.errMin10': 'Sleep session must be at least 10 minutes',
  'sleepLog.errMax24': 'Sleep session cannot be longer than 24 hours',
  'sleepLog.errSave': 'Failed to save sleep',
  'sleepEdit.saveChanges': 'Save Changes',
  'sleepEdit.deleteSession': 'Delete session',
  'sleepEdit.confirmDelete': 'Confirm delete',
  'sleepEdit.deleteWarnTitle': 'Are you sure you want to delete this sleep session?',
  'sleepEdit.deleteWarnBody':
    'This will update your 7-day bars, sleep summary, and body clock calculations.',
  'sleepEdit.errUpdate': 'Failed to update sleep',
  'sleepEdit.errDelete': 'Failed to delete sleep',
  'sleepEdit.dateTimePreview': '{date} at {time}',
  'sleepQuality.excellent': 'Excellent',
  'sleepQuality.good': 'Good',
  'sleepQuality.fair': 'Fair',
  'sleepQuality.poor': 'Poor',

  'sleepDel.title': 'Delete sleep entry?',
  'sleepDel.body':
    'This will remove this sleep log and update your sleep and Shift Rhythm calculations.',
  'sleepDel.cancel': 'Cancel',
  'sleepDel.confirm': 'Delete',
  'sleepDel.deleting': 'Deleting...',
  'sleepDel.closeAria': 'Close',
  'sleepCard.ariaChart': 'Sleep hours last seven local days. {summary}',
  'sleepCard.ariaChartTarget': 'Green dotted line shows target {hours}.',
  'sleepCard.barTotalTitle': '{date}: {h}h total sleep',
  'sleepCard.dayTotalCaption': 'Total sleep time',
  'sleepCard.dayTotalHrsShort': 'hrs',
  'sleepCard.dayTotalMinsShort': 'mins',

  'sleepType.main_sleep': 'Main sleep',
  'sleepType.post_shift_sleep': 'Post-shift sleep',
  'sleepType.recovery_sleep': 'Recovery sleep',
  'sleepType.nap': 'Nap',
  'sleepType.default': 'Sleep',

  'sleepLogs.pageTitle': 'Sleep history',
  'sleepLogs.emptyTitle': 'No sleep logs found',
  'sleepLogs.emptyBody': 'Start logging your sleep to see it here',
  'sleepLogs.dayNoSleep': 'No sleep logged',
  'sleepLogs.totalLine': '{duration} total',
  'sleepLogs.shiftOff': 'OFF',
  'sleepLogs.editAria': 'Edit sleep entry',
  'sleepLogs.deleteAria': 'Delete sleep entry',
  'sleepLogs.backAria': 'Back',
  'sleepLogs.timeRange': '{start} – {end}',
  'sleepLogs.duration0': '0h',
  'sleepLogs.durationH': '{h}h',
  'sleepLogs.durationHM': '{h}h {m}m',
  'sleepLogs.errDeleteAlert': 'Failed to delete sleep log. Please try again.',
  'sleepLogs.errDeleteWithStatus': 'Failed to delete ({status})',
  'sleepLogs.errParseResponse': 'Failed to parse response',

  'sleepOverview.pageTitle': 'Sleep overview',
  'sleepOverview.subtitle': 'Analysis and recommendations based on your data',
  'sleepOverview.loading': 'Analyzing your sleep data…',
  'sleepOverview.errLoad': 'Failed to load sleep overview',
  'sleepOverview.errFetch': 'Failed to fetch overview: {status}',
  'sleepOverview.sectionOverview': 'Overview',
  'sleepOverview.sectionInsights': 'Key insights',
  'sleepOverview.sectionRecommendations': 'Shift Coach recommendations',
  'sleepOverview.sectionIssues': 'Potential issues',
  'sleepOverview.sectionStatsTitle': 'Sleep statistics (last 7 days)',
  'sleepOverview.statTotalSleep': 'Total sleep',
  'sleepOverview.statDailyAvg': 'Daily average',
  'sleepOverview.statDaysLogged': 'Days logged',
  'sleepOverview.statConsistency': 'Consistency',
  'sleepOverview.bestDay': 'Best day',
  'sleepOverview.worstDay': 'Worst day',
  'sleepOverview.sectionDailyBreakdown': 'Daily sleep breakdown',
  'sleepOverview.qualityLine': 'Quality: {q}',
  'sleepOverview.sectionMetrics': 'Overall metrics',
  'sleepOverview.metricBodyClock': 'Body clock score',
  'sleepOverview.metricRecovery': 'Recovery score',
  'sleepOverview.metricMood': 'Mood',
  'sleepOverview.metricFocus': 'Focus',
  'sleepOverview.metricCurrentShift': 'Current shift',
  'sleepOverview.metricSleep24h': 'Sleep (24h)',
  'sleepOverview.sectionCircadian': 'Circadian & sleep health',
  'sleepOverview.circadianPhase': 'Circadian phase',
  'sleepOverview.factorSleepDebt': 'Sleep debt impact',
  'sleepOverview.factorTiming': 'Timing alignment',
  'sleepOverview.factorConsistency': 'Consistency',
  'sleepOverview.weeklyDeficit': 'Weekly sleep deficit',
  'sleepOverview.deficitCategory.high': 'High',
  'sleepOverview.deficitCategory.medium': 'Medium',
  'sleepOverview.deficitCategory.low': 'Low',
  'sleepOverview.sectionLastNight': "Last night's sleep",
  'sleepOverview.duration': 'Duration',
  'sleepOverview.quality': 'Quality',
  'sleepOverview.sleepStages': 'Sleep stages',
  'sleepOverview.lastNightEmpty': 'No sleep logged for last night',

  'sleepHistMgr.title': 'Edit sleep logs',
  'sleepHistMgr.subtitle': 'Review and correct the last 30 days of logged sleep.',
  'sleepHistMgr.backAria': 'Back to sleep',
  'sleepHistMgr.errLoad': 'Failed to load sleep history',
  'sleepHistMgr.errDelete': 'Failed to delete sleep log',
  'sleepHistMgr.empty': 'No sleep logs found for the last 30 days.',
  'sleepHistMgr.edit': 'Edit',
  'sleepHistMgr.delete': 'Delete',
  'sleepHistMgr.dayTotal': '{h}h total',
  'sleepQuality.veryPoor': 'Very poor',

  'sleepEditLegacy.title': 'Edit sleep or nap',
  'sleepEditLegacy.deleteConfirm':
    'Are you sure you want to delete this sleep log? This cannot be undone.',
  'sleepEditLegacy.deleteEntry': 'Delete entry',

  'sleepLog.logNap': 'Log nap',
  'sleepLog.startShort': 'Start',
  'sleepLog.endShort': 'End',
  'sleepLog.qualityShort': 'Quality',
  'sleepLog.errStartEndTimes': 'Please provide both start and end times',
  'sleepLog.notesOptional': 'Notes (optional)',

  'sleepJetlag.sectionLabel': 'Social jetlag',
  'sleepJetlag.heading': 'Sleep timing alignment',
  'sleepJetlag.errNeedData': 'Log at least 2 days of main sleep to calculate social jetlag.',
  'sleepJetlag.errLoad': 'Unable to load social jetlag data.',
  'sleepJetlag.currentMisalignment': 'Current misalignment',
  'sleepJetlag.weeklyAvg': 'Weekly avg: {h} h',
  'sleepJetlag.hoursUnit': '{h} h',
  'sleepJetlag.noData': 'No data available',
  'sleepJetlag.category.low': 'Low',
  'sleepJetlag.category.moderate': 'Moderate',
  'sleepJetlag.category.high': 'High',
  'sleepJetlag.errorStateTitle': 'Social jetlag',

  'sleepInsightCard.label': 'Sleep insight',
  'sleepInsightCard.boostTitle': 'How to boost rhythm / recovery:',

  'sleepPage.percentOfGoal': '{pct}% of goal',
  'sleepPage.summaryWithGoal': '{h}h {m}m – {pct}% of your goal',
  'sleepPage.stagesKicker': 'Sleep stages',
  'sleepPage.lastNightHeading': 'Last night you slept',
  'sleepPage.logSleepHeading': 'Log your sleep',
  'sleepPage.sourceLine': 'Source: Google Fit & ShiftCoach',
  'sleepPage.insightHeading': 'What to aim for',
  'sleepPage.insightBody':
    'On shift days, protect your first sleep cycle — that’s when deep sleep is most likely.',
  'sleepPage.shiftCoachTip':
    'Keep your sleep schedule as consistent as you can — it helps anchor your body clock across shift changes.',
  'sleepPage.sleepOverviewCta': 'Sleep overview',
  'sleepPage.shiftCoachAlt': 'Shift Coach',
  'sleepPage.shiftCoachLabel': 'Shift Coach',
  'sleepPage.disclaimer':
    'Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.',
  'sleepPage.errFetchSummary': 'Failed to fetch sleep data',
  'sleepPage.errLoadSummary': 'Failed to load sleep data',
  'sleepPage.errDeleteSession': 'Failed to delete session',
  'sleepPage.errParseResponse': 'Failed to parse response',
  'sleepPage.syncNotYet': 'Last sync: not yet',
  'sleepPage.syncJustNow': 'Last sync: just now',
  'sleepPage.syncMinAgo': 'Last sync: {m} min ago',
  'sleepPage.syncHoursAgo': 'Last sync: {h} h ago',
  'sleepPage.syncDaysAgo': 'Last sync: {d} day ago',
  'sleepPage.syncDaysAgoPlural': 'Last sync: {d} days ago',

  'sleepCombo.deficitNoData': 'No data',
  'sleepCombo.deficitOnTrack': 'On track',
  'sleepCombo.deficitNeedsAttention': 'Needs attention',
  'sleepCombo.deficitHigh': 'High deficit',
  'sleepCombo.consistencyNoData': 'Not enough data',
  'sleepCombo.consistencyGood': 'Good consistency',
  'sleepCombo.consistencyModerate': 'Moderate consistency',
  'sleepCombo.consistencyLow': 'Low consistency',
  'sleepCombo.shiftNightGood': 'Good for night shift',
  'sleepCombo.shiftDayExcellent': 'Excellent for day shift',
  'sleepCombo.shiftOffRecovery': 'Good recovery pattern',
  'sleepCombo.tipBedtime': 'Try to keep bedtime within 1–2 hours of your usual time.',
  'sleepCombo.tipDeficitHigh': 'Focus on getting 7–8 hours of sleep tonight.',
  'sleepCombo.tipAvgLow': 'Aim for at least 7 hours of sleep per night.',
  'sleepCombo.tipNightShift': 'Night shift workers benefit from consistent daytime sleep schedules.',
  'sleepCombo.deficitBehindWeekly': 'Behind weekly target',
  'sleepCombo.deficitAheadWeekly': 'Ahead of weekly target',
  'sleepCombo.deficitLabelNoData': 'Not enough data',
  'sleepCombo.avgSleep': 'Avg: {h}h',
  'sleepCombo.scoreWord': 'score',
  'sleepCombo.quickTipTitle': 'Quick tip',
  'sleepCombo.infoAria': 'Learn more about sleep metrics',

  'sleepMetricsInfo.title': 'Sleep metrics explained',
  'sleepMetricsInfo.subtitle': 'Understanding your sleep data',
  'sleepMetricsInfo.suggestionsEmpty': 'No suggestions available at this time.',
  'sleepMetricsInfo.suggestionsLoadError':
    'Unable to load personalized suggestions. Please try again later.',
  'sleepMetricsInfo.sectionTargetIntro':
    'This is your recommended sleep duration for tonight, calculated based on:',
  'sleepMetricsInfo.sectionTargetBullet1':
    'Your current sleep deficit (how far behind or ahead you are on weekly sleep)',
  'sleepMetricsInfo.sectionTargetBullet2': 'Your upcoming shift type (night, day, or off)',
  'sleepMetricsInfo.sectionTargetBullet3':
    'Your base sleep need (typically 7.5 hours for most shift workers)',
  'sleepMetricsInfo.sectionTargetFoot':
    'The target adjusts to help you catch up on sleep debt or maintain your rhythm, tailored to your shift schedule.',
  'sleepMetricsInfo.consistencyIntro':
    'This score (0-100) measures how regular your bedtime is across the last 7 days:',
  'sleepMetricsInfo.consistencyB1':
    '{range} Very consistent bedtimes (ideal for shift workers)',
  'sleepMetricsInfo.consistencyB2':
    '{range} Moderately consistent (some variation is normal with shift changes)',
  'sleepMetricsInfo.consistencyB3':
    '{range} High variation in bedtimes (may impact recovery)',
  'sleepMetricsInfo.consistencyFoot':
    'Calculated from the standard deviation of your main sleep bedtimes. Lower variation = higher score.',
  'sleepMetricsInfo.consistencyShiftNote':
    'For shift workers, some variation is expected when switching between day and night shifts. The goal is to maintain consistency within each shift type.',
  'sleepMetricsInfo.deficitIntro':
    'This shows how far behind or ahead you are on your weekly sleep target:',
  'sleepMetricsInfo.deficitB1':
    '{label} You are behind your weekly target (need more sleep)',
  'sleepMetricsInfo.deficitB2':
    '{label} You are ahead of your weekly target (sleep surplus)',
  'sleepMetricsInfo.deficitB3':
    'Calculated from the last 7 days of sleep vs. your weekly target (typically 52.5 hours for 7.5h × 7 days)',
  'sleepMetricsInfo.deficitFoot':
    'Categories: Surplus/Low (on track), Medium (needs attention), High (prioritize recovery).',
  'sleepMetricsInfo.personalizedTitle': 'Personalized suggestions',
  'sleepMetricsInfo.generating': 'Generating suggestions…',
  'sleepMetricsInfo.suggestionsUnavailable': 'Unable to load suggestions at this time.',
  'sleepMetricsInfo.gotIt': 'Got it',
  'sleepMetricsInfo.range80100': '80-100:',
  'sleepMetricsInfo.range6079': '60-79:',
  'sleepMetricsInfo.rangeBelow60': 'Below 60:',
  'sleepMetricsInfo.positiveLabel': 'Positive number:',
  'sleepMetricsInfo.negativeLabel': 'Negative number:',
  'sleepMetricsInfo.notePrefix': 'Note:',

  'sleepQualityChart.kicker': 'Sleep quality',
  'sleepQualityChart.title': 'Sleep quality',
  'sleepQualityChart.infoAria': 'Info about sleep quality',
  'sleepQualityChart.errLoad': 'Failed to load sleep quality data',
  'sleepQualityChart.emptyTitle': 'No sleep data available',
  'sleepQualityChart.emptyBody': 'Log sleep to see your quality metrics',
  'sleepQualityChart.labelDuration': 'Sleep duration',
  'sleepQualityChart.labelTimeAsleep': 'Time asleep',
  'sleepQualityChart.labelEfficiency': 'Sleep efficiency',
  'sleepQualityChart.modalSubtitle': 'Understanding your sleep metrics',
  'sleepQualityChart.closeAria': 'Close',
  'sleepQualityChart.whatIsTitle': 'What is sleep quality?',
  'sleepQualityChart.whatIsBody':
    'Your sleep quality score (0-100) reflects how well you slept based on your quality rating, sleep efficiency, and time asleep.',
  'sleepQualityChart.explainDuration':
    'The total time you spent in bed, from when you went to sleep until you woke up.',
  'sleepQualityChart.explainTimeAsleep':
    'The actual time you were asleep, excluding any time spent awake during the night.',
  'sleepQualityChart.explainEfficiency':
    'The percentage of time in bed that you were actually asleep. Higher is better — aim for 85% or more.',
  'sleepQualityChart.improveTitle': 'How to improve',
  'sleepQualityChart.improve1': 'Maintain a consistent sleep schedule, even on days off',
  'sleepQualityChart.improve2': 'Create a dark, quiet, and cool sleep environment',
  'sleepQualityChart.improve3': 'Avoid screens and bright lights 1-2 hours before bed',
  'sleepQualityChart.improve4': 'Limit caffeine and heavy meals close to bedtime',
  'sleepQualityChart.improve5': 'Use blackout curtains and eye masks for daytime sleep',

  'sleepLogList.kicker': 'Sleep log',
  'sleepLogList.title': 'Recent sleep sessions',
  'sleepLogList.viewLogs': 'View logs',
  'sleepLogList.emptyTitle': 'No sleep logged yet',
  'sleepLogList.viewAll': 'View all sleep logs',

  'socialJetlagInfo.title': 'Social jetlag explained',
  'socialJetlagInfo.subtitle': 'Understanding your sleep timing shift',
  'socialJetlagInfo.s1Title': 'What is social jetlag?',
  'socialJetlagInfo.s1p1':
    'Social jetlag measures how much your current sleep timing has shifted away from your usual sleep pattern. For shift workers, this is especially important because your sleep schedule naturally changes when you switch between day and night shifts.',
  'socialJetlagInfo.s1p2':
    'Unlike regular jetlag from travel, social jetlag happens when your body clock gets out of sync with your usual rhythm due to shift changes, irregular schedules, or lifestyle factors.',
  'socialJetlagInfo.s2Title': 'How it’s calculated',
  'socialJetlagInfo.s2Intro': 'ShiftCoach calculates social jetlag using your sleep data:',
  'socialJetlagInfo.s2b1':
    'Groups your sleep by “ShiftCoach days” (07:00 → 07:00, not midnight to midnight)',
  'socialJetlagInfo.s2b2':
    'For each day, calculates your sleep midpoint (halfway between your first sleep start and last sleep end)',
  'socialJetlagInfo.s2b3':
    'Establishes a baseline from the median midpoint of your previous 7–10 stable days',
  'socialJetlagInfo.s2b4':
    'Compares today’s midpoint to your baseline to find the misalignment in hours',
  'socialJetlagInfo.dataBoxTitle': 'Your current data',
  'socialJetlagInfo.baselineMid': 'Baseline midpoint: {time}',
  'socialJetlagInfo.currentMid': 'Current midpoint: {time}',
  'socialJetlagInfo.misalignmentHours': 'Misalignment: {h} hours',
  'socialJetlagInfo.s3Title': 'Score categories',
  'socialJetlagInfo.catLowTitle': 'Low (0–1.5h):',
  'socialJetlagInfo.catLowBody':
    'Your sleep timing has stayed close to your usual rhythm. This is ideal for maintaining your body clock.',
  'socialJetlagInfo.catModTitle': 'Moderate (1.5–3.5h):',
  'socialJetlagInfo.catModBody':
    'Your sleep midpoint has shifted noticeably, likely due to recent shift changes. Some adjustment may be needed.',
  'socialJetlagInfo.catHighTitle': 'High (>3.5h):',
  'socialJetlagInfo.catHighBody':
    'Your body clock is significantly shifted from your usual pattern. This often happens after switching between day and night shifts.',
  'socialJetlagInfo.s3Foot':
    'For shift workers, some variation is normal when switching shifts. The goal is to minimize large swings and help your body adapt more smoothly.',

  'sleepTimeline.noSleepYet': 'No sleep logged for this shifted day yet.',
  'sleepTimeline.shifted24h': 'Shifted 24h timeline',
  'sleepTimeline.shiftPrefix': 'Shift:',
  'sleepTimeline.todayLegend': 'Today:',
  'sleepTimeline.sumNightPostFrag':
    'Longest sleep occurred after your shift; sleep is split across multiple blocks.',
  'sleepTimeline.sumNightPost': 'Longest sleep occurred after your shift.',
  'sleepTimeline.sumNightOffFrag':
    'Longest sleep was outside a typical post-shift window; sleep is split across multiple blocks.',
  'sleepTimeline.sumNightOff': 'Longest sleep was outside a typical post-shift window.',
  'sleepTimeline.sumDefaultFrag':
    'Sleep is split across multiple blocks; longest block is highlighted.',
  'sleepTimeline.sumDefault': 'Longest sleep block is highlighted for quick review.',
  'sleepTimeline.sumMulti': 'Sleep is split across multiple blocks.',
  'sleepTimeline.sumSingle': 'Single sleep block logged in this shifted day.',
  'sleepTimeline.sessionTooltip': '{type} · {start}–{end} ({h} h)',

  'shiftLag.kicker': 'ShiftLag',
  'shiftLag.title': 'Jet lag from your shifts',
  'shiftLag.refreshAria': 'Refresh ShiftLag',
  'shiftLag.errNoData': 'ShiftLag data not available',
  'shiftLag.errLoad': 'Unable to load ShiftLag data',
  'shiftLag.errBannerTitle': 'ShiftLag',
  'shiftLag.noData': 'No data available',
  'shiftLag.contributingFactors': 'Contributing factors',
  'shiftLag.recommendations': 'Recommendations',
  'shiftLag.scoreBreakdown': 'Score breakdown',
  'shiftLag.labelSleepDebt': 'Sleep debt',
  'shiftLag.labelMisalignment': 'Circadian misalignment',
  'shiftLag.labelInstability': 'Schedule instability',
  'shiftLag.emDash': '—',

  'quickSleep.notSignedIn': 'Not signed in',
  'quickSleep.saved': 'Saved',
  'quickSleep.dateLabel': 'Date',
  'quickSleep.typeLabel': 'Type',
  'quickSleep.startLabel': 'Start',
  'quickSleep.endLabel': 'End',
  'quickSleep.qualityLabel': 'Quality: {q}/5',
  'quickSleep.presetLastNight': 'Last night',
  'quickSleep.presetPostNight': 'Post-night',
  'quickSleep.presetNap20': 'Nap 20m',

  'sleepLogCard.kicker': 'Sleep log',
  'sleepLogCard.edit': 'Edit',
  'sleepLogCard.last7': 'Last 7 days',
  'sleepLogCard.lastNightSub': 'Last night’s sleep / nap',
  'sleepLogCard.stagesTitle': 'Sleep stages',
  'sleepLogCard.noStageData': 'No sleep data available',
  'sleepLogCard.shiftCoach': 'Shift Coach',
  'sleepLogCard.coachGoodLead': 'Well done!',
  'sleepLogCard.coachGoodRest':
    'You got {h} hours of sleep last night. Keep maintaining this consistent sleep schedule to support your body clock and recovery.',
  'sleepLogCard.coachMid':
    'You slept {h} hours last night, which is below the recommended 7–9 hours. Try to get to bed earlier tonight or take a short nap today if possible. Consistent sleep timing is key for shift workers.',
  'sleepLogCard.coachLowLead': 'Sleep alert:',
  'sleepLogCard.coachLowRest':
    'You only got {h} hours of sleep last night. This is significantly below the recommended amount. Prioritize getting to bed earlier tonight, and consider a 20–30 minute nap if you feel fatigued. Your body needs adequate rest to function optimally.',
  'sleepLogCard.durationM': '{m}m',

  'sleepFab.ariaAdd': 'Add sleep',

  'sleepSessionList.loading': 'Loading sleep sessions…',
  'sleepSessionList.empty': 'No sleep sessions logged for this day.',
  'sleepSessionList.quality': 'Quality: {q}',

  'sleepShiftLog.timeline': 'Timeline',
  'sleepShiftLog.hoursUnit': 'hours',
  'sleepShiftLog.oneSession': '1 session',
  'sleepShiftLog.nSessions': '{n} sessions',
  'sleepShiftLog.todaySleep': 'Today’s sleep ({start} – {end})',
  'sleepShiftLog.daySleep': '{date} ({start} – {end})',
  'sleepShiftLog.windowFallback': 'Today’s sleep (07:00 → 07:00)',
  'sleepShiftLog.noSleepYet': 'No sleep logged yet',

  'sleepClassify.reasoning.day_sleep':
    'Daytime sleep session (4–8h), typical after a night shift.',
  'sleepClassify.reasoning.post_shift_recovery': 'Recovery sleep after a night shift.',
  'sleepClassify.reasoning.pre_shift_nap': 'Pre-shift nap to boost alertness.',
  'sleepClassify.reasoning.micro_nap': 'Short nap for a quick energy boost.',
  'sleepClassify.reasoning.main_sleep': 'Main sleep during typical night hours.',
  'sleepClassify.reasoning.split_sleep': 'Possible split-sleep pattern.',
  'sleepClassify.reasoning.irregular_sleep': 'Sleep timing does not match common patterns.',
}

function cloneInsight(es: Record<string, string>): Record<string, string> {
  return { ...sleepInsightEn, ...es }
}

export const sleepUiMessagesEs: Record<string, string> = {
  ...sleepUiMessagesEn,
  ...cloneInsight({
    'sleepInsight.nightEmpty':
      'Empieza con el bloque de sueño tras el turno nocturno para dar una señal fiable de recuperación.',
    'sleepInsight.defaultEmpty':
      'Empieza con el sueño principal o una siesta de recuperación para mejorar la señal del reloj biológico.',
    'sleepInsight.nightDebt':
      'Arrastras deuda de sueño alrededor del turno de noche. Prioriza un bloque protegido de recuperación.',
    'sleepInsight.defaultDebt':
      'Arrastras deuda de sueño. Prioriza recuperar antes del próximo turno exigente.',
    'sleepInsight.onlyNaps':
      'Solo hay siestas registradas. Añade el sueño principal para mejorar la guía.',
    'sleepInsight.postShiftDominant':
      'El sueño post-turno marca la diferencia hoy. Sigue registrándolo tras noches.',
    'sleepInsight.poorNight':
      'El horario de sueño diurno no encaja del todo con la guardia. Más regularidad puede ayudar.',
    'sleepInsight.poorDefault':
      'El horario se aleja de tu ritmo habitual. Una ventana de sueño más estable ayuda.',
    'sleepInsight.manualSource':
      'Registro manual activo. Un wearable mejora estimaciones y frescura de datos.',
    'sleepInsight.targetNight':
      'Has alcanzado el objetivo para este día de turno de noche. Sigue registrando.',
    'sleepInsight.targetDefault': 'Has alcanzado el objetivo para este día desplazado. Sigue registrando.',
    'sleepInsight.gapNight':
      'Una siesta corta antes del turno o más sueño post-turno puede cerrar el hueco.',
    'sleepInsight.gapDefault': 'Una siesta o más recuperación puede cerrar el hueco hoy.',
  }),
  'sleepSW.pageTitle': 'Sueño',
  'sleepSW.backHome': 'Volver al inicio',
  'sleepSW.loading': 'Cargando datos de sueño…',
  'sleepSW.metricsTitle': 'Métricas de sueño',
  'sleepSW.metricsHeading': 'Objetivo de esta noche y resumen semanal',
  'sleepSW.tonightTarget': 'Objetivo de esta noche',
  'sleepSW.tonightHint': 'Meta de sueño según tu perfil.',
  'sleepSW.consistency': 'Regularidad',
  'sleepSW.deficit': 'Déficit de sueño',
  'sleepSW.timelineTitle': 'Línea de tiempo 24 h',
  'sleepSW.last30Title': 'Últimos 30 días',
  'sleepSW.editLogs': 'Registrar sueño',
  'sleepSW.stagesTitle': 'Etapas del sueño',
  'sleepSW.weekMetricsError': 'No se pudieron cargar las métricas semanales.',
  'sleepSW.noWearable': 'Aún no hay wearable. Conéctalo en Configuración de wearables.',
  'sleepSW.syncFailed': 'Error al sincronizar wearables',
  'sleepSW.deleteSessionFailed': 'No se pudo eliminar la sesión',
  'sleepCard.last7': 'Últimos 7 días',
  'sleepCard.chartSub': 'Últimos 7 días locales hasta hoy · objetivo {target} h',
  'sleepCard.chartSummarySegment': '{date}: {hours}',
  'sleepCard.chartHoursLabel': '{n} h',
  'sleepCard.ariaChartTarget': 'La línea punteada verde marca el objetivo {hours}.',
  'sleepCard.dayTotalCaption': 'Tiempo total de sueño',
  'sleepCard.dayTotalHrsShort': 'h',
  'sleepCard.dayTotalMinsShort': 'min',
  'sleepCard.btnLogSleep': 'Registrar sueño',
  'sleepCard.btnAddSleep': 'Añadir sueño',
  'sleepCard.btnEditLogs': 'Registrar sueño',
  'sleepCard.btnEditToday': 'Editar sueño',
  'sleepCard.durationHM': '{h} h {m} min',
  'sleep7.header': 'Últimos 7 días',
  'sleep7.today': 'Hoy',
  'sleep7.yesterday': 'Ayer',
  'sleepDel.title': '¿Eliminar entrada de sueño?',
  'sleepDel.body':
    'Se eliminará este registro de sueño y se actualizarán el sueño y el Ritmo de turnos.',
  'sleepDel.cancel': 'Cancelar',
  'sleepDel.confirm': 'Eliminar',
  'sleepDel.deleting': 'Eliminando…',
  'sleepDel.closeAria': 'Cerrar',

  'sleepLogs.pageTitle': 'Historial de sueño',
  'sleepLogs.emptyTitle': 'No hay registros de sueño',
  'sleepLogs.emptyBody': 'Empieza a registrar tu sueño para verlo aquí',
  'sleepLogs.dayNoSleep': 'Sin sueño registrado',
  'sleepLogs.totalLine': '{duration} en total',
  'sleepLogs.shiftOff': 'LIBRE',
  'sleepLogs.editAria': 'Editar entrada de sueño',
  'sleepLogs.deleteAria': 'Eliminar entrada de sueño',
  'sleepLogs.backAria': 'Volver',
  'sleepLogs.timeRange': '{start} – {end}',
  'sleepLogs.durationH': '{h} h',
  'sleepLogs.durationHM': '{h} h {m} min',
  'sleepLogs.errDeleteAlert': 'No se pudo eliminar el registro. Inténtalo de nuevo.',
  'sleepLogs.errDeleteWithStatus': 'No se pudo eliminar ({status})',
  'sleepLogs.errParseResponse': 'No se pudo leer la respuesta',

  'sleepOverview.pageTitle': 'Resumen de sueño',
  'sleepOverview.subtitle': 'Análisis y recomendaciones según tus datos',
  'sleepOverview.loading': 'Analizando tus datos de sueño…',
  'sleepOverview.errLoad': 'No se pudo cargar el resumen de sueño',
  'sleepOverview.errFetch': 'Error al cargar el resumen: {status}',
  'sleepOverview.sectionOverview': 'Resumen',
  'sleepOverview.sectionInsights': 'Ideas clave',
  'sleepOverview.sectionRecommendations': 'Recomendaciones de Shift Coach',
  'sleepOverview.sectionIssues': 'Posibles problemas',
  'sleepOverview.sectionStatsTitle': 'Estadísticas de sueño (últimos 7 días)',
  'sleepOverview.statTotalSleep': 'Sueño total',
  'sleepOverview.statDailyAvg': 'Media diaria',
  'sleepOverview.statDaysLogged': 'Días registrados',
  'sleepOverview.statConsistency': 'Regularidad',
  'sleepOverview.bestDay': 'Mejor día',
  'sleepOverview.worstDay': 'Peor día',
  'sleepOverview.sectionDailyBreakdown': 'Desglose diario de sueño',
  'sleepOverview.qualityLine': 'Calidad: {q}',
  'sleepOverview.sectionMetrics': 'Métricas generales',
  'sleepOverview.metricBodyClock': 'Puntuación del reloj biológico',
  'sleepOverview.metricRecovery': 'Puntuación de recuperación',
  'sleepOverview.metricMood': 'Estado de ánimo',
  'sleepOverview.metricFocus': 'Concentración',
  'sleepOverview.metricCurrentShift': 'Turno actual',
  'sleepOverview.metricSleep24h': 'Sueño (24 h)',
  'sleepOverview.sectionCircadian': 'Ritmo circadiano y salud del sueño',
  'sleepOverview.circadianPhase': 'Fase circadiana',
  'sleepOverview.factorSleepDebt': 'Impacto de la deuda de sueño',
  'sleepOverview.factorTiming': 'Alineación horaria',
  'sleepOverview.factorConsistency': 'Regularidad',
  'sleepOverview.weeklyDeficit': 'Déficit semanal de sueño',
  'sleepOverview.deficitCategory.high': 'Alto',
  'sleepOverview.deficitCategory.medium': 'Medio',
  'sleepOverview.deficitCategory.low': 'Bajo',
  'sleepOverview.sectionLastNight': 'Sueño de anoche',
  'sleepOverview.duration': 'Duración',
  'sleepOverview.quality': 'Calidad',
  'sleepOverview.sleepStages': 'Etapas del sueño',
  'sleepOverview.lastNightEmpty': 'No hay sueño registrado para anoche',

  'sleepHistMgr.title': 'Editar registros de sueño',
  'sleepHistMgr.subtitle': 'Revisa y corrige los últimos 30 días de sueño registrado.',
  'sleepHistMgr.backAria': 'Volver al sueño',
  'sleepHistMgr.errLoad': 'No se pudo cargar el historial de sueño',
  'sleepHistMgr.errDelete': 'No se pudo eliminar el registro de sueño',
  'sleepHistMgr.empty': 'No hay registros de sueño en los últimos 30 días.',
  'sleepHistMgr.edit': 'Editar',
  'sleepHistMgr.delete': 'Eliminar',
  'sleepHistMgr.dayTotal': '{h} h en total',
  'sleepQuality.veryPoor': 'Muy pobre',

  'sleepEditLegacy.title': 'Editar sueño o siesta',
  'sleepEditLegacy.deleteConfirm':
    '¿Seguro que quieres eliminar este registro de sueño? No se puede deshacer.',
  'sleepEditLegacy.deleteEntry': 'Eliminar entrada',

  'sleepLog.logNap': 'Registrar siesta',
  'sleepLog.startShort': 'Inicio',
  'sleepLog.endShort': 'Fin',
  'sleepLog.qualityShort': 'Calidad',
  'sleepLog.errStartEndTimes': 'Indica hora de inicio y de fin',
  'sleepLog.notesOptional': 'Notas (opcional)',

  'sleepJetlag.sectionLabel': 'Jet lag social',
  'sleepJetlag.heading': 'Alineación del horario de sueño',
  'sleepJetlag.errNeedData': 'Registra al menos 2 días de sueño principal para calcular el jet lag social.',
  'sleepJetlag.errLoad': 'No se pudieron cargar los datos de jet lag social.',
  'sleepJetlag.currentMisalignment': 'Desalineación actual',
  'sleepJetlag.weeklyAvg': 'Media semanal: {h} h',
  'sleepJetlag.hoursUnit': '{h} h',
  'sleepJetlag.noData': 'Sin datos',
  'sleepJetlag.category.low': 'Bajo',
  'sleepJetlag.category.moderate': 'Moderado',
  'sleepJetlag.category.high': 'Alto',
  'sleepJetlag.errorStateTitle': 'Jet lag social',

  'sleepInsightCard.label': 'Insight de sueño',
  'sleepInsightCard.boostTitle': 'Cómo mejorar ritmo / recuperación:',

  'sleepPage.percentOfGoal': '{pct}% del objetivo',
  'sleepPage.summaryWithGoal': '{h}h {m}m – {pct}% de tu objetivo',
  'sleepPage.stagesKicker': 'Etapas del sueño',
  'sleepPage.lastNightHeading': 'Anoche dormiste',
  'sleepPage.logSleepHeading': 'Registra tu sueño',
  'sleepPage.sourceLine': 'Fuente: Google Fit y ShiftCoach',
  'sleepPage.insightHeading': 'A qué apuntar',
  'sleepPage.insightBody':
    'En días de turno, protege tu primer ciclo de sueño: ahí es más probable el sueño profundo.',
  'sleepPage.shiftCoachTip':
    'Mantén el horario de sueño lo más estable que puedas: ayuda a fijar el reloj biológico entre cambios de turno.',
  'sleepPage.sleepOverviewCta': 'Resumen de sueño',
  'sleepPage.shiftCoachAlt': 'Shift Coach',
  'sleepPage.shiftCoachLabel': 'Shift Coach',
  'sleepPage.disclaimer':
    'Shift Coach es una herramienta de coaching y no ofrece consejo médico. Ante condiciones médicas, embarazo o problemas de salud complejos, revisa tu plan con un profesional registrado.',
  'sleepPage.errFetchSummary': 'No se pudieron obtener los datos de sueño',
  'sleepPage.errLoadSummary': 'No se pudieron cargar los datos de sueño',
  'sleepPage.errDeleteSession': 'No se pudo eliminar la sesión',
  'sleepPage.errParseResponse': 'No se pudo leer la respuesta',
  'sleepPage.syncNotYet': 'Última sinc.: aún no',
  'sleepPage.syncJustNow': 'Última sinc.: ahora mismo',
  'sleepPage.syncMinAgo': 'Última sinc.: hace {m} min',
  'sleepPage.syncHoursAgo': 'Última sinc.: hace {h} h',
  'sleepPage.syncDaysAgo': 'Última sinc.: hace {d} día',
  'sleepPage.syncDaysAgoPlural': 'Última sinc.: hace {d} días',

  'sleepCombo.deficitNoData': 'Sin datos',
  'sleepCombo.deficitOnTrack': 'En camino',
  'sleepCombo.deficitNeedsAttention': 'Requiere atención',
  'sleepCombo.deficitHigh': 'Déficit alto',
  'sleepCombo.consistencyNoData': 'Datos insuficientes',
  'sleepCombo.consistencyGood': 'Buena regularidad',
  'sleepCombo.consistencyModerate': 'Regularidad media',
  'sleepCombo.consistencyLow': 'Poca regularidad',
  'sleepCombo.shiftNightGood': 'Bueno para turno de noche',
  'sleepCombo.shiftDayExcellent': 'Excelente para turno de día',
  'sleepCombo.shiftOffRecovery': 'Buen patrón de recuperación',
  'sleepCombo.tipBedtime': 'Intenta mantener la hora de acostarte dentro de 1–2 h de lo habitual.',
  'sleepCombo.tipDeficitHigh': 'Prioriza dormir 7–8 h esta noche.',
  'sleepCombo.tipAvgLow': 'Apunta a al menos 7 h de sueño por noche.',
  'sleepCombo.tipNightShift': 'Quienes trabajan de noche se benefician de horarios diurnos de sueño estables.',
  'sleepCombo.deficitBehindWeekly': 'Por debajo del objetivo semanal',
  'sleepCombo.deficitAheadWeekly': 'Por encima del objetivo semanal',
  'sleepCombo.deficitLabelNoData': 'Datos insuficientes',
  'sleepCombo.avgSleep': 'Media: {h} h',
  'sleepCombo.scoreWord': 'puntuación',
  'sleepCombo.quickTipTitle': 'Consejo rápido',
  'sleepCombo.infoAria': 'Más información sobre métricas de sueño',

  'sleepMetricsInfo.title': 'Métricas de sueño explicadas',
  'sleepMetricsInfo.subtitle': 'Entiende tus datos de sueño',
  'sleepMetricsInfo.suggestionsEmpty': 'No hay sugerencias disponibles por ahora.',
  'sleepMetricsInfo.suggestionsLoadError':
    'No se pudieron cargar sugerencias personalizadas. Inténtalo más tarde.',
  'sleepMetricsInfo.sectionTargetIntro':
    'Esta es la duración de sueño recomendada para esta noche, calculada según:',
  'sleepMetricsInfo.sectionTargetBullet1':
    'Tu déficit actual de sueño (si vas atrasado o adelantado respecto a la semana)',
  'sleepMetricsInfo.sectionTargetBullet2': 'Tu próximo tipo de turno (noche, día o libre)',
  'sleepMetricsInfo.sectionTargetBullet3':
    'Tu necesidad base de sueño (normalmente 7,5 h para muchos trabajadores por turnos)',
  'sleepMetricsInfo.sectionTargetFoot':
    'El objetivo se ajusta para recuperar deuda de sueño o mantener el ritmo, según tu guardia.',
  'sleepMetricsInfo.consistencyIntro':
    'Esta puntuación (0-100) mide qué tan regular es tu hora de acostarte en los últimos 7 días:',
  'sleepMetricsInfo.consistencyB1':
    '{range} Muy regular (ideal para turnos)',
  'sleepMetricsInfo.consistencyB2':
    '{range} Bastante regular (algo de variación es normal al cambiar de turno)',
  'sleepMetricsInfo.consistencyB3':
    '{range} Mucha variación en la hora de acostarte (puede afectar la recuperación)',
  'sleepMetricsInfo.consistencyFoot':
    'Se calcula con la desviación típica de las horas de acostarte del sueño principal. Menos variación = más puntuación.',
  'sleepMetricsInfo.consistencyShiftNote':
    'En turnos, algo de variación es normal al pasar de día a noche. El objetivo es ser regular dentro de cada tipo de turno.',
  'sleepMetricsInfo.deficitIntro':
    'Muestra si vas atrasado o adelantado respecto a tu objetivo semanal de sueño:',
  'sleepMetricsInfo.deficitB1':
    '{label} Vas por debajo del objetivo semanal (necesitas más sueño)',
  'sleepMetricsInfo.deficitB2':
    '{label} Vas por encima del objetivo semanal (superávit de sueño)',
  'sleepMetricsInfo.deficitB3':
    'Se calcula con los últimos 7 días de sueño frente al objetivo semanal (normalmente 52,5 h para 7,5 h × 7 días)',
  'sleepMetricsInfo.deficitFoot':
    'Categorías: Superávit/Bajo (en camino), Medio (requiere atención), Alto (prioriza recuperar).',
  'sleepMetricsInfo.personalizedTitle': 'Sugerencias personalizadas',
  'sleepMetricsInfo.generating': 'Generando sugerencias…',
  'sleepMetricsInfo.suggestionsUnavailable': 'No se pudieron cargar sugerencias ahora.',
  'sleepMetricsInfo.gotIt': 'Entendido',
  'sleepMetricsInfo.range80100': '80-100:',
  'sleepMetricsInfo.range6079': '60-79:',
  'sleepMetricsInfo.rangeBelow60': 'Menos de 60:',
  'sleepMetricsInfo.positiveLabel': 'Número positivo:',
  'sleepMetricsInfo.negativeLabel': 'Número negativo:',
  'sleepMetricsInfo.notePrefix': 'Nota:',

  'sleepQualityChart.kicker': 'Calidad del sueño',
  'sleepQualityChart.title': 'Calidad del sueño',
  'sleepQualityChart.infoAria': 'Información sobre la calidad del sueño',
  'sleepQualityChart.errLoad': 'No se pudieron cargar los datos de calidad del sueño',
  'sleepQualityChart.emptyTitle': 'No hay datos de sueño',
  'sleepQualityChart.emptyBody': 'Registra sueño para ver tus métricas de calidad',
  'sleepQualityChart.labelDuration': 'Duración del sueño',
  'sleepQualityChart.labelTimeAsleep': 'Tiempo dormido',
  'sleepQualityChart.labelEfficiency': 'Eficiencia del sueño',
  'sleepQualityChart.modalSubtitle': 'Entiende tus métricas de sueño',
  'sleepQualityChart.closeAria': 'Cerrar',
  'sleepQualityChart.whatIsTitle': '¿Qué es la calidad del sueño?',
  'sleepQualityChart.whatIsBody':
    'Tu puntuación (0-100) refleja qué tan bien dormiste según tu valoración, la eficiencia y el tiempo dormido.',
  'sleepQualityChart.explainDuration':
    'El tiempo total en cama, desde que te acuestas hasta que te levantas.',
  'sleepQualityChart.explainTimeAsleep':
    'El tiempo que estuviste realmente dormido, sin contar desvelos.',
  'sleepQualityChart.explainEfficiency':
    'El porcentaje del tiempo en cama que estuviste dormido. Cuanto más alto, mejor; apunta a 85% o más.',
  'sleepQualityChart.improveTitle': 'Cómo mejorar',
  'sleepQualityChart.improve1': 'Mantén un horario de sueño estable, también en días libres',
  'sleepQualityChart.improve2': 'Ambiente oscuro, tranquilo y fresco',
  'sleepQualityChart.improve3': 'Evita pantallas y luz fuerte 1-2 h antes de dormir',
  'sleepQualityChart.improve4': 'Limita cafeína y comidas pesadas cerca de dormir',
  'sleepQualityChart.improve5': 'Cortinas opacas y antifaz para dormir de día',

  'sleepLogList.kicker': 'Registro de sueño',
  'sleepLogList.title': 'Sesiones recientes de sueño',
  'sleepLogList.viewLogs': 'Ver registros',
  'sleepLogList.emptyTitle': 'Aún no hay sueño registrado',
  'sleepLogList.viewAll': 'Ver todo el historial de sueño',

  'socialJetlagInfo.title': 'Jet lag social explicado',
  'socialJetlagInfo.subtitle': 'Entiende el cambio en tu horario de sueño',
  'socialJetlagInfo.s1Title': '¿Qué es el jet lag social?',
  'socialJetlagInfo.s1p1':
    'El jet lag social mide cuánto se ha desplazado tu horario de sueño respecto a tu patrón habitual. En turnos es especialmente importante porque el sueño cambia al alternar día y noche.',
  'socialJetlagInfo.s1p2':
    'A diferencia del jet lag por viajes, el social ocurre cuando el reloj biológico se desincroniza por cambios de turno, horarios irregulares o el estilo de vida.',
  'socialJetlagInfo.s2Title': 'Cómo se calcula',
  'socialJetlagInfo.s2Intro': 'ShiftCoach calcula el jet lag social con tus datos de sueño:',
  'socialJetlagInfo.s2b1':
    'Agrupa el sueño en “días ShiftCoach” (07:00 → 07:00, no de medianoche a medianoche)',
  'socialJetlagInfo.s2b2':
    'Cada día calcula el punto medio del sueño (entre el inicio del primer bloque y el fin del último)',
  'socialJetlagInfo.s2b3':
    'Establece una línea base con la mediana de los 7–10 días estables anteriores',
  'socialJetlagInfo.s2b4':
    'Compara el punto medio de hoy con la línea base para obtener el desfase en horas',
  'socialJetlagInfo.dataBoxTitle': 'Tus datos actuales',
  'socialJetlagInfo.baselineMid': 'Punto medio de referencia: {time}',
  'socialJetlagInfo.currentMid': 'Punto medio actual: {time}',
  'socialJetlagInfo.misalignmentHours': 'Desalineación: {h} h',
  'socialJetlagInfo.s3Title': 'Categorías de puntuación',
  'socialJetlagInfo.catLowTitle': 'Bajo (0–1,5 h):',
  'socialJetlagInfo.catLowBody':
    'El horario de sueño se ha mantenido cerca de tu ritmo habitual. Ideal para el reloj biológico.',
  'socialJetlagInfo.catModTitle': 'Moderado (1,5–3,5 h):',
  'socialJetlagInfo.catModBody':
    'El punto medio se ha movido bastante, a menudo por cambios recientes de turno. Puede hacer falta ajustar.',
  'socialJetlagInfo.catHighTitle': 'Alto (>3,5 h):',
  'socialJetlagInfo.catHighBody':
    'El reloj biológico está muy desplazado respecto al patrón habitual. Es frecuente al cambiar entre día y noche.',
  'socialJetlagInfo.s3Foot':
    'Con turnos, algo de variación es normal. El objetivo es evitar saltos grandes y ayudar al cuerpo a adaptarse.',

  'sleepTimeline.noSleepYet': 'Aún no hay sueño registrado en este día desplazado.',
  'sleepTimeline.shifted24h': 'Línea de 24 h del día desplazado',
  'sleepTimeline.shiftPrefix': 'Turno:',
  'sleepTimeline.todayLegend': 'Hoy:',
  'sleepTimeline.sumNightPostFrag':
    'El bloque más largo fue tras el turno; el sueño está repartido en varios bloques.',
  'sleepTimeline.sumNightPost': 'El bloque más largo fue tras el turno.',
  'sleepTimeline.sumNightOffFrag':
    'El bloque más largo quedó fuera de la ventana típica post-turno; sueño repartido en varios bloques.',
  'sleepTimeline.sumNightOff': 'El bloque más largo quedó fuera de la ventana típica post-turno.',
  'sleepTimeline.sumDefaultFrag':
    'Sueño repartido en varios bloques; se resalta el más largo.',
  'sleepTimeline.sumDefault': 'Se resalta el bloque de sueño más largo para revisarlo rápido.',
  'sleepTimeline.sumMulti': 'Sueño repartido en varios bloques.',
  'sleepTimeline.sumSingle': 'Un solo bloque de sueño en este día desplazado.',
  'sleepTimeline.sessionTooltip': '{type} · {start}–{end} ({h} h)',

  'shiftLag.kicker': 'ShiftLag',
  'shiftLag.title': 'Jet lag por tus turnos',
  'shiftLag.refreshAria': 'Actualizar ShiftLag',
  'shiftLag.errNoData': 'Datos de ShiftLag no disponibles',
  'shiftLag.errLoad': 'No se pudieron cargar los datos de ShiftLag',
  'shiftLag.errBannerTitle': 'ShiftLag',
  'shiftLag.noData': 'Sin datos',
  'shiftLag.contributingFactors': 'Factores que influyen',
  'shiftLag.recommendations': 'Recomendaciones',
  'shiftLag.scoreBreakdown': 'Desglose de la puntuación',
  'shiftLag.labelSleepDebt': 'Deuda de sueño',
  'shiftLag.labelMisalignment': 'Desalineación circadiana',
  'shiftLag.labelInstability': 'Inestabilidad del horario',
  'shiftLag.emDash': '—',

  'quickSleep.notSignedIn': 'Sesión no iniciada',
  'quickSleep.saved': 'Guardado',
  'quickSleep.dateLabel': 'Fecha',
  'quickSleep.typeLabel': 'Tipo',
  'quickSleep.startLabel': 'Inicio',
  'quickSleep.endLabel': 'Fin',
  'quickSleep.qualityLabel': 'Calidad: {q}/5',
  'quickSleep.presetLastNight': 'Anoche',
  'quickSleep.presetPostNight': 'Post-nocturno',
  'quickSleep.presetNap20': 'Siesta 20 min',

  'sleepLogCard.kicker': 'Registro de sueño',
  'sleepLogCard.edit': 'Editar',
  'sleepLogCard.last7': 'Últimos 7 días',
  'sleepLogCard.lastNightSub': 'Sueño / siesta de anoche',
  'sleepLogCard.stagesTitle': 'Etapas del sueño',
  'sleepLogCard.noStageData': 'No hay datos de sueño',
  'sleepLogCard.shiftCoach': 'Shift Coach',
  'sleepLogCard.coachGoodLead': '¡Bien hecho!',
  'sleepLogCard.coachGoodRest':
    'Dormiste {h} h anoche. Sigue con este horario estable para apoyar el reloj biológico y la recuperación.',
  'sleepLogCard.coachMid':
    'Dormiste {h} h anoche, por debajo de las 7–9 h recomendadas. Intenta acostarte antes o haz una siesta corta. La regularidad es clave con turnos.',
  'sleepLogCard.coachLowLead': 'Alerta de sueño:',
  'sleepLogCard.coachLowRest':
    'Solo dormiste {h} h anoche, muy por debajo de lo recomendado. Prioriza dormir antes y valora una siesta de 20–30 min si estás fatigado. El cuerpo necesita descanso suficiente.',
  'sleepLogCard.durationM': '{m} min',

  'sleepFab.ariaAdd': 'Añadir sueño',

  'sleepSessionList.loading': 'Cargando sesiones de sueño…',
  'sleepSessionList.empty': 'No hay sesiones de sueño este día.',
  'sleepSessionList.quality': 'Calidad: {q}',

  'sleepShiftLog.timeline': 'Línea de tiempo',
  'sleepShiftLog.hoursUnit': 'horas',
  'sleepShiftLog.oneSession': '1 sesión',
  'sleepShiftLog.nSessions': '{n} sesiones',
  'sleepShiftLog.todaySleep': 'Sueño de hoy ({start} – {end})',
  'sleepShiftLog.daySleep': '{date} ({start} – {end})',
  'sleepShiftLog.windowFallback': 'Sueño de hoy (07:00 → 07:00)',
  'sleepShiftLog.noSleepYet': 'Aún no hay sueño registrado',

  'sleepClassify.reasoning.day_sleep':
    'Sueño diurno (4–8 h), típico tras un turno de noche.',
  'sleepClassify.reasoning.post_shift_recovery': 'Sueño de recuperación tras turno de noche.',
  'sleepClassify.reasoning.pre_shift_nap': 'Siesta antes del turno para estar más alerta.',
  'sleepClassify.reasoning.micro_nap': 'Siesta corta para un impulso rápido de energía.',
  'sleepClassify.reasoning.main_sleep': 'Sueño principal en horario nocturno habitual.',
  'sleepClassify.reasoning.split_sleep': 'Posible patrón de sueño fraccionado.',
  'sleepClassify.reasoning.irregular_sleep': 'El horario no encaja con los patrones habituales.',
}

export const sleepUiMessagesDe: Record<string, string> = {
  ...sleepUiMessagesEn,
  ...cloneInsight({
    'sleepInsight.nightEmpty':
      'Beginne mit dem Schlafblock nach der Nachtschicht für ein verlässliches Erholungssignal.',
    'sleepInsight.defaultEmpty':
      'Beginne mit Hauptschlaf oder Erholungsnickerchen für ein besseres Körperuhr-Signal.',
    'sleepInsight.nightDebt':
      'Du hast relevanten Schlafschuld rund um die Nachtschicht. Priorisiere geschützten Erholungsschlaf.',
    'sleepInsight.defaultDebt':
      'Du hast relevanten Schlafschuld. Priorisiere Erholung vor der nächsten harten Schicht.',
    'sleepInsight.onlyNaps':
      'Bisher nur Nickerchen. Ergänze den Hauptschlaf für genauere Hinweise.',
    'sleepInsight.postShiftDominant':
      'Nachschicht-Schlaf trägt heute am meisten. Konsequent nach Nachtschichten loggen.',
    'sleepInsight.poorNight':
      'Tages-Schlaf passt nicht gut zur Schicht. Regelmäßigere Fenster können helfen.',
    'sleepInsight.poorDefault':
      'Zeitfenster weicht vom Rhythmus ab. Stabilere Hauptschlaf-Zeiten helfen.',
    'sleepInsight.manualSource':
      'Manuelle Eingabe aktiv. Wearable verbessert Schätzungen und Aktualität.',
    'sleepInsight.targetNight':
      'Ziel für diesen Nachtschicht-Tag erreicht. Weiter loggen für gute Hinweise.',
    'sleepInsight.targetDefault': 'Ziel für diesen Schicht-Tag erreicht. Weiter loggen.',
    'sleepInsight.gapNight':
      'Kurzer Nickerchen vor der Schicht oder mehr Nachschicht-Schlaf schließen die Lücke.',
    'sleepInsight.gapDefault': 'Nickerchen oder mehr Erholungsschlaf kann die Lücke schließen.',
  }),
  'sleepSW.pageTitle': 'Schlaf',
  'sleepSW.backHome': 'Zurück zur Startseite',
  'sleepSW.loading': 'Schlafdaten werden geladen…',
  'sleepSW.metricsTitle': 'Schlafmetriken',
  'sleepSW.weekMetricsError': 'Wöchentliche Metriken konnten nicht geladen werden.',
  'sleepSW.noWearable': 'Noch kein Wearable verbunden. In Wearables einrichten.',
  'sleepSW.syncFailed': 'Wearable-Sync fehlgeschlagen',
  'sleepSW.deleteSessionFailed': 'Sitzung konnte nicht gelöscht werden',
  'sleepCard.last7': 'Letzte 7 Tage',
  'sleep7.header': 'Letzte 7 Tage',
  'sleep7.today': 'Heute',
  'sleep7.yesterday': 'Gestern',
  'sleepDel.title': 'Schlafeintrag löschen?',
  'sleepDel.confirm': 'Löschen',
  ...sleepUiWorldDe,
}

export const sleepUiMessagesFr: Record<string, string> = {
  ...sleepUiMessagesEn,
  ...cloneInsight({
    'sleepInsight.nightEmpty':
      'Commencez par le sommeil après garde de nuit pour un signal de récupération fiable.',
    'sleepInsight.defaultEmpty':
      'Commencez par le sommeil principal ou une sieste pour améliorer le signal circadien.',
    'sleepInsight.nightDebt':
      'Dette de sommeil autour des gardes de nuit. Priorisez un bloc de récupération protégé.',
    'sleepInsight.defaultDebt':
      'Dette de sommeil significative. Priorisez la récupération avant la prochaine garde exigeante.',
    'sleepInsight.onlyNaps':
      'Seulement des siestes pour l’instant. Ajoutez le sommeil principal pour de meilleurs conseils.',
    'sleepInsight.postShiftDominant':
      'Le sommeil post-garde porte aujourd’hui. Continuez à le noter après les nuits.',
    'sleepInsight.poorNight':
      'Horaires de sommeil diurne peu alignés avec la garde. Plus de régularité aide.',
    'sleepInsight.poorDefault':
      'Horaires éloignés du rythme habituel. Une fenêtre de sommeil plus stable aide.',
    'sleepInsight.manualSource':
      'Saisie manuelle. Un wearable améliore les estimations et la fraîcheur.',
    'sleepInsight.targetNight':
      'Objectif atteint pour ce jour de garde de nuit. Continuez à enregistrer.',
    'sleepInsight.targetDefault': 'Objectif atteint pour ce jour décalé. Continuez à enregistrer.',
    'sleepInsight.gapNight':
      'Une sieste avant la garde ou plus de sommeil après peut combler l’écart.',
    'sleepInsight.gapDefault': 'Une sieste ou plus de récupération peut combler l’écart.',
  }),
  'sleepSW.pageTitle': 'Sommeil',
  'sleepSW.backHome': "Retour à l'accueil",
  'sleepSW.loading': 'Chargement des données de sommeil…',
  'sleepSW.metricsTitle': 'Indicateurs de sommeil',
  'sleepSW.weekMetricsError': 'Impossible de charger les indicateurs hebdomadaires.',
  'sleepSW.noWearable': 'Aucun wearable connecté. Configurez-le dans Wearables.',
  'sleepSW.syncFailed': 'Échec de la synchronisation',
  'sleepSW.deleteSessionFailed': 'Suppression de la session impossible',
  'sleepCard.last7': '7 derniers jours',
  'sleep7.header': '7 derniers jours',
  'sleep7.today': "Aujourd'hui",
  'sleep7.yesterday': 'Hier',
  'sleepDel.title': 'Supprimer cette entrée de sommeil ?',
  'sleepDel.confirm': 'Supprimer',
  ...sleepUiWorldFr,
}

export const sleepUiMessagesPtBR: Record<string, string> = {
  ...sleepUiMessagesEn,
  ...cloneInsight({
    'sleepInsight.nightEmpty':
      'Comece pelo sono pós-turno noturno para um sinal de recuperação confiável.',
    'sleepInsight.defaultEmpty':
      'Comece pelo sono principal ou um cochilo de recuperação para o ritmo circadiano.',
    'sleepInsight.nightDebt':
      'Dívida de sono ao redor do turno da noite. Priorize um bloco protegido de recuperação.',
    'sleepInsight.defaultDebt':
      'Dívida de sono significativa. Priorize recuperação antes do próximo turno pesado.',
    'sleepInsight.onlyNaps':
      'Só cochilos até agora. Adicione o sono principal para orientação melhor.',
    'sleepInsight.postShiftDominant':
      'Sono pós-turno domina hoje. Continue registrando após noites.',
    'sleepInsight.poorNight':
      'Horário de sono diurno fora do ideal da escala. Mais regularidade ajuda.',
    'sleepInsight.poorDefault':
      'Horário fora do ritmo. Janela de sono mais estável ajuda.',
    'sleepInsight.manualSource':
      'Registro manual ativo. Wearable melhora estimativas e dados.',
    'sleepInsight.targetNight':
      'Meta atingida neste dia de turno noturno. Continue registrando.',
    'sleepInsight.targetDefault': 'Meta atingida neste dia. Continue registrando.',
    'sleepInsight.gapNight':
      'Cochilo pré-turno ou mais sono pós-turno pode fechar a lacuna.',
    'sleepInsight.gapDefault': 'Cochilo ou mais recuperação pode fechar a lacuna.',
  }),
  'sleepSW.pageTitle': 'Sono',
  'sleepSW.backHome': 'Voltar ao início',
  'sleepSW.loading': 'Carregando dados de sono…',
  'sleepSW.metricsTitle': 'Métricas de sono',
  'sleepSW.weekMetricsError': 'Não foi possível carregar as métricas semanais.',
  'sleepSW.noWearable': 'Nenhum wearable conectado. Configure em Wearables.',
  'sleepSW.syncFailed': 'Falha ao sincronizar wearables',
  'sleepSW.deleteSessionFailed': 'Não foi possível excluir a sessão',
  'sleepCard.last7': 'Últimos 7 dias',
  'sleep7.header': 'Últimos 7 dias',
  'sleep7.today': 'Hoje',
  'sleep7.yesterday': 'Ontem',
  'sleepDel.title': 'Excluir registro de sono?',
  'sleepDel.confirm': 'Excluir',
  ...sleepUiWorldPtBR,
}

export const sleepUiMessagesPl: Record<string, string> = {
  ...sleepUiMessagesEn,
  ...cloneInsight({
    'sleepInsight.nightEmpty':
      'Zacznij od snu po nocnej zmianie, by dać wiarygodny sygnał regeneracji.',
    'sleepInsight.defaultEmpty':
      'Zacznij od głównego snu lub drzemki regeneracyjnej dla rytmu dobowego.',
    'sleepInsight.nightDebt':
      'Znaczące zadłużenie snu wokół nocnej zmiany. Priorytet: chroniony blok snu.',
    'sleepInsight.defaultDebt':
      'Znaczące zadłużenie snu. Priorytet: regeneracja przed kolejną ciężką zmianą.',
    'sleepInsight.onlyNaps':
      'Na razie tylko drzemki. Dodaj główny sen dla lepszych wskazówek.',
    'sleepInsight.postShiftDominant':
      'Dziś dominuje sen po zmianie. Loguj go konsekwentnie po nocach.',
    'sleepInsight.poorNight':
      'Timing snu dziennego słabo pasuje do grafiku. Regularność pomoże.',
    'sleepInsight.poorDefault':
      'Timing odbiega od rytmu. Stabilniejsze okno snu pomoże.',
    'sleepInsight.manualSource':
      'Ręczny wpis. Wearable poprawia szacunki i świeżość danych.',
    'sleepInsight.targetNight':
      'Cel osiągnięty w ten dzień nocnej zmiany. Kontynuuj logowanie.',
    'sleepInsight.targetDefault': 'Cel osiągnięty w ten dzień. Kontynuuj logowanie.',
    'sleepInsight.gapNight':
      'Krótka drzemka przed zmianą lub dłuższy sen po zmianie domknie lukę.',
    'sleepInsight.gapDefault': 'Drzemka lub więcej regeneracji może domknąć lukę.',
  }),
  'sleepSW.pageTitle': 'Sen',
  'sleepSW.backHome': 'Powrót do strony głównej',
  'sleepSW.loading': 'Ładowanie danych snu…',
  'sleepSW.metricsTitle': 'Metryki snu',
  'sleepSW.weekMetricsError': 'Nie udało się wczytać tygodniowych metryk.',
  'sleepSW.noWearable': 'Brak podłączonego wearable. Skonfiguruj w sekcji Wearables.',
  'sleepSW.syncFailed': 'Synchronizacja wearable nie powiodła się',
  'sleepSW.deleteSessionFailed': 'Nie udało się usunąć sesji',
  'sleepCard.last7': 'Ostatnie 7 dni',
  'sleep7.header': 'Ostatnie 7 dni',
  'sleep7.today': 'Dziś',
  'sleep7.yesterday': 'Wczoraj',
  'sleepDel.title': 'Usunąć wpis snu?',
  'sleepDel.confirm': 'Usuń',
  ...sleepUiWorldPl,
}
