# Settings Page Wiring Plan

## 🎯 Goal
Wire up all settings sections so users can save their preferences. Focus on shift worker-specific settings that matter most.

---

## 📊 Current State Analysis

### ✅ What's Already Working
1. **useSettings Hook** - `lib/hooks/useSettings.ts`
   - ✅ Loads profile data
   - ✅ `saveField()` function works
   - ✅ Optimistic updates
   - ✅ Error handling
   - ✅ Event dispatching (goal changes)

2. **Settings Components** - All have save functionality
   - ✅ `SettingsInput` - Debounced saves, loading states
   - ✅ `SettingsSelect` - Immediate saves, success feedback
   - ✅ `SettingsTimePicker` - Debounced saves
   - ✅ `ToggleSwitch` - Immediate saves with revert on failure
   - ✅ `SettingsCard` & `SettingsRow` - Layout components

3. **Already Wired Sections**
   - ✅ `NotificationsSection` - Mood/focus alerts toggle works
   - ✅ `ShiftsScheduleSection` - Shift pattern, sleep window, wake reminders (partially)
   - ✅ `AppearanceSection` - Theme selection works
   - ✅ `DataPrivacySection` - Logout and delete account work

4. **Profile Page** - Separate page with full functionality
   - ✅ Weight, height, goal, gender all save
   - ✅ Age calculated from DOB
   - ✅ Avatar upload works

### ❌ What Needs Wiring

1. **ProfilePlanSection** - Just a link, could add quick access
2. **NutritionSection** - Completely placeholder
3. **ShiftsScheduleSection** - Needs verification and fixes
4. **Missing Settings** - Several fields not exposed in UI

---

## 🗄️ Database Status Check

### Fields in Profile Type (lib/profile.ts)
```typescript
✅ weight_kg, height_cm, sex, date_of_birth, age, goal, units
✅ theme, sleep_goal_h, water_goal_ml, step_goal, tz
✅ shift_pattern, ideal_sleep_start, ideal_sleep_end
✅ wake_reminder_enabled, wake_reminder_trigger
✅ mood_focus_alerts_enabled
✅ daily_checkin_reminder, ai_coach_tone
✅ calorie_adjustment_aggressiveness, macro_split_preset
✅ animations_enabled
```

### Database Migration Status
- ✅ Migration exists: `supabase/migrations/20250122_user_settings.sql`
- ⚠️ Need to verify columns actually exist in database
- ⚠️ Some fields might need to be added

---

## 🎨 Proposed Settings Organization

### Section 1: Profile & Goals (ProfilePlanSection)
**Current**: Just links to `/profile` page  
**Proposed**: Keep link, but add quick access to:
- Goal selector (quick change without going to profile page)
- Units preference (metric/imperial) - if not in profile page

**Priority**: 🟡 Medium (profile page already handles this well)

---

### Section 2: Shifts & Schedule (ShiftsScheduleSection)
**Current**: Has UI but needs verification  
**Fields to Wire**:
1. ✅ **Default shift pattern** - Already wired, verify it works
2. ✅ **Ideal sleep window** - Already wired, verify it works  
3. ✅ **Wake reminder** - Already wired, verify it works
4. ❌ **Daily check-in reminder** - Not exposed, should add

**Priority**: 🔴 High (core shift worker feature)

**Action Items**:
- Verify database columns exist
- Test save functionality
- Add "Daily check-in reminder" setting

---

### Section 3: Notifications (NotificationsSection)
**Current**: Mood/focus alerts toggle works  
**Fields to Add**:
1. ✅ **Mood/focus alerts** - Already working
2. ❌ **Daily check-in reminder** - Should be here or in Shifts section
3. ❌ **Wake reminders** - Should be here or in Shifts section (currently in Shifts)

**Priority**: 🟡 Medium (one toggle works, could expand)

**Decision Needed**: Where should "Daily check-in reminder" live?
- Option A: In Notifications (makes sense - it's a notification)
- Option B: In Shifts & Schedule (makes sense - it's schedule-related)

**Recommendation**: Keep wake reminders in Shifts, add daily check-in to Notifications

---

### Section 4: Nutrition (NutritionSection)
**Current**: Completely placeholder  
**Fields to Wire**:
1. ❌ **Activity level** - Currently shows "Light" hardcoded
2. ❌ **Calorie adjustment aggressiveness** - Not exposed
3. ❌ **Macro split preset** - Not exposed

**Priority**: 🔴 High (nutrition is core feature)

**Proposed UI**:
```
Nutrition
├── Activity Level
│   └── Select: Very Light | Light | Moderate | Busy | Intense
├── Calorie Adjustment
│   └── Select: Gentle | Balanced | Aggressive
└── Macro Split
    └── Select: Balanced | High Protein | Custom
```

**Note**: Activity level should sync with activity logging if possible

---

### Section 5: AI Coach (New Section or in Notifications?)
**Current**: Not exposed  
**Fields to Wire**:
1. ❌ **AI Coach tone** - calm | direct

**Priority**: 🟡 Medium (nice to have)

**Decision Needed**: Where should this live?
- Option A: New "AI Coach" section
- Option B: In Notifications section
- Option C: In Profile section

**Recommendation**: New section or add to Notifications

---

### Section 6: Display (AppearanceSection)
**Current**: Theme works  
**Fields to Add**:
1. ✅ **Theme** - Already working
2. ❌ **Animations enabled** - Not exposed

**Priority**: 🟢 Low (animations are nice but not critical)

---

### Section 7: Data & Privacy (DataPrivacySection)
**Current**: Logout and delete work  
**Fields to Add**:
1. ❌ **Export data** - Button does nothing

**Priority**: 🟡 Medium (GDPR/compliance feature)

---

## 🏗️ Implementation Strategy

### Phase 1: Critical Settings (Do First) 🔴
**Goal**: Wire up settings that directly affect shift worker health calculations

1. **Verify Database Columns**
   - Check if all columns from migration exist
   - Run migration if needed
   - Test with a query

2. **Fix ShiftsScheduleSection**
   - Verify shift_pattern saves correctly
   - Verify ideal_sleep_start/end save correctly
   - Verify wake_reminder settings save correctly
   - Add "Daily check-in reminder" to this section

3. **Wire NutritionSection**
   - Add activity level selector
   - Add calorie adjustment aggressiveness
   - Add macro split preset
   - Connect to useSettings hook

**Estimated Time**: 2-3 hours

---

### Phase 2: Important Settings (Do Next) 🟡
**Goal**: Complete the settings experience

4. **Expand NotificationsSection**
   - Add daily check-in reminder selector
   - Keep mood/focus alerts (already works)

5. **Add AI Coach Section**
   - Create new section or add to existing
   - Add tone selector (calm/direct)

6. **Add Export Data**
   - Create API endpoint to export user data
   - Add button in DataPrivacySection
   - Generate JSON/CSV export

**Estimated Time**: 2-3 hours

---

### Phase 3: Polish (Nice to Have) 🟢
**Goal**: Complete all settings

7. **Add Animations Toggle**
   - Add to AppearanceSection
   - Implement global animation disable (if needed)

8. **Enhance ProfilePlanSection**
   - Add quick goal selector
   - Add units preference

**Estimated Time**: 1 hour

---

## 🎯 Recommended Approach

### Option A: Comprehensive (Recommended)
Wire everything in phases. Most complete, best UX.

**Pros**:
- Complete settings experience
- All features accessible
- Professional feel

**Cons**:
- More time investment
- More to test

**Best For**: Production-ready app

---

### Option B: Minimal Viable
Wire only critical settings that affect calculations.

**Pros**:
- Faster to implement
- Focus on what matters
- Less to break

**Cons**:
- Incomplete settings page
- Some features inaccessible

**Best For**: MVP or time-constrained

---

### Option C: Hybrid (My Recommendation)
Wire critical + important, skip polish for now.

**Do Now**:
- ✅ Phase 1: Critical Settings
- ✅ Phase 2: Important Settings

**Do Later**:
- ⏸️ Phase 3: Polish

**Why**: 
- Gets all functional settings working
- Leaves nice-to-haves for later
- Best balance of time vs. value

---

## 📝 Detailed Implementation Plan

### Step 1: Database Verification
```sql
-- Check which columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
  'shift_pattern', 'ideal_sleep_start', 'ideal_sleep_end',
  'wake_reminder_enabled', 'wake_reminder_trigger',
  'daily_checkin_reminder', 'ai_coach_tone',
  'calorie_adjustment_aggressiveness', 'macro_split_preset',
  'animations_enabled'
);
```

**Action**: Run migration if columns missing

---

### Step 2: Fix ShiftsScheduleSection
**File**: `app/(app)/settings/components/ShiftsScheduleSection.tsx`

**Issues to Fix**:
1. Verify `saveField` calls are correct
2. Add "Daily check-in reminder" setting
3. Test all saves work

**Changes Needed**:
- Add SettingsRow for daily_checkin_reminder
- Use SettingsSelect component
- Wire to saveField

---

### Step 3: Wire NutritionSection
**File**: `app/(app)/settings/components/NutritionSection.tsx`

**Current**: Placeholder with hardcoded "Light"  
**New**: Full section with 3 settings

**Implementation**:
```tsx
<SettingsCard title="Nutrition" subtitle="Adjust how Shift Coach calculates your nutrition.">
  <SettingsRow
    label="Activity Level"
    description="Your typical shift intensity"
    right={
      <SettingsSelect
        value={settings?.activity_level || 'moderate'}
        onChange={(v) => saveField('activity_level', v)}
        options={[
          { value: 'very_light', label: 'Very Light' },
          { value: 'light', label: 'Light' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'busy', label: 'Busy' },
          { value: 'intense', label: 'Intense' },
        ]}
      />
    }
  />
  {/* Similar for calorie_adjustment_aggressiveness and macro_split_preset */}
</SettingsCard>
```

**Note**: Need to check if `activity_level` is stored in profile or activity_logs

---

### Step 4: Expand NotificationsSection
**File**: `app/(app)/settings/components/NotificationsSection.tsx`

**Add**:
- Daily check-in reminder selector
- Keep existing mood/focus alerts toggle

---

### Step 5: Add AI Coach Section
**Option A**: New file `app/(app)/settings/components/CoachSection.tsx`  
**Option B**: Add to NotificationsSection

**Recommendation**: New section for clarity

---

### Step 6: Export Data
**File**: `app/api/profile/export/route.ts` (new)

**Functionality**:
- Export all user data (sleep, shifts, profile, etc.)
- Return JSON or CSV
- Include all tables user has data in

---

## 🤔 Decisions Needed

### 1. Activity Level Storage ✅ RESOLVED
**Finding**: Activity level is stored in `activity_logs.shift_activity_level` (per-shift logging)

**Decision Needed**: Should we add a "default activity level" to profiles?
- Option A: Add `default_activity_level` to profiles (used when no activity logged today)
- Option B: Don't show in settings (users log it per shift)
- Option C: Show most recent activity level (read-only, from activity_logs)

**Recommendation**: Option A - Add `default_activity_level` to profiles
- Used as fallback when calculating calories if no activity logged
- Users can set their typical shift intensity
- Makes nutrition calculations more accurate

---

### 2. Daily Check-in Reminder Location
**Question**: Where should "Daily check-in reminder" live?
- Option A: NotificationsSection (it's a notification)
- Option B: ShiftsScheduleSection (it's schedule-related)

**Recommendation**: NotificationsSection (makes more sense as a notification)

---

### 3. AI Coach Tone Location
**Question**: Where should "AI Coach tone" live?
- Option A: New "AI Coach" section
- Option B: In NotificationsSection
- Option C: In ProfilePlanSection

**Recommendation**: New section for clarity and future expansion

---

### 4. Export Data Format
**Question**: What format for data export?
- Option A: JSON (easy to parse, good for developers)
- Option B: CSV (easy to open in Excel)
- Option C: Both (let user choose)

**Recommendation**: JSON first (can add CSV later)

---

## 🎨 UX Considerations

### Save Feedback
- ✅ Components already have loading spinners
- ✅ Components already have success checkmarks
- ✅ Toast notifications for errors
- ✅ Optimistic updates (feels instant)

### Validation
- ✅ Number inputs have min/max
- ✅ Selects have predefined options
- ✅ Time pickers validate format
- ⚠️ Need to add validation for edge cases

### Error Handling
- ✅ useSettings hook has error handling
- ✅ Components revert on failure
- ✅ Toast notifications show errors
- ⚠️ Need to handle network failures gracefully

---

## 📋 Testing Checklist

### For Each Setting:
- [ ] Loads current value correctly
- [ ] Saves to database on change
- [ ] Shows loading state during save
- [ ] Shows success feedback after save
- [ ] Reverts on save failure
- [ ] Shows error message on failure
- [ ] Persists after page refresh
- [ ] Works on mobile

### Integration Tests:
- [ ] Settings affect calculations (e.g., shift_pattern affects Body Clock Score)
- [ ] Settings affect UI (e.g., theme changes appearance)
- [ ] Settings affect notifications (e.g., wake_reminder_enabled)
- [ ] Multiple settings can be changed in sequence
- [ ] Settings work when offline (graceful degradation)

---

## 🚀 Quick Start Plan

### If We Want to Move Fast:

**Step 1** (30 min): Verify database columns exist
**Step 2** (1 hour): Wire NutritionSection (3 settings)
**Step 3** (30 min): Add daily check-in to NotificationsSection
**Step 4** (30 min): Test everything works

**Total**: ~2.5 hours for critical settings

---

## 💡 My Recommendations

### Priority Order:
1. **NutritionSection** - Most visible, affects core features
2. **ShiftsScheduleSection** - Verify and fix existing
3. **NotificationsSection** - Add daily check-in
4. **AI Coach Section** - New section for tone
5. **Export Data** - Important for compliance
6. **Animations Toggle** - Nice to have

### Approach:
- Start with **Option C: Hybrid**
- Wire Phase 1 + Phase 2
- Skip Phase 3 for now
- Test thoroughly
- Iterate based on user feedback

### Key Principles:
1. **Shift Worker First** - Prioritize settings that affect health calculations
2. **Simple & Clear** - Don't overwhelm with too many options
3. **Immediate Feedback** - Users should know their changes saved
4. **Graceful Degradation** - Handle errors without breaking UX

---

## ❓ Questions for You

1. **Activity Level**: Should this be a profile setting or calculated from logs?
2. **Daily Check-in**: Notifications or Shifts section?
3. **AI Coach Tone**: New section or add to existing?
4. **Export Data**: JSON, CSV, or both?
5. **Priority**: Do you want comprehensive (all settings) or minimal (critical only)?

---

## 🎯 Next Steps

Once you decide on the approach, I'll:
1. Verify database schema
2. Implement the chosen settings
3. Test thoroughly
4. Document any edge cases

**Ready to proceed when you are!** 🚀

