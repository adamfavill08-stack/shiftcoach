# Typography Consistency Update - Summary

## ✅ What I've Done

### 1. **Created Typography System**
- ✅ Added typography CSS classes to `app/globals.css`
- ✅ Created `lib/typography.ts` with TypeScript utilities
- ✅ Created `TYPOGRAPHY_SYSTEM.md` documentation

### 2. **Standardized Key Components**
- ✅ Updated `components/ui/Header.tsx` - Added `tracking-tight` to main title
- ✅ Updated `app/(app)/settings/page.tsx` - Standardized h1
- ✅ Updated `app/(app)/shift-rhythm/page.tsx` - Added `tracking-tight`
- ✅ Updated `app/(app)/binge-risk/page.tsx` - Added `tracking-tight`
- ✅ Updated `components/dashboard/ShiftRhythmCard.tsx` - Changed `text-[17px]` to `text-lg`
- ✅ Updated `components/dashboard/pages/ActivityAndStepsPage.tsx` - Standardized headings
- ✅ Updated all legal document pages - Added `tracking-tight` to all h2 headings

### 3. **Standard Patterns Applied**

**Page Headers:**
- Before: `text-xl font-semibold`
- After: `text-xl font-semibold tracking-tight`

**Card Titles:**
- Before: `text-[17px] font-bold tracking-[-0.01em]`
- After: `text-lg font-bold tracking-tight`

**Settings/Modal Titles:**
- Before: `text-2xl font-bold`
- After: `text-2xl font-bold tracking-tight`

---

## 📋 What Still Needs Updating

### **High Priority Files** (Most Visible)

These files still have inconsistent typography and should be updated:

1. **`components/dashboard/pages/SleepPage.tsx`**
   - Has `text-[17px] font-bold` → Should be `text-lg font-bold tracking-tight`
   - Has `text-[12px]` → Should be `text-xs`

2. **`components/dashboard/pages/AdjustedCaloriesPage.tsx`**
   - Has various custom sizes → Should use standard scale

3. **`components/sleep/CombinedSleepMetricsCard.tsx`**
   - Has `text-[12px]` → Should be `text-xs`

4. **`components/shift-rhythm/ShiftRhythmCard.tsx`**
   - Has `text-[17px]` → Should be `text-lg`

5. **`components/dashboard/pages/MealTimingCoachPage.tsx`**
   - Has various custom sizes → Should use standard scale

6. **`components/dashboard/pages/CaloriesPage.tsx`**
   - Has `text-3xl font-semibold` → Should be `text-2xl font-bold tracking-tight` or keep if intentional

7. **`components/calendar/RotaOverviewPage.tsx`**
   - Has `text-base font-bold` → Should be `text-base font-semibold tracking-tight`

8. **`app/(app)/rota/setup/page.tsx`**
   - Has various heading sizes → Should standardize

9. **`app/onboarding/page.tsx`**
   - Has various heading sizes → Should standardize

10. **`components/sleep/QuickSleepLogButtons.tsx`**
    - Has `text-[12px]` → Should be `text-xs`

---

## 🎯 Standard Typography Scale

### **Headings:**
- **H1 (Page Title)**: `text-2xl font-bold tracking-tight`
- **H2 (Section Title)**: `text-xl font-semibold tracking-tight`
- **H3 (Card Title)**: `text-lg font-semibold` or `text-lg font-bold tracking-tight`
- **H4 (Small Title)**: `text-base font-semibold`

### **Body Text:**
- **Body**: `text-[15px] font-normal leading-relaxed` or `text-sm font-normal leading-relaxed`
- **Body Small**: `text-xs font-normal leading-relaxed`

### **Labels:**
- **Uppercase Section Label**: `text-[13px] font-bold tracking-[0.15em] uppercase text-slate-400`
- **Regular Label**: `text-sm font-medium`

### **Captions:**
- **Caption**: `text-xs font-normal text-slate-500`
- **Caption XS**: `text-[10px] font-normal text-slate-400`

---

## 🔄 Migration Pattern

### **Common Replacements:**

1. **`text-[17px] font-bold tracking-[-0.01em]`** → **`text-lg font-bold tracking-tight`**
2. **`text-[12px]`** → **`text-xs`**
3. **`text-xl font-semibold`** → **`text-xl font-semibold tracking-tight`**
4. **`text-2xl font-bold`** → **`text-2xl font-bold tracking-tight`**
5. **`text-base font-bold`** → **`text-base font-semibold tracking-tight`**

---

## 📝 Next Steps

### **Option 1: Manual Update (Recommended)**
Go through each file listed above and update headings to use the standard scale. This ensures quality and consistency.

### **Option 2: Find & Replace (Faster but less precise)**
Use your editor's find & replace to update common patterns:
- Find: `text-[17px] font-bold tracking-[-0.01em]`
- Replace: `text-lg font-bold tracking-tight`

- Find: `text-[12px]`
- Replace: `text-xs`

### **Option 3: Gradual Update**
Update files as you work on them. The typography system is in place, so new code will be consistent.

---

## ✅ Benefits

1. **Visual Consistency** - All headings look uniform
2. **Better Readability** - Proper tracking improves legibility
3. **Easier Maintenance** - Standard scale makes updates easier
4. **Professional Look** - Consistent typography = premium feel

---

## 📚 Reference

- **Typography System**: See `TYPOGRAPHY_SYSTEM.md`
- **CSS Classes**: See `app/globals.css` (typography section)
- **TypeScript Utils**: See `lib/typography.ts`

---

**Status**: Foundation complete, ready for full app update  
**Priority**: Medium (visual polish, not blocking launch)

