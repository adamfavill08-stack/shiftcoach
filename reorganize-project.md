# Project Reorganization Plan

This document outlines the reorganization of the ShiftCoach project structure.

## New Structure

```
app/
  (dashboard)/
    dashboard/
      page.tsx
    shift-rhythm/
      page.tsx
    sleep/
      page.tsx
    calendar/  (renamed from rota)
      page.tsx
    settings/
      page.tsx

app/api/
  sleep/
    log/
      route.ts
    summary/
      route.ts
    7days/
      route.ts
    sessions/
      by-date/
        route.ts
  circadian/
    calculate/
      route.ts
  blog/
    [slug]/
      route.ts (if needed)

components/
  shift-rhythm/
    ShiftRhythmCard.tsx
    ShiftRhythmGauge.tsx
    ShiftRhythmHero.tsx
    BodyClockCard.tsx
    BodyClockGauge.tsx
  sleep/
    Sleep7DayBars.tsx
    LogSleepModal.tsx
    EditSleepModal.tsx
    SleepFab.tsx
    SleepInsightCard.tsx
    SleepLogSheet.tsx
    QuickSleep.tsx
  blog/
    BlogCard.tsx
    BlogList.tsx
  calendar/
    RotaOverviewPage.tsx
    RotaPage.tsx
    AddActionFab.tsx
    ShiftPatternSet.tsx
    RotaSetupPage.tsx
  modals/
    CoachChatModal.tsx
    MobileCardModal.tsx
    PremiumQuickLogSheet.tsx
  ui/
    Card.tsx
    Header.tsx
    BottomNav.tsx
    SystemNavBar.tsx
    Toast.tsx
```

## Migration Steps

1. Create new folder structure
2. Move files to new locations
3. Update all imports
4. Test compilation

