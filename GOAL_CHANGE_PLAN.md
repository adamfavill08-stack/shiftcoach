# Goal Change Implementation Plan

## Current State Analysis

### Where Goal is Currently Used:

1. **Base Calorie Calculation** (`lib/nutrition/calculateAdjustedCalories.ts`)
   - Line 54-55: `if (goal === 'lose') baseCalories *= 0.85`
   - Line 55: `if (goal === 'gain') baseCalories *= 1.1`
   - **Impact**: Changes base calories by ±15% (lose) or +10% (gain)

2. **Protein Calculation** (`lib/nutrition/calculateAdjustedCalories.ts`)
   - Line 186-187: Protein per kg varies by goal
   - `lose`: 2.0 g/kg
   - `gain`: 1.8 g/kg  
   - `maintain`: 1.7 g/kg
   - **Impact**: Changes protein targets significantly

3. **Macro Targets** (`lib/nutrition/calculateAdjustedCalories.ts`)
   - `calculateDailyMacros()` function uses goal to set protein
   - Affects entire macro split (protein → fat → carbs)

4. **Engine Calculation** (`lib/engine.ts`)
   - Line 86: `goalFactor = goal === 'lose' ? 0.85 : goal === 'gain' ? 1.10 : 1.0`
   - Line 93: Protein calculation also uses goal
   - **Impact**: Used in legacy engine calculations

5. **Settings UI** (`app/(app)/settings/page.tsx`)
   - Line 87-98: Dropdown selector (currently NOT connected to save)
   - **Issue**: Selector exists but doesn't save changes!

---

## What Needs to Happen When Goal Changes

### Immediate Updates Required:

#### 1. **Database Update**
- Save new goal to `profiles.goal` column
- Use existing `updateProfile()` function from `lib/profile.ts`

#### 2. **Recalculate Adjusted Calories**
- **API**: `/api/nutrition/today` 
- **Function**: `calculateAdjustedCalories()`
- **Impact**: Base calories change immediately
- **Components affected**:
  - `AdjustedCaloriesPage` (dashboard tab)
  - `AdjustedCaloriesCard` (if exists elsewhere)

#### 3. **Recalculate Macro Targets**
- **API**: `/api/nutrition/today` (returns macros)
- **Function**: `calculateDailyMacros()` inside `calculateAdjustedCalories()`
- **Impact**: Protein, carbs, fat targets all change
- **Components affected**:
  - Macro targets display in `AdjustedCaloriesPage`
  - Any macro tracking components
  - `NutrientRingStrip` component

#### 4. **Recalculate Meal Plan**
- **Function**: `buildMealPlan()` inside `calculateAdjustedCalories()`
- **Impact**: Meal calorie distribution stays same %, but total changes
- **Components affected**:
  - `AdjustedMealTimesCard` (home page)
  - Meal timing recommendations

#### 5. **Refresh Dashboard Data**
- **API**: `/api/shift-rhythm` (may use goal indirectly)
- **Components**: Dashboard page needs to refetch nutrition data

#### 6. **Update UI State**
- Settings page should show new goal immediately
- All calorie/macro displays should update
- Show loading state during recalculation

---

## Implementation Strategy

### Phase 1: Connect Settings to Database

**File**: `app/(app)/settings/page.tsx`

**Changes Needed**:
1. Add state for goal value
2. Load current goal from profile on mount
3. Add onChange handler to select dropdown
4. Add save function that calls `updateProfile({ goal })`
5. Show loading/success states

**Code Pattern** (similar to `useStepGoal` hook):
```typescript
const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain')
const [saving, setSaving] = useState(false)

// Load on mount
useEffect(() => {
  loadProfile().then(p => setGoal(p?.goal || 'maintain'))
}, [])

// Save on change
const handleGoalChange = async (newGoal: string) => {
  setSaving(true)
  await updateProfile({ goal: newGoal.toLowerCase() })
  setSaving(false)
  // Trigger refresh of dependent data
}
```

---

### Phase 2: Create Cache Invalidation System

**Problem**: Next.js caches API responses. When goal changes, cached calorie/macro data becomes stale.

**Solution Options**:

#### Option A: Revalidation Tags (Recommended)
- Add cache tags to nutrition API routes
- Use `revalidateTag()` when goal updates
- **File**: `app/api/nutrition/today/route.ts`
- Add: `export const revalidate = 0` or use tags

#### Option B: Client-Side Refresh
- After saving goal, manually refetch affected data
- Use `router.refresh()`
- Call `refetch()` on `useTodayNutrition()` hook

#### Option C: Webhook/Event System
- Emit event when goal changes
- Components listen and refresh
- More complex but scalable

**Recommendation**: Option B (simplest for now)

---

### Phase 3: Update Dependent Components

#### Components That Need Auto-Refresh:

1. **`AdjustedCaloriesPage`** (`components/dashboard/pages/AdjustedCaloriesPage.tsx`)
   - Uses `useTodayNutrition()` hook
   - Needs to refetch when goal changes
   - **Action**: Add `refresh()` call after goal save

2. **`AdjustedMealTimesCard`** (home page)
   - Fetches from `/api/meal-timing/today`
   - Meal calories change when goal changes
   - **Action**: Refetch meal timing data

3. **Dashboard Page** (`app/(dashboard)/dashboard/page.tsx`)
   - May display calorie summaries
   - **Action**: Refresh nutrition data

4. **Any Macro Display Components**
   - Show protein/carb/fat targets
   - **Action**: Refresh from `/api/nutrition/today`

---

### Phase 4: User Experience Flow

#### When User Changes Goal:

1. **Immediate Feedback**
   - Show loading spinner on save button
   - Disable dropdown during save
   - Show success toast: "Goal updated"

2. **Background Recalculation**
   - Trigger refetch of `/api/nutrition/today`
   - Show subtle loading state on affected cards
   - Update numbers smoothly (no jarring jumps)

3. **Visual Indicators**
   - Highlight what changed (e.g., "Calories updated from 2,200 to 1,870")
   - Show explanation: "Your target changed because you switched to 'Lose' goal"

4. **Error Handling**
   - If save fails, revert dropdown to previous value
   - Show error message
   - Don't trigger recalculation

---

## Technical Implementation Details

### 1. Settings Page Update

**File**: `app/(app)/settings/page.tsx`

```typescript
// Add imports
import { getMyProfile, updateProfile } from '@/lib/profile'
import { useState, useEffect } from 'react'

// Add state
const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain')
const [saving, setSaving] = useState(false)

// Load current goal
useEffect(() => {
  getMyProfile().then(p => {
    if (p?.goal) setGoal(p.goal)
  })
}, [])

// Save handler
const handleGoalChange = async (newGoal: string) => {
  const goalValue = newGoal.toLowerCase() as 'lose' | 'maintain' | 'gain'
  setSaving(true)
  
  try {
    const success = await updateProfile({ goal: goalValue })
    if (success) {
      setGoal(goalValue)
      // Trigger refresh of dependent data (see Phase 2)
      window.dispatchEvent(new CustomEvent('goalChanged'))
    }
  } catch (err) {
    console.error('Failed to update goal:', err)
    // Revert dropdown
  } finally {
    setSaving(false)
  }
}

// Update select element
<select
  value={goal}
  onChange={(e) => handleGoalChange(e.target.value)}
  disabled={saving}
>
  <option value="lose">Lose</option>
  <option value="maintain">Maintain</option>
  <option value="gain">Gain</option>
</select>
```

---

### 2. Create Refresh Hook

**New File**: `lib/hooks/useGoalChange.ts`

```typescript
'use client'

import { useEffect } from 'react'

export function useGoalChange(onChange: () => void) {
  useEffect(() => {
    const handleGoalChange = () => {
      onChange()
    }
    
    window.addEventListener('goalChanged', handleGoalChange)
    return () => window.removeEventListener('goalChanged', handleGoalChange)
  }, [onChange])
}
```

---

### 3. Update Nutrition Hook

**File**: `lib/hooks/useTodayNutrition.ts`

```typescript
// Add refresh capability
export function useTodayNutrition() {
  const [data, setData] = useState<TodayNutrition | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/nutrition/today', { 
        cache: 'no-store' // Force fresh data
      })
      if (res.ok) {
        const json = await res.json()
        setData(json.nutrition ?? null)
      }
    } catch (err) {
      console.error('[useTodayNutrition] error:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refetch() }, [])

  // Listen for goal changes
  useGoalChange(() => {
    refetch()
  })

  return { data, loading, refresh: refetch }
}
```

---

### 4. Update Adjusted Calories Page

**File**: `components/dashboard/pages/AdjustedCaloriesPage.tsx`

```typescript
// Already uses useTodayNutrition() hook
// Just needs to listen for goal changes (handled in hook above)
// No changes needed - will auto-refresh!
```

---

### 5. Update Meal Timing Card

**File**: `components/shift-rhythm/AdjustedMealTimesCard.tsx` (or wherever it is)

```typescript
// Add goal change listener
useGoalChange(() => {
  refetchMealTiming() // Refetch from /api/meal-timing/today
})
```

---

## Data Flow Diagram

```
User changes goal in Settings
         ↓
Save to profiles.goal (database)
         ↓
Dispatch 'goalChanged' event
         ↓
┌─────────────────────────────────┐
│ Components Listening:           │
│ 1. useTodayNutrition()          │
│ 2. AdjustedMealTimesCard        │
│ 3. Any macro displays           │
└─────────────────────────────────┘
         ↓
Refetch /api/nutrition/today
         ↓
calculateAdjustedCalories() runs
  - Reads NEW goal from profile
  - Recalculates baseCalories
  - Recalculates macros
  - Recalculates meal plan
         ↓
UI updates automatically
```

---

## Edge Cases to Handle

### 1. **Concurrent Changes**
- User changes goal while nutrition data is loading
- **Solution**: Cancel previous request, start new one

### 2. **Network Failures**
- Goal saves but recalculation fails
- **Solution**: Show warning, allow manual refresh

### 3. **Partial Updates**
- Some components update, others don't
- **Solution**: Use event system to ensure all refresh

### 4. **Race Conditions**
- Multiple rapid goal changes
- **Solution**: Debounce or cancel previous saves

### 5. **Cache Issues**
- Browser/Next.js caches old calorie data
- **Solution**: Use `cache: 'no-store'` or revalidation

---

## Testing Checklist

- [ ] Goal saves to database correctly
- [ ] Base calories update immediately
- [ ] Macro targets update (protein changes)
- [ ] Meal plan calories update
- [ ] All UI components refresh
- [ ] Loading states show during update
- [ ] Error handling works (revert on failure)
- [ ] No flickering/jarring updates
- [ ] Works on slow network
- [ ] Works if API fails

---

## Future Enhancements (Not Required Now)

1. **Goal Change History**
   - Track when user changes goals
   - Show impact over time

2. **Goal-Specific Coaching**
   - Different tips for lose vs gain
   - Adjust AI coach messages

3. **Goal Transitions**
   - Smooth transitions between goals
   - Explain what changed

4. **Goal Validation**
   - Warn if changing too frequently
   - Suggest maintaining goal for X weeks

---

## Summary

**Critical Path**:
1. Connect settings dropdown to save function ✅
2. Add event system for goal changes ✅
3. Make nutrition hook listen for changes ✅
4. Update meal timing card to refresh ✅
5. Test end-to-end flow ✅

**Estimated Impact**:
- **Files to modify**: 3-4 files
- **New files**: 1 (useGoalChange hook)
- **Complexity**: Low-Medium
- **User Impact**: High (immediate feedback on goal changes)

