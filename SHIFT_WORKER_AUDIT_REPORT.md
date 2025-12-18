# ShiftCoach App - Comprehensive Shift Worker Audit Report

**Date:** Generated automatically  
**Scope:** Full codebase audit for shift worker functionality  
**Status:** ✅ **Overall: Well-Wired with Minor Improvements Needed**

---

## ✅ **What's Working Well**

### 1. **Shift Data Integration** ✅
- **Shift rota data flows correctly** through all major calculations:
  - ✅ `/api/shift-rhythm` properly fetches and maps shift data (`shiftDays`)
  - ✅ `/api/circadian/calculate` uses latest shift to determine `shiftType`
  - ✅ `/api/shiftlag` fetches shifts and integrates with sleep data
  - ✅ `lib/shift-rhythm/engine.ts` maps shifts to sleep logs by date

### 2. **Shift-Aware Calculations** ✅
- **Circadian Phase** (`lib/circadian/calcCircadianPhase.ts`):
  - ✅ Uses `shiftType` to apply `SHIFT_EFFECT` scores (night: -15, morning: +10, etc.)
  - ✅ Properly accounts for shift work in alignment score
- **Shift Rhythm** (`lib/shift-rhythm/engine.ts`):
  - ✅ Calculates `shiftPatternScore` by matching sleep bedtimes to shift types
  - ✅ Different bedtime preferences for night (20:00-02:00), morning (20:00-23:00), afternoon (21:00-00:00)
  - ✅ Falls back to score of 70 when no shift data exists (line 147)
- **Shift Lag** (`lib/circadian/calculateShiftLag.ts`):
  - ✅ Calculates misalignment between biological night and shift schedules
  - ✅ Handles missing shift data gracefully

### 3. **Edge Case Handling** ✅
- **No shifts logged:**
  - ✅ Circadian defaults to `'day'` shift type (line 216 in `circadian/calculate/route.ts`)
  - ✅ Shift rhythm returns score of 70 when no shift type found (line 147 in `engine.ts`)
  - ✅ Shift lag handles empty shift arrays (line 260 in `calculateShiftLag.ts`)
- **Missing shift times:**
  - ✅ Falls back to shift label when `start_ts` is missing
  - ✅ Classifies shift type from label if times unavailable
- **Incomplete data:**
  - ✅ All calculations have try/catch blocks
  - ✅ Default values provided when data missing

### 4. **UI Integration** ✅
- **Dashboard components** properly display shift-aware data:
  - ✅ `ShiftRhythmCard` shows body clock score with shift context
  - ✅ `ActivityAndStepsPage` uses `shiftType` for recommendations
  - ✅ `AdjustedCaloriesPage` adjusts calories based on shift activity level
- **Shift-aware messaging:**
  - ✅ Coach system prompt includes shift context
  - ✅ Activity recommendations adapt to shift type
  - ✅ Sleep predictions account for shift schedules

### 5. **Wearable Integration** ✅
- ✅ Google Fit sync integrates with shift-aware calculations
- ✅ Activity data flows into shift rhythm scoring
- ✅ Sleep data from wearables used in circadian calculations

---

## ⚠️ **Areas for Improvement**

### 1. **Shift Type Classification Inconsistency** 🟡 MEDIUM
**Issue:** Multiple places classify shift types differently:
- `lib/circadian/calcCircadianPhase.ts` uses: `"morning" | "day" | "evening" | "night" | "rotating"`
- `lib/shift-rhythm/engine.ts` uses: `'night' | 'day' | 'off' | 'morning' | 'afternoon'`
- `app/api/circadian/calculate/route.ts` maps labels to types differently

**Impact:** Could cause slight inconsistencies in scoring

**Recommendation:** Create a centralized `toShiftType()` function used everywhere

**Location:**
- `lib/circadian/calcCircadianPhase.ts:7`
- `lib/shift-rhythm/engine.ts:141-163`
- `app/api/circadian/calculate/route.ts:216-249`

### 2. **Missing Shift Data Fallback Could Be Better** 🟡 MEDIUM
**Issue:** When no shifts exist, some calculations default to generic values:
- Circadian defaults to `'day'` shift (may not be accurate)
- Shift rhythm returns 70 (neutral score, but doesn't explain why)

**Impact:** New users or users who haven't logged shifts get generic calculations

**Recommendation:** 
- Show a message encouraging shift logging when no shifts found
- Use user's profile `shift_pattern` as a fallback if available

**Location:**
- `app/api/circadian/calculate/route.ts:216`
- `lib/shift-rhythm/engine.ts:147`

### 3. **Shift Activity Level Not Always Available** 🟡 LOW
**Issue:** `shiftActivityLevel` is optional in many places:
- `lib/nutrition/calculateAdjustedCalories.ts` checks for it but may be null
- `lib/activity/calculateActivityScore.ts` handles null gracefully

**Impact:** Calorie adjustments may be less accurate for some users

**Recommendation:** Ensure shift activity level is always set when a shift exists

**Location:**
- `lib/nutrition/calculateAdjustedCalories.ts:179-186`
- `lib/activity/calculateActivityScore.ts:22`

### 4. **Shift Pattern Detection Could Be Enhanced** 🟢 LOW
**Issue:** The app doesn't automatically detect rotating patterns from logged shifts

**Impact:** Users with rotating shifts may not get optimal recommendations

**Recommendation:** Add automatic pattern detection based on logged shift history

**Location:**
- `lib/rota/comprehensivePatterns.ts` (has patterns, but not auto-detection)

---

## 🔍 **Detailed Findings by Feature**

### **Sleep Tracking & Shift Integration** ✅
- ✅ Sleep logs are matched to shift dates correctly
- ✅ Sleep quality calculations account for shift type
- ✅ Sleep predictions (`lib/sleep/predictSleep.ts`) use shift data:
  - Post-shift sleep predictions for night shifts
  - Pre-shift nap recommendations
  - Recovery sleep calculations

### **Circadian Rhythm Calculations** ✅
- ✅ Properly uses shift type in `SHIFT_EFFECT` mapping
- ✅ Sleep midpoint calculations account for shift schedules
- ✅ Falls back gracefully when shift data missing
- ✅ Precomputed scores include shift context

### **Shift Lag Detection** ✅
- ✅ Calculates misalignment between biological night and shifts
- ✅ Handles missing shift times (uses labels as fallback)
- ✅ Provides explanations and recommendations
- ✅ Edge case: Returns default when insufficient data

### **Meal Timing & Nutrition** ✅
- ✅ Adjusted calories account for shift activity level
- ✅ Meal timing recommendations adapt to shift schedules
- ✅ Post-shift meal suggestions for night workers
- ✅ Shift activity factor properly applied

### **Activity & Recovery** ✅
- ✅ Activity recommendations adapt to shift type
- ✅ Recovery scores account for shift patterns
- ✅ Step recommendations vary by shift type
- ✅ Movement plans generated based on shift schedules

### **Binge Risk Assessment** ✅
- ✅ Considers shift lag in binge risk calculation
- ✅ Accounts for quick turnarounds between shifts
- ✅ Uses shift type in risk scoring

---

## 🎯 **Recommendations Summary**

### **High Priority** (Do Soon)
1. ✅ **Already Good:** Core shift integration is solid
2. 🟡 **Standardize shift type classification** - Create shared utility function

### **Medium Priority** (Nice to Have)
3. 🟡 **Better fallback messaging** - Guide users to log shifts when data missing
4. 🟡 **Ensure shift activity level always set** - Improve calorie accuracy

### **Low Priority** (Future Enhancement)
5. 🟢 **Auto-detect shift patterns** - Analyze logged shifts to suggest patterns
6. 🟢 **Enhanced shift transition handling** - Better recommendations during shift changes

---

## ✅ **Verification Checklist**

- [x] Shift data flows from rota → calculations → UI
- [x] Circadian calculations use shift type
- [x] Shift rhythm scoring accounts for shift patterns
- [x] Shift lag detection works with shift data
- [x] Edge cases handled (no shifts, missing times)
- [x] UI displays shift-aware recommendations
- [x] Wearable data integrates with shift calculations
- [x] Meal timing adapts to shift schedules
- [x] Activity recommendations shift-aware
- [x] Error handling present throughout

---

## 📊 **Overall Assessment**

**Grade: A- (Excellent with Minor Improvements)**

Your app is **well-wired for shift workers**. The core functionality properly integrates shift data throughout all major calculations, and edge cases are handled gracefully. The main areas for improvement are standardization (shift type classification) and user guidance (encouraging shift logging).

**Key Strengths:**
- ✅ Comprehensive shift-aware calculations
- ✅ Good error handling and fallbacks
- ✅ Proper integration across all features
- ✅ UI properly displays shift context

**Areas to Enhance:**
- 🟡 Standardize shift type classification
- 🟡 Better user guidance when shift data missing
- 🟢 Future: Auto-detect shift patterns

---

**Generated by:** Comprehensive codebase audit  
**Next Steps:** Consider implementing the medium-priority improvements for even better shift worker support.

