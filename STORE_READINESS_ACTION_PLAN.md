# Store Readiness Action Plan

**Date**: January 2025  
**Status**: Pre-Store Submission  
**Focus**: Compliance, Trust, and User Experience Fixes

---

## 🎯 Executive Summary

**Current Status**: Production-ready for **web**, but **NOT yet store-ready** for iOS/Android.

**Core Product**: ✅ Strong - Sleep + Shift Rhythm + Rota + Coach + Nutrition + Calendar is a defensible feature set.

**Architecture**: ✅ Solid - Next 16 App Router + Supabase + hooks + cron precompute is sensible.

**Blockers**: ❌ Payments compliance, Settings functionality, Account deletion UI, and trust/accuracy issues.

---

## 🔴 CRITICAL BLOCKERS (Must Fix Before Store Submission)

### 1. **Payments: Stripe Checkout Non-Compliant** 🚨

**Issue**: Stripe Checkout inside the app violates Apple App Store and Google Play policies.

**Why It's a Blocker**:
- **Apple**: Requires In-App Purchase (StoreKit) for digital content/services unlocked in-app (Guideline 3.1.1)
- **Google Play**: Requires Google Play Billing for in-app digital purchases
- **Risk**: Immediate rejection from both stores

**Solutions** (Choose One):

#### Option A: Implement StoreKit + Play Billing (Recommended)
- Use **RevenueCat** (recommended) or native implementations
- Replace Stripe Checkout with native in-app purchases
- Keep Stripe for web-only subscriptions

**Implementation Steps**:
1. Set up RevenueCat project
2. Configure products in App Store Connect and Google Play Console
3. Replace `app/api/payment/create-checkout/route.ts` with RevenueCat purchases
4. Update `app/select-plan/page.tsx` to use native purchase flow
5. Handle subscription status with RevenueCat webhooks
6. Test thoroughly on both platforms

**Files to Modify**:
- `app/api/payment/create-checkout/route.ts` - Replace with RevenueCat
- `app/api/payment/verify/route.ts` - Replace with RevenueCat verification
- `app/api/subscription/cancel/route.ts` - Use RevenueCat cancel
- `app/select-plan/page.tsx` - Native purchase UI
- `components/pricing/` - Update to show native pricing

**Time Estimate**: 1-2 weeks

#### Option B: External Purchase Flow (Risky)
- Remove all in-app purchase flows
- Only allow web-based subscription signup
- Link to external website for purchases
- **Risk**: Still may violate policies if app directs users to external purchase
- **Only viable if**: Selling real-world services consumed outside app

**Not Recommended**: Policy interpretation is unclear, high risk of rejection.

---

### 2. **Account Deletion UI Must Work In-App** 🚨

**Issue**: Account deletion button exists but does nothing. Both stores require working in-app deletion.

**Why It's a Blocker**:
- **Apple**: Requires apps with account creation to support in-app deletion (Guideline 5.1.1)
- **Google Play**: Requires both in-app deletion AND web link for account deletion
- **Risk**: Immediate rejection from both stores

**Current Status**:
- ✅ API endpoint exists: `app/api/account/delete/route.ts`
- ❌ Settings UI button not wired: `app/(app)/settings/components/...`
- ❌ No web link for Google Play requirement

**Implementation Steps**:

1. **Wire Settings Delete Button**
   - Location: `app/(app)/settings/page.tsx` or settings components
   - Add confirmation modal/dialog
   - Call `POST /api/account/delete`
   - Handle success/error states
   - Logout user after deletion

2. **Add Web Link for Google Play**
   - Create `app/account/delete/page.tsx`
   - Allow web-based account deletion
   - Link from app settings: "Delete account on web"

3. **Verify Scheduled Deletion**
   - Ensure `supabase/migrations/20250128_add_scheduled_deletion.sql` is applied
   - Verify deletion is scheduled (e.g., 30-day grace period)
   - Test deletion flow end-to-end

**Files to Modify**:
- `app/(app)/settings/page.tsx` - Wire delete button
- `app/(app)/settings/components/DeleteAccountSection.tsx` - Create if not exists
- `app/api/account/delete/route.ts` - Verify implementation
- `app/account/delete/page.tsx` - Create web deletion page

**Time Estimate**: 2-3 days

---

### 3. **Settings Page Must Work** 🚨

**Issue**: Many settings inputs/toggles don't save. This is a launch-grade UX bug that will hurt retention and reviews.

**Why It's a Blocker**:
- User trust issue: App says "you can customize" but doesn't persist changes
- Will generate 1-star reviews: "Settings don't work"
- Retention killer: Users can't configure app to their needs

**Current Status**:
- ❌ Body weight input doesn't save
- ❌ Height & age "Edit" buttons do nothing
- ❌ Default shift pattern - no save functionality
- ❌ Ideal sleep window - no save functionality
- ❌ Wake reminders - no save functionality
- ❌ Mood/focus alerts toggle doesn't save
- ❌ Daily check-in reminder - no save
- ❌ AI Coach tone - no save
- ❌ Calorie adjustment aggressiveness - no save
- ❌ Macro split presets - no save
- ❌ Animations toggle doesn't save
- ❌ Export data button does nothing
- ❌ Delete account button does nothing

**Priority Order** (Most Important First):

#### Priority 1: Core Profile Settings
1. **Weight** (`weight_kg` in `profiles` table)
   - Location: Settings page weight input
   - Save to: `profiles.weight_kg`
   - API: `POST /api/profile` (already exists)

2. **Height** (`height_cm` in `profiles` table)
   - Location: Settings page height display/edit
   - Save to: `profiles.height_cm`
   - API: `POST /api/profile`

3. **Age/Date of Birth** (`date_of_birth` in `profiles` table)
   - Location: Settings page age display/edit
   - Save to: `profiles.date_of_birth`
   - Calculate age from DOB
   - API: `POST /api/profile`

#### Priority 2: Sleep & Shift Settings
4. **Ideal Sleep Window** (add to `user_settings` table)
   - Start time: `ideal_sleep_window_start` (time type)
   - End time: `ideal_sleep_window_end` (time type)
   - Create API endpoint if needed: `POST /api/settings/sleep-window`

5. **Default Shift Pattern** (use `user_shift_patterns` table)
   - Wire to existing pattern creation flow
   - Mark as "default" pattern
   - Use in predictions if no current shift

6. **Wake Reminders** (`wake_reminders` boolean in `user_settings`)
   - Toggle should save to `user_settings.wake_reminders`
   - Create API: `POST /api/settings/wake-reminders`

#### Priority 3: Notifications & Alerts
7. **Mood/Focus Alerts** (`mood_alerts_enabled` boolean in `user_settings`)
   - Toggle should save to `user_settings.mood_alerts_enabled`

8. **Daily Check-in Reminder** (`daily_checkin_reminder` boolean in `user_settings`)
   - Toggle should save to `user_settings.daily_checkin_reminder`

#### Priority 4: Coach & Nutrition Settings
9. **AI Coach Tone** (`ai_coach_tone` text in `user_settings`)
   - Dropdown/selector should save

10. **Calorie Adjustment Aggressiveness** (`calorie_aggressiveness` text in `user_settings`)
    - Slider/dropdown should save

11. **Macro Split Presets** (`macro_split_preset` text in `user_settings`)
    - Selector should save

#### Priority 5: UI Preferences
12. **Animations Toggle** (`animations_enabled` boolean in `user_settings`)
    - Toggle should save
    - Apply to app-wide animations

#### Priority 6: Data Management
13. **Export Data Button** (wires to existing `GET /api/data/export`)
    - Add confirmation
    - Download JSON file
    - Show success message

14. **Delete Account Button** (covered in Blocker #2 above)

**Implementation Strategy**:

1. **Verify Database Schema**
   - Check `supabase/migrations/20250122_user_settings.sql` is applied
   - Add missing columns if needed:
     ```sql
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ideal_sleep_window_start TIME;
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ideal_sleep_window_end TIME;
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS wake_reminders BOOLEAN DEFAULT false;
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mood_alerts_enabled BOOLEAN DEFAULT false;
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_checkin_reminder BOOLEAN DEFAULT false;
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_coach_tone TEXT;
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS calorie_aggressiveness TEXT;
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS macro_split_preset TEXT;
     ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS animations_enabled BOOLEAN DEFAULT true;
     ```

2. **Create Settings API Endpoint**
   - Create: `app/api/settings/route.ts`
   - Support: `GET` (fetch settings), `POST` (update settings)
   - Validate inputs
   - Handle errors gracefully

3. **Update Settings Hook**
   - Create/update: `lib/hooks/useSettings.ts`
   - Fetch settings on mount
   - Save settings optimistically
   - Handle loading/error states

4. **Wire Settings Components**
   - Update each settings component to use `useSettings` hook
   - Add loading states
   - Add success/error feedback
   - Disable inputs during save

5. **Hide/Disable Unimplemented Settings**
   - For settings not yet implemented, either:
     - Hide them completely, OR
     - Show them disabled with "Coming soon" label
   - Don't show interactive controls that don't work

**Files to Modify**:
- `app/api/settings/route.ts` - Create settings API
- `lib/hooks/useSettings.ts` - Update settings hook
- `app/(app)/settings/page.tsx` - Wire all inputs/toggles
- `app/(app)/settings/components/*.tsx` - Update all settings components
- `supabase/migrations/` - Add missing columns if needed

**Time Estimate**: 1 week (Priority 1-2), 1 more week (Priority 3-6)

---

### 4. **Health/AI Claims & Disclaimers** ⚠️

**Issue**: Health/wellbeing app with AI coach needs clear medical disclaimers.

**Why It Matters**:
- Store compliance: Health apps need clear disclaimers
- User trust: Users need to understand limitations
- Legal protection: Reduces liability risk

**Current Status**:
- ✅ Health Data Notice page exists: `app/health-data-notice/page.tsx`
- ❌ AI Coach doesn't clearly state "not medical advice"
- ❌ RED state warnings may imply medical diagnosis

**Implementation Steps**:

1. **Add Disclaimer to AI Coach**
   - Add banner to coach interface: "This is wellbeing guidance, not medical advice. Consult healthcare professionals for medical concerns."
   - Include in system prompt: Always remind users this is not medical advice when discussing health concerns
   - Add to coach chat footer

2. **Review RED State Language**
   - Ensure language is "wellbeing guidance" not "diagnosis"
   - Frame as "suggestions" not "requirements"
   - Use empathetic language, not alarmist

3. **Update Health Data Notice**
   - Ensure it clearly states app is not a medical device
   - Clarify AI coach is guidance, not diagnosis
   - Link from settings and coach interface

**Files to Modify**:
- `components/coach/CoachChatModal.tsx` - Add disclaimer banner
- `lib/coach/systemPrompt.ts` - Add medical disclaimer reminder
- `app/health-data-notice/page.tsx` - Review and update if needed

**Time Estimate**: 1-2 days

---

## 🟡 HIGH-IMPACT FIXES (Accuracy & Trust Issues)

### 5. **Fix Age/DOB in Sleep Calculations** 🟡

**Issue**: Age is set to `null` in sleep stage prediction and 7-day analysis.

**Why It Matters**:
- Accuracy: Age affects sleep architecture (REM, deep, light percentages)
- Trust: Users see "personalized" predictions but they're generic
- Credibility: Undermines value proposition

**Current Status**:
- ❌ `app/api/sleep/predict-stages/route.ts` line 48: `age: null`
- ❌ `app/api/sleep/7days/route.ts` lines 265-266: `age: null`

**Implementation Steps**:

1. **Get Age from Profile**
   - Check `profiles.date_of_birth` or `profiles.age`
   - Calculate age from DOB if DOB exists
   - Fallback to age field if DOB doesn't exist
   - Use default age (e.g., 30) if neither exists (log warning)

2. **Update Sleep Stage Prediction**
   - Location: `app/api/sleep/predict-stages/route.ts`
   - Fetch profile in route handler
   - Calculate age from DOB
   - Pass age to prediction function

3. **Update 7-Day Analysis**
   - Location: `app/api/sleep/7days/route.ts`
   - Fetch profile in route handler
   - Calculate age from DOB
   - Pass age to analysis function

4. **Ensure DOB Field Exists**
   - Verify `profiles.date_of_birth` column exists
   - If not, add migration: `supabase/migrations/20250130_add_date_of_birth.sql`

**Files to Modify**:
- `app/api/sleep/predict-stages/route.ts` - Get age from profile
- `app/api/sleep/7days/route.ts` - Get age from profile
- `supabase/migrations/` - Add DOB column if needed

**Time Estimate**: 1 day

---

### 6. **Remove Hardcoded Activity Values** 🟡

**Issue**: Hardcoded values (`weightKg={75}`, `sleepDebtHours: 0`, `lastSleepHours: null`) undermine credibility.

**Why It Matters**:
- Trust: Users expect personalized data
- Accuracy: Activity calculations depend on weight and sleep
- Credibility: Looks unprofessional

**Current Status**:
- ❌ `components/dashboard/pages/ActivityAndStepsPage.tsx` line 118: `lastSleepHours: null`
- ❌ Line 119: `sleepDebtHours: 0`
- ❌ Line 257: `weightKg={75}` (hardcoded)

**Implementation Steps**:

1. **Fetch Sleep Data**
   - Use `useTodaySleep` hook or fetch from `/api/sleep/today`
   - Get `lastSleepHours` from sleep data
   - Get `sleepDebtHours` from `/api/sleep/deficit`

2. **Fetch Profile Weight**
   - Use `useSettings` hook or fetch from `/api/profile`
   - Get `weightKg` from `profiles.weight_kg`
   - Handle null/undefined gracefully (show placeholder or default)

3. **Update Activity Page**
   - Replace hardcoded values with fetched data
   - Add loading states while fetching
   - Handle missing data gracefully

**Files to Modify**:
- `components/dashboard/pages/ActivityAndStepsPage.tsx` - Fetch real data
- Use existing hooks: `useTodaySleep`, `useSettings`

**Time Estimate**: 1 day

---

### 7. **Fix Meal Timing Hook (Verify)** 🟡

**Issue**: Documentation says meal timing hook uses mock data, but code review shows it fetches from API.

**Action**: Verify implementation is correct.

**Current Status**: 
- ✅ `lib/hooks/useMealTiming.ts` appears to fetch from `/api/meal-timing/today`
- ❓ Need to verify API endpoint works correctly
- ❓ Need to verify data is accurate

**Implementation Steps**:

1. **Verify API Endpoint**
   - Test: `GET /api/meal-timing/today`
   - Ensure it returns real data (not mock)
   - Verify all fields are populated

2. **Test Hook**
   - Test `useMealTiming` hook in component
   - Verify it fetches correctly
   - Verify error handling works

3. **Remove Any Mock Data**
   - Search codebase for mock meal timing data
   - Remove if found
   - Update documentation if incorrect

**Files to Review**:
- `lib/hooks/useMealTiming.ts` - Verify implementation
- `app/api/meal-timing/today/route.ts` - Verify API works

**Time Estimate**: 0.5 day (if already working) or 1-2 days (if needs fixing)

---

### 8. **Add Sleep Deficit to Shift Rhythm Hook** 🟡

**Issue**: `sleepDeficit` is returned as `null as any` with TODO comment.

**Why It Matters**:
- Components using this hook don't have sleep deficit data
- May cause UI bugs or missing information

**Current Status**:
- ❌ `lib/hooks/useShiftRhythm.ts` line 109: `sleepDeficit: null as any`

**Implementation Steps**:

1. **Fetch Sleep Deficit**
   - Add state for `sleepDeficit` in hook
   - Fetch from `/api/sleep/deficit` on mount
   - Handle loading/error states

2. **Update Return Type**
   - Update hook return type to include `sleepDeficit: number | null`
   - Remove `as any` cast

**Files to Modify**:
- `lib/hooks/useShiftRhythm.ts` - Add sleep deficit fetch

**Time Estimate**: 0.5 day

---

## 🟢 NICE-TO-HAVE (Can Iterate Post-Launch)

### 9. **Rota Pattern Persistence**

**Issue**: Shift patterns aren't being saved to database.

**Priority**: Lower (users can still create individual shifts)

**Time Estimate**: 2-3 days

---

## 📋 Implementation Priority

### Phase 1: Store Compliance (2-3 weeks)
1. ✅ **Payments**: Implement RevenueCat (StoreKit + Play Billing) - **1-2 weeks**
2. ✅ **Account Deletion**: Wire UI + web link - **2-3 days**
3. ✅ **Settings Page**: Wire Priority 1-2 settings (core profile + sleep/shift) - **1 week**
4. ✅ **Health Disclaimers**: Add to AI Coach - **1-2 days**

### Phase 2: Trust & Accuracy (1 week)
5. ✅ **Age/DOB in Sleep**: Fix calculations - **1 day**
6. ✅ **Hardcoded Values**: Remove from activity page - **1 day**
7. ✅ **Meal Timing**: Verify/fix hook - **0.5-2 days**
8. ✅ **Sleep Deficit**: Add to shift rhythm hook - **0.5 day**

### Phase 3: Polish (1 week)
9. ✅ **Settings Page**: Wire Priority 3-6 settings (notifications, coach, UI, data) - **1 week**

**Total Time Estimate**: **4-5 weeks** to store-ready

---

## ✅ Store Readiness Checklist

### Apple App Store
- [ ] In-App Purchase (StoreKit) implemented
- [ ] Account deletion UI works in-app
- [ ] Settings page saves user preferences
- [ ] Health disclaimers visible in coach
- [ ] Privacy Policy, Terms of Service, Health Data Notice pages
- [ ] App icons and screenshots prepared
- [ ] App Store listing content written

### Google Play
- [ ] Google Play Billing implemented (or RevenueCat)
- [ ] Account deletion UI works in-app
- [ ] Web link for account deletion available
- [ ] Settings page saves user preferences
- [ ] Health disclaimers visible in coach
- [ ] Privacy Policy, Terms of Service, Health Data Notice pages
- [ ] Play Store listing content written
- [ ] App icons and screenshots prepared

### Both Stores
- [ ] No hardcoded data (all personalized)
- [ ] Age/DOB used in calculations
- [ ] Export data functionality works
- [ ] Onboarding flow guides users to first "win"
- [ ] Deep link testing completed
- [ ] Auth/session persistence tested on mobile
- [ ] Error handling tested
- [ ] Loading states tested

---

## 🎯 Launch Strategy Recommendation

**Don't launch with everything perfect.** Launch with:

1. ✅ **Settings that work** (Priority 1-2 at minimum)
2. ✅ **Payments that are compliant** (StoreKit + Play Billing)
3. ✅ **Account deletion that works** (in-app + web)
4. ✅ **Clear onboarding** that gets users to first Body Clock Score + first "win"
5. ✅ **Health disclaimers** in coach interface

**Everything else can iterate post-launch** (Priority 3-6 settings, rota patterns, etc.)

**Focus on**: Getting users to their first "aha!" moment (Body Clock Score, first coach interaction, first sleep insight).

---

## 📝 Notes

- **Test thoroughly on real devices** before submission
- **Test auth/session persistence** on mobile (Capacitor WebView)
- **Test deep links** if you plan to support them
- **Prepare for review rejection** - have response plan ready
- **Consider beta testing** - Use TestFlight (iOS) and Play Console internal testing before production launch

---

**Last Updated**: January 2025  
**Next Review**: After Phase 1 completion
