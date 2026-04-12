/** Batch 1 (PL): dashboard, common, body clock, fatigue, detail titles */
export const batch1PlB: Record<string, string> = {
  'dashboard.loading': 'Przygotowujemy Twój pulpit ShiftCoach…',
  'dashboard.homeLabel': 'Strona główna',
  'dashboard.wearable.connected': 'Połączono',
  'dashboard.wearable.notConnected': 'Nie połączono',
  'dashboard.wearable.tapToConnect': 'Dotknij, aby połączyć',
  'dashboard.wearable.syncing': 'Synchronizacja…',
  'dashboard.wearable.synced': 'Zsynchronizowano',
  'dashboard.wearable.errorDenied': 'Połączenie odrzucone',
  'dashboard.wearable.errorServer': 'Serwer nie skonfigurowany',
  'dashboard.wearable.errorRedirect': 'Niezgodny adres przekierowania',
  'dashboard.wearable.errorToken': 'Wymiana tokenu nie powiodła się',
  'dashboard.wearable.errorGeneric': 'Nie udało się połączyć',
  'dashboard.bodyClock.comingSoon': 'Wynik zegara biologicznego wkrótce',
  'dashboard.bodyClock.stronglyAligned': 'Twój zegar biologiczny jest dobrze zsynchronizowany',
  'dashboard.bodyClock.inSync': 'Twój zegar biologiczny jest w rytmie',
  'dashboard.bodyClock.slightlyOut': 'Twój zegar biologiczny jest lekko rozstrojony',
  'dashboard.bodyClock.outOfSync': 'Twój zegar biologiczny jest poza rytmem',
  'dashboard.bodyClock.unlockHint':
    'Zapisz kilka nocy snu i zmiany, aby odblokować wynik zegara biologicznego.',
  'dashboard.bodyClock.calculatedFrom':
    'Obliczane z ostatniego snu, grafiku i ekspozycji na światło.',
  'dashboard.bodyClock.openAria': 'Otwórz stronę Zegar biologiczny',
  'dashboard.lastSync.notYet': 'Ostatnia synchr.: jeszcze nie',
  'dashboard.lastSync.justNow': 'Ostatnia synchr.: przed chwilą',
  'dashboard.lastSync.minAgo': 'Ostatnia synchr.: {n} min temu',
  'dashboard.lastSync.hAgo': 'Ostatnia synchr.: {n} h temu',
  'dashboard.lastSync.dayAgo': 'Ostatnia synchr.: {n} dzień temu',
  'dashboard.lastSync.daysAgo': 'Ostatnia synchr.: {n} dni temu',
  'dashboard.shiftLabel.night': 'Zmiana nocna',
  'dashboard.shiftLabel.day': 'Zmiana dzienna',
  'dashboard.shiftLabel.dayOff': 'Wolne',
  'dashboard.shiftLabel.late': 'Zmiana popołudniowa',
  'dashboard.shiftLabel.shift': 'Zmiana',
  'dashboard.rhythm': 'Rytm',
  'dashboard.calories.palMaintenance': 'Utrzymanie (PAL)',
  'dashboard.calories.goalAdjustment': 'Korekta celu',
  'dashboard.calories.baseTarget': 'Cel bazowy (po uwzględnieniu celu)',
  'dashboard.calories.shiftSchedule': 'Harmonogram zmian',
  'dashboard.calories.shiftWorkload': 'Obciążenie zmianą',
  'dashboard.calories.shiftWorkloadNotLogged': 'Obciążenie zmianą (nie zapisano — neutralne)',
  'dashboard.calories.stepsActivity': 'Kroki i aktywne minuty',
  'dashboard.calories.safetyCap': 'Dzienny limit bezpieczeństwa',
  'dashboard.calories.targetRounding': 'Zaokrąglenie i stabilność',
  'dashboard.calories.shiftEarly': 'Zmiana poranna',
  'dashboard.calories.finalTarget': 'Końcowy cel',
  'dashboard.calories.cardTitle': 'Skorygowane kalorie',
  'dashboard.calories.cardSubtitle': 'Cel dopasowany do dzisiejszej zmiany.',
  'dashboard.calories.snapshotBase': 'Baza',
  'dashboard.calories.snapshotRecovery': 'Czynniki regeneracji',
  'dashboard.calories.snapshotActivity': 'Aktywność',
  'dashboard.calories.snapshotTotalAdjustment': 'Suma korekt',
  'dashboard.calories.snapshotCue': 'Dotknij, aby zobaczyć szczegóły.',
  'dashboard.calories.todayAdjustedTarget': 'Dzisiejszy skorygowany cel',
  'dashboard.calories.hydrationTitle': 'Nawodnienie i kofeina',
  'dashboard.calories.hydrationSubtitle': 'Cele i to, co ostatnio zarejestrowałeś.',
  'dashboard.calories.hydrationWaterTarget': 'Cel wody',
  'dashboard.calories.hydrationWaterLogged': 'Zapisano (24 h)',
  'dashboard.calories.hydrationCaffeineTarget': 'Wytyczna kofeiny',
  'dashboard.calories.hydrationCaffeineLogged': 'Zapisano (24 h)',
  'dashboard.calories.detailModifierBreakdown': 'Skąd ta liczba',
  'dashboard.calories.shiftedDayLabel': 'Dzień zmiany',
  'dashboard.calories.guardRailHint':
    'Uwzględnia niewielką dzienną korektę stabilności, by jeden zapis nie zmieniał celu zbyt mocno.',
  'dashboard.calories.pageSubtitle':
    'Szacunek z dnia zmiany, snu, rytmu, aktywności i celu — pełny rozkład poniżej.',
  'dashboard.calories.sleepShiftDay': 'Sen (Twój dzień)',
  'dashboard.recovery.calculating': 'Obliczanie regeneracji…',
  'dashboard.recovery.calculatingMessage':
    'Łączymy ostatni sen i ruch, aby ocenić dzisiejszą regenerację.',
  'dashboard.recovery.unavailable': 'Wynik regeneracji niedostępny',
  'dashboard.recovery.notScored': 'Regeneracja jeszcze bez oceny',
  'dashboard.recovery.notScoredMessage':
    'Zapisz sen i zsynchronizuj urządzenia, aby zobaczyć dzienny wynik tutaj.',
  'dashboard.recovery.recovered': 'Zregenerowany',
  'dashboard.recovery.recoveredMessage':
    'Sen i ruch wspierają regenerację — dobry dzień na cięższe zmiany lub trening.',
  'dashboard.recovery.okNotCharged': 'OK, nie w pełni',
  'dashboard.recovery.okMessage':
    'Nie jesteś „na zero”, ale trochę niedoregenerowany. Chroń sen dziś w nocy i umiarkuj wysiłek.',
  'dashboard.recovery.runningLow': 'Nisko',
  'dashboard.recovery.runningLowMessage':
    'Niska regeneracja — priorytetem sen, lżejsze zmiany gdy możesz i unikaj serii nocnych.',
  'dashboard.shiftLag.low': 'Niskie',
  'dashboard.shiftLag.mod': 'Umiark.',
  'dashboard.shiftLag.high': 'Wysokie',
  'dashboard.shiftLag.per100': '/100',
  'dashboard.shiftLag.cardTitle': 'Jet lag zmianowy',
  'dashboard.shiftLag.unlockHint':
    'Zapisz sen i zmiany, aby odblokować wynik.',
  'dashboard.mealTimes.title': 'Pory posiłków',
  'dashboard.nextMealWindow.title': 'Następne okno posiłku',
  'dashboard.nextMealWindow.nextPrefix': 'Następny:',
  'dashboard.nextMealWindow.at': 'o',
  'dashboard.nextMealWindow.scheduleFallback': 'Harmonogram',
  'dashboard.nextMealWindow.subtitleFallback': 'Trzymaj posiłki w rytmie zmian.',
  'dashboard.nextMealWindow.alerts': 'Alerty',
  'dashboard.mealTimes.night': 'Noc',
  'dashboard.mealTimes.day': 'Dzień',
  'dashboard.mealTimes.late': 'Późno',
  'dashboard.mealTimes.off': 'Wolne',
  'dashboard.mealTimes.whyAria': 'Dlaczego timing posiłków ma znaczenie',
  'dashboard.mealTimes.closeAria': 'Zamknij',
  'dashboard.mealTimes.closeStatus': 'Zamknij',
  'dashboard.mealTimes.whyTitle': 'Dlaczego timing posiłków ma znaczenie',
  'dashboard.mealTimes.notLogged': 'Nie zapisano',
  'dashboard.mealTimes.onTime': 'Na czas',
  'dashboard.mealTimes.logged': 'Zapisano',
  'dashboard.bodyClockInfo.title': 'Jak działa wynik zegara biologicznego',
  'dashboard.bodyClockInfo.closeAria': 'Zamknij informacje o zegarze biologicznym',
  'detail.common.backToDashboard': 'Wróć do pulpitu',
  'detail.common.loading': 'Ładowanie…',
  'detail.common.noData': 'Brak danych',
  'detail.common.disclaimerBrand': 'SHIFTCOACH',
  'detail.common.disclaimerLine1': 'Tylko aplikacja coachingowa; nie zastępuje porady medycznej.',
  'detail.common.disclaimerLine2': 'W razie wątpliwości skonsultuj się ze specjalistą.',
  'detail.common.disclaimer':
    'Tylko aplikacja coachingowa; nie zastępuje porady medycznej. W razie wątpliwości skonsultuj się ze specjalistą.',
  'detail.common.goToDashboard': 'Idź do pulpitu',
  'detail.bodyClock.title': 'Zegar biologiczny',
  'detail.bodyClock.scoreLabel': 'Wynik zegara biologicznego',
  'detail.bodyClock.loading': 'Ładowanie wyniku…',
  'detail.bodyClock.breakdownTitle': 'Co ukształtowało Twój wynik',
  'detail.bodyClock.breakdownSubtitle':
    'Każdy słupek 0–100. Sen i rytm łączą cztery składowe (60% głównego wyniku). Odżywianie 25%, ruch 15%.',
  'detail.bodyClock.factorSleepAmount': 'Ilość snu',
  'detail.bodyClock.hintSleepAmount': 'Ostatnie noce vs zdrowy cel snu.',
  'detail.bodyClock.factorRegularity': 'Regularność pór snu',
  'detail.bodyClock.hintRegularity': 'Stabilniejsze pory snu dają wyższy wynik.',
  'detail.bodyClock.factorShiftFit': 'Dopasowanie do zmiany',
  'detail.bodyClock.hintShiftFit':
    'Jak dobrze główny sen wpisuje się w typ zmiany każdego dnia.',
  'detail.bodyClock.factorRecovery': 'Regeneracja ze snu',
  'detail.bodyClock.hintRecovery':
    'Czas, jakość i drobna korekta po zmianach nocnych.',
  'detail.bodyClock.bundleSleep': 'Sen i rytm (w głównym wyniku)',
  'detail.bodyClock.hintBundleSleep':
    'Z czterech wierszy powyżej — część 60%.',
  'detail.bodyClock.factorNutrition': 'Odżywianie i nawodnienie',
  'detail.bodyClock.hintNutrition': 'Kalorie, makro, woda i kofeina.',
  'detail.bodyClock.factorActivity': 'Ruch',
  'detail.bodyClock.hintActivity': 'Kroki i aktywne minuty vs cele.',
  'detail.bodyClock.factorMealTiming': 'Timing posiłków',
  'detail.bodyClock.hintMealTiming':
    'Bliskość sugerowanych okien — tylko kontekst; jeszcze nie w głównym wyniku.',
  'detail.bodyClock.coachLineIntro': 'Na dziś',
  'detail.bodyClock.weekSnapshot': 'Ten tydzień',
  'detail.bodyClock.quickHabits': 'Proste nawyki',
  'detail.bodyClock.tipRiskShort':
    'Po ciężkich blokach (noce, wczesne wstawania) traktuj kolejne dni jak regenerację: najpierw sen, wcześniej kofeina, lżejsze posiłki w nocy.',
  'detail.bodyClock.overLast7': 'Zegar biologiczny przez 7 dni',
  'detail.bodyClock.higherBars':
    'Wyższe słupki = dni, gdy zegar był bardziej zsynchronizowany ze zmianami.',
  'detail.bodyClock.patternVsRecovery': 'Wzorzec zmian vs regeneracja',
  'detail.bodyClock.patternNoWeeklySummary':
    'Podsumowanie tygodnia jeszcze niegotowe — zapisuj sen i zmiany; wypełni się po pełnym tygodniu.',
  'detail.bodyClock.patternStable': 'Wzorzec: raczej stabilny',
  'detail.bodyClock.patternHeavy': 'Wzorzec: bardzo obciążający tydzień',
  'detail.bodyClock.patternChoppy': 'Wzorzec: nieregularny',
  'detail.bodyClock.patternMixed': 'Wzorzec: mieszany',
  'detail.bodyClock.patternExplanation':
    'Ile dni wynik spadł poniżej strefy „w rytmie”. Serie nocy, krótkie przerwy lub długie dojazdy mogą ciągnąć kilka dni z rzędu.',
  'detail.bodyClock.sleepTiming': 'Spójność pór snu',
  'detail.bodyClock.timingNoData': 'Za mało danych o porach snu.',
  'detail.bodyClock.timingRegular': 'Główny sen był dość regularny w tym tygodniu.',
  'detail.bodyClock.timingShifting':
    'Pory snu się przesuwają — uważaj na późne końce zmian i bardzo wczesne początki jeden po drugim.',
  'detail.bodyClock.timingFlipped':
    'Sen bardzo przesunięty lub nieregularny — zegar mocno nadgania zmiany.',
  'detail.bodyClock.timingTip':
    'Staraj się mieć co najmniej 3 noce z rzędu z podobnym głównym snem w dni wolne między ciężkimi okresami.',
  'detail.bodyClock.lightHabits': 'Światło i nawyki chroniące zegar',
  'detail.bodyClock.lightDay':
    'Zmiany dzienne: 15–20 min światła dziennego większość dni.',
  'detail.bodyClock.lightNight':
    'Zmiany nocne: okulary przeciwsłoneczne w drodze do domu, ciemna sypialnia.',
  'detail.bodyClock.lightEvening':
    'Wolne wieczory: przyciemnij ekrany i światło 1–2 h przed planowanym snem.',
  'detail.bodyClock.riskWindow': 'Nadchodzące okno ryzyka',
  'detail.bodyClock.riskWindowText':
    'Z tego tygodnia wynika, że najtrudniejsze będą serie nocy, wczesne starty i krótkie przerwy. Po takich blokach traktuj dni jak regenerację: chroń sen, kofeina wcześniej, lżejsze posiłki w nocy.',
  'detail.bodyClock.waitingData':
    'Czekamy na wystarczająco dane snu i zmian na trend 7-dniowy.',
  'detail.bodyClock.warningMixed':
    'Mieszany tydzień — uważaj na serie nocy i bardzo krótki sen.',
  'detail.bodyClock.warningStable':
    'Zegar trzymał się rytmu w tym tygodniu — chroń dni regeneracji.',
  'detail.bodyClock.warningOutOfSync':
    'Często poza rytmem — gdy możesz, traktuj nadchodzące dni jak regenerację i sprawdź grafik.',
  'detail.bodyClock.warningQuiteFew':
    'Kilka dni poza rytmem — uważaj na noce z rzędu, wczesne wstawania i pofragmentowany sen.',
  'detail.fatigueRisk.title': 'Ryzyko zmęczenia',
  'detail.fatigueRisk.fallbackExplanation':
    'Ryzyko zmęczenia aktualizuje się wraz z synchronizacją snu, zmian i rytmu.',
  'detail.fatigueRisk.fallbackDriver':
    'Zapisuj sen i zmiany, aby odblokować spersonalizowane czynniki.',
  'detail.fatigueRisk.confidenceSuffix': 'pewność',
  'detail.fatigueRisk.currentWindow': 'Bieżące okno',
  'detail.fatigueRisk.axisLow': 'Niskie',
  'detail.fatigueRisk.axisHigh': 'Wysokie',
  'detail.fatigueRisk.todayCurve': 'Dzisiejsza krzywa zmęczenia',
  'detail.fatigueRisk.liveEstimate': 'Szacunek na żywo',
  'detail.fatigueRisk.curveFootnote':
    'Ryzyko jest najniższe po wyrównanym śnie regeneracyjnym i rośnie pod koniec biologicznej nocy.',
  'detail.fatigueRisk.driversTitle': 'Co napędza Twoje ryzyko',
  'detail.fatigueRisk.howToLowerTitle': 'Jak obniżyć ryzyko zmęczenia',
  'detail.fatigueRisk.tip1Title': 'Chroń sen po zmianie',
  'detail.fatigueRisk.tip1Body':
    'Zaplanuj zaraz po zmianie blok snu regeneracyjnego, by złagodzić następny szczyt ryzyka.',
  'detail.fatigueRisk.tip2Title': 'Drzemka przed zmianą w razie potrzeby',
  'detail.fatigueRisk.tip2Body':
    'Krótka drzemka przed kolejną służbą może zmniejszyć obciążenie przy seriach zmian.',
  'detail.fatigueRisk.tip3Title': 'Uważaj na okno 02:00–06:00',
  'detail.fatigueRisk.tip3Body':
    'To często okres najwyższego ryzyka — ostrożniej prowadź, decyduj i obciążaj się pracą.',
  'detail.fatigueRisk.levelLow': 'Niskie',
  'detail.fatigueRisk.levelModerate': 'Umiarkowane',
  'detail.fatigueRisk.levelHigh': 'Wysokie',
  'detail.fatigueRisk.confidenceLow': 'Niska',
  'detail.fatigueRisk.confidenceMedium': 'Średnia',
  'detail.fatigueRisk.confidenceHigh': 'Wysoka',
  'detail.shiftRhythm.title': 'Rytm zmian',
  'detail.adjustedCalories.title': 'Skorygowane kalorie',
  'detail.heartHealth.title': 'Zdrowie serca',
  'detail.hydration.title': 'Nawodnienie',
  'detail.bingeRisk.title': 'Ryzyko objadania się',
  'detail.shiftLag.title': 'Jet lag zmianowy',
  'detail.recovery.title': 'Wynik regeneracji',
  'detail.recovery.subtitle':
    'Jak bardzo ciało i umysł są gotowe na następną zmianę',
  'detail.recovery.fact1':
    'Wynik regeneracji pokazuje, jak dobrze jesteś przygotowany na stres, pracę i trening.',
  'detail.recovery.fact2':
    'Opiera się na śnie, grafiku zmian, aktywności i regularności planu dnia.',
  'detail.recovery.fact3':
    'Wyższy wynik = więcej energii, lepszy nastrój i odporność na zmianie.',
  'detail.recovery.bandHigh': 'Odnowiony',
  'detail.recovery.bandMedium': 'OK',
  'detail.recovery.bandLow': 'Przeciążony',
  'detail.recovery.whatTitle': 'Czym jest wynik regeneracji?',
  'detail.recovery.whatBody':
    'To połączenie snu, zmian, aktywności i dopasowania do rytmu dobowego. Pokazuje, jak bardzo ciało i umysł są dziś gotowe na stres, pracę i trening.',
  'detail.recovery.whyTitle': 'Dlaczego to ważne przy pracy zmianowej',
  'detail.recovery.whyLi1':
    'Nieregularne zmiany utrudniają pełną regenerację między dniami a nocami.',
  'detail.recovery.whyLi2':
    'Niska regeneracja często daje się we znaki jako większe zmęczenie, apetyt i gorsza koncentracja.',
  'detail.recovery.whyLi3':
    'Śledzenie regeneracji pomaga wybrać, kiedy iść na rekord, kiedy zwolnić lub priorytetyzować odpoczynek.',
  'detail.recovery.howTitle': 'Jak Shift Coach liczy twój wynik',
  'detail.recovery.howLi1': 'Sen: czas trwania, jakość i zgodność z harmonogramem.',
  'detail.recovery.howLi2': 'Zmiany: ile z rzędu, intensywność i rotacja.',
  'detail.recovery.howLi3':
    'Aktywność: ruch w ciągu dnia i unikanie przeciążenia przy zmęczeniu.',
  'detail.recovery.howLi4':
    'Rytm: jak bardzo dzień jest zsynchronizowany z zegarem biologicznym.',
  'detail.recovery.howDisclaimer': 'To wyłącznie wskazówki, nie porada medyczna.',
  'detail.recovery.improveTitle': 'Jak poprawić wynik regeneracji',
  'detail.recovery.improveLi1':
    'Chroń blok głównego snu, kiedy tylko możesz — także po nocach.',
  'detail.recovery.improveLi2':
    'Korzystaj z podpowiedzi posiłków, by unikać ciężkich posiłków w „biologicznej nocy”.',
  'detail.recovery.improveLi3':
    'W dniach słabej regeneracji wybieraj lżejszy ruch i więcej odpoczynku.',
  'detail.recovery.ctaTitle': 'Zobacz aktualny wynik regeneracji',
  'detail.recovery.ctaBody':
    'Sprawdź dzisiejszy wynik i wskazówki na głównym pulpicie.',
}
