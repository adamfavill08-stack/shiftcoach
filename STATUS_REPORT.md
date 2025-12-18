# Shift Coach - Status Report & Recommendations

**Date**: Current  
**Focus**: Shift Worker Health & Wellbeing App

---

## ✅ What's Working Well

### Core Functionality
1. **Sleep Tracking System** ✅
   - Sleep logging with classification (Main Sleep, Post-Shift Recovery, Pre-Shift Nap, etc.)
   - Sleep prediction based on shift patterns
   - Sleep deficit calculation
   - Shift-aware 24-hour day tracking (07:00 → 07:00)
   - Full CRUD operations with automatic recalculations

2. **Shift Rhythm & Body Clock** ✅
   - Body Clock Score calculation (0-100)
   - Shift lag detection and metrics
   - Social jetlag tracking
   - Circadian rhythm analysis
   - Automatic recalculation on sleep/shift changes

3. **Nutrition Advice System** ✅
   - Shift-adjusted calorie calculations
   - Macro target recommendations (protein, carbs, fats)
   - Meal timing suggestions based on shift schedule
   - Binge risk assessment
   - Goal-based adjustments (lose/maintain/gain)

4. **AI Coach** ✅
   - Adaptive coaching based on user state (RED/AMBER/GREEN)
   - Shift-aware recommendations
   - Empathetic, non-judgmental tone
   - Context-aware advice

5. **Activity & Recovery** ✅
   - Step tracking
   - Activity level logging
   - Recovery score calculation
   - Shift-appropriate activity recommendations

6. **Shift Management** ✅
   - Rota/schedule creation and management
   - Shift pattern recognition
   - Shift type classification (day/night/late/off)

7. **Mood & Progress Tracking** ✅
   - Mood and focus logging
   - Weekly progress summaries
   - Weekly goals system

---

## ⚠️ Issues That Need Attention

### 1. **Settings Page - Many Placeholder Features** 🔴 HIGH PRIORITY
**Location**: `app/(app)/settings/`

**Issues**:
- Body weight input doesn't save
- Height & age "Edit" buttons do nothing
- Default shift pattern - no database field, no save
- Ideal sleep window - no database field, no save
- Wake reminders - no database field, no save
- Mood/focus alerts toggle doesn't save
- Daily check-in reminder - no database field
- AI Coach tone - no database field
- Calorie adjustment aggressiveness - no database field
- Macro split presets - no database field
- Animations toggle doesn't save
- Export data button does nothing
- Delete account button does nothing

**Impact**: Users can't customize their experience, reducing app value

**Recommendation**: 
- Implement database migrations for missing fields (see `SETTINGS_REDESIGN_PLAN.md`)
- Wire up all settings to save functionality
- Prioritize: weight, height, age, shift pattern, sleep window

### 2. **Meal Timing Hook Using Mock Data** 🟡 MEDIUM PRIORITY
**Location**: `lib/hooks/useMealTiming.ts`

**Issue**: `useMealTiming` hook returns hardcoded mock data instead of fetching from `/api/meal-timing/today`

**Impact**: Meal timing coach page shows fake data

**Recommendation**: 
- Connect hook to real API endpoint
- Remove mock data
- Add proper loading and error states

### 3. **Missing Age/DOB in Sleep Calculations** 🟡 MEDIUM PRIORITY
**Locations**: 
- `app/api/sleep/predict-stages/route.ts` (line 48)
- `app/api/sleep/7days/route.ts` (lines 265-266)

**Issue**: Age is set to `null` in sleep stage prediction and 7-day analysis

**Impact**: Sleep stage predictions may be less accurate (age affects sleep architecture)

**Recommendation**:
- Add age calculation from DOB in profile
- Or add age field to profile if DOB doesn't exist
- Update sleep calculations to use age

### 4. **Rota Setup Not Persisting** 🟡 MEDIUM PRIORITY
**Locations**:
- `app/(app)/rota/setup/page.tsx` (line 276)
- `components/rota/RotaSetupPage.tsx` (line 680)

**Issue**: TODO comments indicate shift patterns aren't being saved to database

**Impact**: Users can create patterns but they don't persist

**Recommendation**:
- Implement database persistence for shift patterns
- Create API endpoint if needed
- Save pattern with start/end dates

### 5. **Activity Page Missing Profile Data** 🟢 LOW PRIORITY
**Location**: `components/dashboard/pages/ActivityAndStepsPage.tsx`

**Issues**:
- Line 118: `lastSleepHours: null` - TODO to get from sleep data
- Line 119: `sleepDebtHours: 0` - TODO to get from sleep deficit
- Line 257: `weightKg={75}` - TODO to get from profile

**Impact**: Activity calculations may be less accurate

**Recommendation**:
- Fetch sleep data for last sleep hours
- Fetch sleep deficit from API
- Get weight from profile instead of hardcoded value

### 6. **Sleep Deficit Not in Shift Rhythm Hook** 🟢 LOW PRIORITY
**Location**: `lib/hooks/useShiftRhythm.ts` (line 109)

**Issue**: `sleepDeficit` is returned as `null as any` with TODO comment

**Impact**: Components using this hook don't have sleep deficit data

**Recommendation**:
- Add sleep deficit to hook state
- Fetch from `/api/sleep/deficit` endpoint
- Update return type properly

### 7. **Empty Meals Directory** 🟢 LOW PRIORITY
**Location**: `app/(app)/meals/`

**Issue**: Empty directory left after removing meal logging

**Recommendation**: Remove directory (or keep if planning to add advice-only meal features)

---

## 🚀 Recommended Improvements for Shift Workers

### 1. **Enhanced Sleep Features** 
- **Sleep Quality Insights**: Track what affects sleep quality (caffeine timing, meal timing, shift transitions)
- **Recovery Recommendations**: More specific advice on recovery sleep duration based on shift type
- **Sleep Debt Visualization**: Better visual representation of accumulated sleep debt
- **Quick Sleep Logging**: Make it even faster to log sleep after night shifts

### 2. **Better Shift Pattern Recognition**
- **Automatic Pattern Detection**: Analyze logged shifts to detect patterns automatically
- **Pattern Templates**: Common patterns (4-on-4-off, rotating, etc.) as starting points
- **Shift Transition Warnings**: Alert users before difficult transitions (e.g., night to day)

### 3. **Nutrition Enhancements**
- **Meal Prep Suggestions**: Shift-appropriate meal prep ideas
- **Caffeine Timing Advisor**: When to cut off caffeine based on shift end time
- **Hydration Reminders**: Smart reminders based on shift type and activity level
- **Energy Management**: Advice on meal timing to maintain energy through long shifts

### 4. **Recovery & Wellbeing**
- **Recovery Score Breakdown**: Show what's contributing to recovery score
- **Stress Indicators**: Track stress levels and correlate with shift patterns
- **Social Connection**: Reminders to maintain social connections despite irregular schedules
- **Mental Health Check-ins**: More frequent, gentle check-ins during difficult shift periods

### 5. **Coaching Improvements**
- **Proactive Coaching**: Reach out during high-risk periods (e.g., after night shifts)
- **Shift-Specific Tips**: Library of tips for different shift scenarios
- **Success Stories**: Share anonymized success stories from other shift workers
- **Goal Adaptation**: Automatically adjust goals during difficult periods

### 6. **Data & Insights**
- **Trend Analysis**: Show long-term trends in sleep, recovery, mood
- **Shift Pattern Impact**: Visualize how different shift patterns affect health metrics
- **Predictive Insights**: "If you continue this pattern, you'll likely experience..."
- **Export Functionality**: Allow users to export their data for personal analysis

### 7. **Notifications & Reminders**
- **Smart Notifications**: Context-aware reminders (e.g., don't remind about sleep during a night shift)
- **Shift Transition Alerts**: Reminders before difficult transitions
- **Recovery Reminders**: Gentle reminders to prioritize recovery
- **Goal Check-ins**: Non-intrusive check-ins on weekly goals

---

## 📋 Immediate Action Items

### Critical (Do First)
1. ✅ **Fix Next.js Config** - Merged duplicate configs (DONE)
2. ✅ **Update README** - Created shift worker-focused README (DONE)
3. 🔴 **Settings Page** - Wire up weight, height, age saving
4. 🔴 **Settings Page** - Add database fields for shift pattern, sleep window

### High Priority (This Week)
5. 🟡 **Meal Timing Hook** - Connect to real API instead of mock data
6. 🟡 **Age in Sleep Calculations** - Add age/DOB support
7. 🟡 **Rota Persistence** - Save shift patterns to database

### Medium Priority (This Month)
8. 🟢 **Activity Page** - Fetch real sleep and profile data
9. 🟢 **Sleep Deficit in Hook** - Add to useShiftRhythm hook
10. 🟢 **Settings Remaining** - Wire up all other settings fields

---

## 🎯 Strategic Recommendations

### For Shift Worker Health Focus

1. **Prioritize Recovery Over Performance**
   - When users are in RED state, focus on safety and rest
   - Lower expectations during difficult shift periods
   - Celebrate small wins (e.g., "You got 5 hours of sleep - that's better than yesterday")

2. **Make Everything Shift-Aware**
   - All features should consider current shift type
   - Recommendations should adapt to shift schedule
   - UI should reflect shift context (e.g., "Your night shift day" vs "Your off day")

3. **Reduce Friction**
   - Make logging as quick as possible (one-tap where possible)
   - Pre-fill data when possible (e.g., predict sleep times)
   - Don't require perfect data - accept estimates

4. **Build Trust Through Empathy**
   - Never shame users for missed goals
   - Acknowledge that shift work is hard
   - Focus on progress, not perfection
   - Use language that shows understanding

5. **Focus on What Matters**
   - Sleep quality over quantity (for shift workers)
   - Recovery between shifts
   - Circadian alignment
   - Sustainable habits, not perfection

---

## 🔍 Code Quality Notes

### ✅ Good Practices Found
- Comprehensive TypeScript types
- Proper error handling in API routes
- Event-driven updates for real-time UI
- Debouncing to prevent excessive renders
- Mobile-first responsive design
- Consistent design system

### ⚠️ Areas for Improvement
- Some TODOs need attention (see above)
- Settings page needs completion
- Some hardcoded values should come from profile/API
- Mock data in hooks should be replaced with real data

---

## 📊 Testing Recommendations

### User Testing Priorities
1. **Sleep Logging Flow** - Test with actual shift workers
2. **Shift Pattern Setup** - Ensure it's intuitive
3. **AI Coach Responses** - Verify empathy and helpfulness
4. **Settings Page** - Test all save functionality
5. **Mobile Experience** - Ensure it works well on phones (shift workers are mobile)

### Technical Testing
1. **API Endpoints** - Test all endpoints with various shift patterns
2. **Edge Cases** - Test with missing data, irregular patterns
3. **Performance** - Check load times, especially on mobile
4. **Error Handling** - Test error states and recovery

---

## 🎉 What Makes This App Special

1. **Shift Worker Focus** - Built specifically for shift workers, not adapted from a general health app
2. **Circadian Science** - Based on real circadian rhythm research
3. **Empathetic Design** - Understands that shift work is hard
4. **Adaptive Intelligence** - Adjusts recommendations based on current state
5. **Comprehensive Tracking** - Sleep, nutrition, activity, recovery, mood - all in one place
6. **AI Coaching** - Personalized, context-aware advice

---

## 📞 Next Steps

1. **Review this report** with the team
2. **Prioritize action items** based on user needs
3. **Implement critical fixes** (settings page, meal timing hook)
4. **Test with real shift workers** to validate improvements
5. **Iterate based on feedback** - shift workers know what they need

---

**Remember**: This app is for people doing hard, essential work. Every feature should make their lives easier, not add stress. Keep the empathy, keep the science, keep it practical.

