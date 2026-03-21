# ShiftCoach Project Reorganization Guide

## Overview
This guide documents the reorganization of the ShiftCoach codebase to follow Next.js 16 best practices.

## New Structure

### App Routes
- `app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `app/(dashboard)/shift-rhythm/page.tsx` - Shift rhythm page
- `app/(dashboard)/sleep/page.tsx` - Sleep page  
- `app/(dashboard)/calendar/page.tsx` - Calendar (renamed from rota)
- `app/(dashboard)/settings/page.tsx` - Settings page

### API Routes (already mostly correct)
- `app/api/sleep/log/route.ts` ✓
- `app/api/sleep/summary/route.ts` ✓
- `app/api/sleep/7days/route.ts` ✓
- `app/api/sleep/sessions/by-date/route.ts` ✓
- `app/api/circadian/calculate/route.ts` ✓

### Components
- `components/shift-rhythm/` - All shift rhythm related components
- `components/sleep/` - All sleep related components  
- `components/blog/` - Blog components (already exists)
- `components/calendar/` - Calendar components (renamed from rota)
- `components/modals/` - Modal components
- `components/ui/` - UI primitives (already exists)

## Migration Steps

### Step 1: Create New Folder Structure
```bash
mkdir -p app/\(dashboard\)/dashboard
mkdir -p app/\(dashboard\)/shift-rhythm
mkdir -p app/\(dashboard\)/sleep
mkdir -p app/\(dashboard\)/calendar
mkdir -p app/\(dashboard\)/settings
mkdir -p components/shift-rhythm
mkdir -p components/calendar
mkdir -p components/modals
```

### Step 2: Move Files
1. Move `app/(app)/dashboard/page.tsx` → `app/(dashboard)/dashboard/page.tsx`
2. Move `app/(app)/shift-rhythm/page.tsx` → `app/(dashboard)/shift-rhythm/page.tsx`
3. Move `app/(app)/sleep/page.tsx` → `app/(dashboard)/sleep/page.tsx`
4. Move `app/(app)/rota/page.tsx` → `app/(dashboard)/calendar/page.tsx`
5. Move `app/(app)/settings/page.tsx` → `app/(dashboard)/settings/page.tsx`

### Step 3: Move Components
1. Move shift-rhythm components:
   - `components/dashboard/ShiftRhythmCard.tsx` → `components/shift-rhythm/ShiftRhythmCard.tsx`
   - `components/dashboard/ShiftRhythmGauge.tsx` → `components/shift-rhythm/ShiftRhythmGauge.tsx`
   - `components/dashboard/ShiftRhythmHero.tsx` → `components/shift-rhythm/ShiftRhythmHero.tsx`
   - `components/dashboard/BodyClockCard.tsx` → `components/shift-rhythm/BodyClockCard.tsx`
   - `components/BodyClockGauge.tsx` → `components/shift-rhythm/BodyClockGauge.tsx`

2. Move sleep components (already in `components/sleep/`):
   - Already organized ✓

3. Move calendar components:
   - `components/dashboard/pages/RotaOverviewPage.tsx` → `components/calendar/RotaOverviewPage.tsx`
   - `components/dashboard/pages/RotaPage.tsx` → `components/calendar/RotaPage.tsx`
   - `components/rota/AddActionFab.tsx` → `components/calendar/AddActionFab.tsx`
   - `components/rota/ShiftPatternSet.tsx` → `components/calendar/ShiftPatternSet.tsx`
   - `components/rota/RotaSetupPage.tsx` → `components/calendar/RotaSetupPage.tsx`

4. Move modal components:
   - `components/coach/CoachChatModal.tsx` → `components/modals/CoachChatModal.tsx`
   - `components/ui/MobileCardModal.tsx` → `components/modals/MobileCardModal.tsx`
   - `components/ui/PremiumQuickLogSheet.tsx` → `components/modals/PremiumQuickLogSheet.tsx`

### Step 4: Update Imports
Search and replace all imports across the codebase:

1. `@/components/dashboard/ShiftRhythmCard` → `@/components/shift-rhythm/ShiftRhythmCard`
2. `@/components/dashboard/pages/SleepPage` → `@/components/sleep/SleepPage`
3. `@/components/dashboard/pages/RotaOverviewPage` → `@/components/calendar/RotaOverviewPage`
4. `@/components/coach/CoachChatModal` → `@/components/modals/CoachChatModal`
5. Update route references: `/rota` → `/calendar`

### Step 5: Clean Up
1. Remove old `app/(app)/` directory after migration
2. Remove old component locations after moving
3. Run `npm run build` to verify everything compiles
4. Test all routes and functionality

## Important Notes

- The `(dashboard)` route group ensures all routes share the same layout
- Keep backward compatibility during migration (both old and new paths temporarily)
- Update all internal links and navigation
- Test thoroughly before removing old files

