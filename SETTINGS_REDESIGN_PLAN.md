# Settings Page Redesign Plan
## Ultra Premium & Fully Functional

---

## Current State Analysis

### ✅ What Actually Works:
- **Goal** - Saves to `profiles.goal` (recently fixed)
- **Theme** - Saves to `profiles.theme` (works via next-themes)

### ❌ What's Dummy/Placeholder:
- **Body weight** - Input exists but doesn't save
- **Height & age** - "Edit" button does nothing
- **Default shift pattern** - No database field, no save
- **Ideal sleep window** - No database field, no save
- **Default wake reminder** - No database field, no save
- **Low mood/focus alerts** - Toggle exists but doesn't save
- **Daily check-in reminder** - No database field, no save
- **AI Coach tone** - No database field, no save
- **Calorie adjustment aggressiveness** - No database field, no save
- **Macro split presets** - No database field, no save
- **Default logging method** - No database field, no save
- **Animations** - Toggle exists but doesn't save
- **Export data** - Button does nothing
- **Delete account** - Button does nothing

---

## Database Schema Analysis

### Existing in `profiles` table:
- ✅ `goal` - 'lose' | 'maintain' | 'gain'
- ✅ `weight_kg` - numeric
- ✅ `height_cm` - int
- ✅ `sex` - 'male' | 'female' | 'other'
- ✅ `age` - (need to check if exists)
- ✅ `sleep_goal_h` - numeric
- ✅ `water_goal_ml` - numeric
- ✅ `step_goal` - numeric
- ✅ `units` - 'metric' | 'imperial'
- ✅ `theme` - 'light' | 'dark' | 'system'
- ✅ `tz` - text (timezone)

### Missing - Need to Create:
- ❌ `age` - int (if not exists)
- ❌ `shift_pattern` - text (e.g., 'rotating', 'mostly_days', 'mostly_nights', 'custom')
- ❌ `ideal_sleep_start` - time (HH:MM format)
- ❌ `ideal_sleep_end` - time (HH:MM format)
- ❌ `wake_reminder_enabled` - boolean
- ❌ `wake_reminder_trigger` - text ('off', 'after_night_shift', 'every_day')
- ❌ `mood_focus_alerts_enabled` - boolean
- ❌ `daily_checkin_reminder` - text ('off', 'morning', 'evening')
- ❌ `ai_coach_tone` - text ('calm', 'direct')
- ❌ `calorie_adjustment_aggressiveness` - text ('gentle', 'balanced', 'aggressive')
- ❌ `macro_split_preset` - text ('balanced', 'high_protein', 'custom')
- ❌ `default_logging_method` - text ('manual', 'photo', 'barcode')
- ❌ `animations_enabled` - boolean

---

## Premium Design Vision

### Visual Hierarchy:
1. **Hero Header** - Large, clear title with subtle gradient
2. **Section Cards** - Elevated cards with subtle shadows, rounded corners
3. **Settings Rows** - Clean, spacious, with clear labels and descriptions
4. **Interactive Elements** - Smooth transitions, hover states, loading indicators
5. **Success Feedback** - Subtle toast notifications, checkmarks on save
6. **Empty States** - Helpful placeholders when data is missing

### Design Principles:
- **Spacing**: Generous padding, breathing room between sections
- **Typography**: Clear hierarchy, readable sizes
- **Colors**: Subtle gradients, premium color palette
- **Icons**: Lucide icons for visual clarity
- **Animations**: Subtle, purposeful (fade, slide, scale)
- **Feedback**: Immediate visual response to actions

---

## Implementation Plan

### Phase 1: Database & Backend Foundation

#### 1.1 Create Settings Migration
**File**: `supabase/migrations/[timestamp]_user_settings.sql`

```sql
-- Add missing columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age int,
  ADD COLUMN IF NOT EXISTS shift_pattern text CHECK (shift_pattern IN ('rotating', 'mostly_days', 'mostly_nights', 'custom')) DEFAULT 'rotating',
  ADD COLUMN IF NOT EXISTS ideal_sleep_start time,
  ADD COLUMN IF NOT EXISTS ideal_sleep_end time,
  ADD COLUMN IF NOT EXISTS wake_reminder_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wake_reminder_trigger text CHECK (wake_reminder_trigger IN ('off', 'after_night_shift', 'every_day')) DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS mood_focus_alerts_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_checkin_reminder text CHECK (daily_checkin_reminder IN ('off', 'morning', 'evening')) DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS ai_coach_tone text CHECK (ai_coach_tone IN ('calm', 'direct')) DEFAULT 'calm',
  ADD COLUMN IF NOT EXISTS calorie_adjustment_aggressiveness text CHECK (calorie_adjustment_aggressiveness IN ('gentle', 'balanced', 'aggressive')) DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS macro_split_preset text CHECK (macro_split_preset IN ('balanced', 'high_protein', 'custom')) DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS default_logging_method text CHECK (default_logging_method IN ('manual', 'photo', 'barcode')) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS animations_enabled boolean DEFAULT true;
```

#### 1.2 Update Profile Type
**File**: `lib/profile.ts`

Add all new fields to `Profile` type.

---

### Phase 2: Premium UI Components

#### 2.1 Enhanced SettingsCard Component
**File**: `components/settings/SettingsCard.tsx`

**Enhancements**:
- Add subtle gradient backgrounds
- Add icon support for section headers
- Add loading states
- Add success checkmark animations
- Improve spacing and typography

#### 2.2 New Premium Components

**SettingsInput** - Premium input with:
- Floating labels
- Validation states
- Loading indicators
- Success checkmarks

**SettingsSelect** - Premium dropdown with:
- Custom styled select
- Smooth transitions
- Loading states
- Icon indicators

**SettingsToggle** - Enhanced toggle with:
- Smooth animations
- Color-coded states
- Loading indicators

**SettingsTimePicker** - For sleep window:
- Time input with validation
- Visual time picker
- Format: HH:MM

**SettingsModal** - For complex edits:
- Slide-in modal
- Backdrop blur
- Smooth animations

#### 2.3 Toast Notification System
**File**: `components/ui/Toast.tsx`

- Success toasts (green checkmark)
- Error toasts (red X)
- Info toasts (blue info)
- Auto-dismiss after 3s
- Stack multiple toasts

---

### Phase 3: Functional Settings Sections

#### 3.1 Profile & Plan Section

**Fields to Implement**:
1. **Goal** ✅ (Already works)
   - Dropdown: Lose / Maintain / Gain
   - Auto-saves on change
   - Shows loading state
   - Dispatches `goalChanged` event

2. **Body Weight**
   - Number input with unit (kg/lb based on `units`)
   - Debounced save (save after 1s of no typing)
   - Validation (min: 30kg, max: 200kg)
   - Shows current value
   - Success toast on save

3. **Height**
   - Number input with unit (cm/in based on `units`)
   - Debounced save
   - Validation (min: 100cm, max: 250cm)
   - Shows current value

4. **Age**
   - Number input
   - Debounced save
   - Validation (min: 16, max: 100)
   - Shows current value

5. **Units Toggle**
   - Switch between Metric / Imperial
   - Updates all displayed units immediately
   - Saves to `profiles.units`

**Design**:
- Group related fields (weight, height, age)
- Show unit conversion helper
- Premium input styling

---

#### 3.2 Shifts & Schedule Section

**Fields to Implement**:
1. **Default Shift Pattern**
   - Dropdown: Rotating / Mostly Days / Mostly Nights / Custom
   - Saves to `profiles.shift_pattern`
   - Shows current selection
   - Info tooltip explaining each option

2. **Ideal Sleep Window**
   - Time picker for start time
   - Time picker for end time
   - Shows duration calculation
   - Saves to `profiles.ideal_sleep_start` and `ideal_sleep_end`
   - Visual time range display

3. **Default Wake Reminder**
   - Toggle: Enable/Disable
   - Dropdown (if enabled): Off / After night shifts / Every day
   - Saves to `profiles.wake_reminder_enabled` and `wake_reminder_trigger`
   - Conditional rendering

**Design**:
- Visual sleep window timeline
- Shift pattern icons
- Helpful descriptions

---

#### 3.3 Notifications & AI Coach Section

**Fields to Implement**:
1. **Low Mood / Focus Alerts**
   - Toggle switch
   - Saves to `profiles.mood_focus_alerts_enabled`
   - Shows current state
   - Description explains what it does

2. **Daily Check-in Reminder**
   - Dropdown: Off / Morning / Evening
   - Saves to `profiles.daily_checkin_reminder`
   - Shows time picker if enabled

3. **AI Coach Tone**
   - Dropdown: Calm & Supportive / More Direct
   - Saves to `profiles.ai_coach_tone`
   - Preview example text
   - Shows current selection

**Design**:
- Toggle with smooth animation
- Clear descriptions
- Example previews for AI tone

---

#### 3.4 Nutrition & Logging Section

**Fields to Implement**:
1. **Calorie Adjustment Aggressiveness**
   - Dropdown: Gentle / Balanced / More Aggressive
   - Saves to `profiles.calorie_adjustment_aggressiveness`
   - Info tooltip explaining impact
   - Shows current selection

2. **Macro Split Presets**
   - Dropdown: Balanced / Higher Protein / Custom
   - Saves to `profiles.macro_split_preset`
   - Shows macro breakdown preview
   - Custom option opens advanced modal

3. **Default Logging Method**
   - Dropdown: Manual / Photo (AI) / Barcode Scan
   - Saves to `profiles.default_logging_method`
   - Shows icon for each method
   - Description of each option

**Design**:
- Visual macro breakdown chart
- Aggressiveness slider (optional)
- Method icons

---

#### 3.5 Appearance Section

**Fields to Implement**:
1. **Theme** ✅ (Already works)
   - Dropdown: Match System / Light / Dark
   - Shows current system theme
   - Saves to `profiles.theme`

2. **Animations**
   - Toggle switch
   - Saves to `profiles.animations_enabled`
   - Preview animation on toggle
   - Description of what gets disabled

**Design**:
- Theme preview cards
- Animation demo

---

#### 3.6 Data & Privacy Section

**Actions to Implement**:
1. **Export My Data**
   - Button triggers API call
   - Shows loading state
   - Downloads CSV/JSON file
   - Includes: sleep logs, meal logs, shifts, mood/focus, activity
   - Success toast

2. **Delete Account**
   - Button opens confirmation modal
   - Requires typing "DELETE" to confirm
   - Shows warning about data loss
   - Calls delete API
   - Redirects to sign-in

3. **Log Out** ✅ (Already works)
   - Button with loading state
   - Signs out and redirects

**Design**:
- Warning colors for destructive actions
- Confirmation modals
- Clear data export format

---

### Phase 4: Advanced Features

#### 4.1 Settings Search
- Search bar at top
- Filters settings by keyword
- Highlights matching sections

#### 4.2 Settings Categories
- Collapsible sections
- Remember collapsed state
- Quick jump navigation

#### 4.3 Settings Backup/Restore
- Export settings as JSON
- Import settings from JSON
- Useful for switching devices

#### 4.4 Settings History
- Show when each setting was last changed
- Undo recent changes
- Reset to defaults option

---

## Technical Implementation Details

### State Management Strategy

**Option A: Single State Object** (Recommended)
```typescript
const [settings, setSettings] = useState<Profile | null>(null)
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState<string | null>(null) // field being saved
```

**Option B: Individual State per Field**
- More granular control
- Better for complex validations
- More code to maintain

**Recommendation**: Option A with debounced saves

---

### Save Strategy

**Debounced Auto-Save**:
- Input fields: Save 1s after typing stops
- Dropdowns: Save immediately on change
- Toggles: Save immediately on toggle
- Time pickers: Save 1s after change

**Optimistic Updates**:
- Update UI immediately
- Show loading indicator
- Revert on error
- Show success toast

---

### Error Handling

**Validation**:
- Client-side validation before save
- Show inline error messages
- Prevent invalid saves

**Error Recovery**:
- Show error toast
- Revert to previous value
- Allow retry
- Log errors to console

---

### Performance Optimizations

1. **Lazy Load Settings**:
   - Load settings on mount
   - Cache in localStorage
   - Refresh on focus

2. **Debounce Saves**:
   - Prevent excessive API calls
   - Batch multiple changes

3. **Optimistic Updates**:
   - Instant UI feedback
   - Background save

---

## File Structure

```
app/(app)/settings/
  ├── page.tsx (main settings page)
  ├── components/
  │   ├── ProfilePlanSection.tsx
  │   ├── ShiftsScheduleSection.tsx
  │   ├── NotificationsSection.tsx
  │   ├── NutritionSection.tsx
  │   ├── AppearanceSection.tsx
  │   └── DataPrivacySection.tsx

components/settings/
  ├── SettingsCard.tsx (enhanced)
  ├── SettingsRow.tsx (enhanced)
  ├── SettingsInput.tsx (new)
  ├── SettingsSelect.tsx (new)
  ├── SettingsToggle.tsx (enhanced)
  ├── SettingsTimePicker.tsx (new)
  └── SettingsModal.tsx (new)

components/ui/
  └── Toast.tsx (new)

lib/
  ├── profile.ts (updated with new fields)
  └── hooks/
      └── useSettings.ts (new - settings management hook)
```

---

## User Experience Flow

### Loading State:
1. Show skeleton loaders
2. Load profile data
3. Populate all fields
4. Hide loaders

### Saving State:
1. User changes setting
2. Show loading indicator on field
3. Optimistic update UI
4. Save to database
5. Show success checkmark
6. Hide loading indicator
7. Dispatch events if needed (e.g., `goalChanged`)

### Error State:
1. Show error toast
2. Revert UI change
3. Show error message
4. Allow retry

---

## Success Metrics

- ✅ All settings save to database
- ✅ All settings load from database
- ✅ Smooth animations and transitions
- ✅ Clear visual feedback
- ✅ No console errors
- ✅ Fast load times (<500ms)
- ✅ Responsive design
- ✅ Accessible (keyboard navigation, screen readers)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Database migration
- Update Profile type
- Create useSettings hook
- Basic save/load functionality

### Phase 2: Core Settings (Week 2)
- Profile & Plan section
- Shifts & Schedule section
- Notifications section
- Appearance section

### Phase 3: Advanced Settings (Week 3)
- Nutrition section
- Data & Privacy section
- Toast notifications
- Error handling

### Phase 4: Polish (Week 4)
- Premium styling
- Animations
- Performance optimization
- Testing & bug fixes

---

## Design Mockups (Conceptual)

### Card Design:
```
┌─────────────────────────────────────┐
│  🎯 Profile & Plan                  │
│  We use this to set your calories   │
│  and Body Clock score.              │
├─────────────────────────────────────┤
│  Goal                    [Lose ▼]   │
│  Lose, maintain, or gain.            │
│                                      │
│  Body Weight            [75.5] kg    │
│  Used to adjust calories...          │
│                                      │
│  Height                  [175] cm    │
│  Used for BMR calculation...         │
└─────────────────────────────────────┘
```

### Premium Elements:
- Subtle gradient backgrounds
- Smooth hover effects
- Loading spinners
- Success checkmarks
- Error states
- Helpful tooltips

---

## Next Steps

1. **Review this plan** - Make adjustments
2. **Create database migration** - Add missing columns
3. **Build foundation** - Hooks, types, utilities
4. **Implement sections one by one** - Start with Profile & Plan
5. **Add premium styling** - Polish as we go
6. **Test thoroughly** - Ensure everything works
7. **Deploy** - Roll out to users

---

## Questions to Consider

1. **Age field**: Do we need it? (Used in BMR calculation)
2. **Sleep window**: Should it be time or hour offset?
3. **Export format**: CSV, JSON, or both?
4. **Settings backup**: Cloud sync or local only?
5. **Validation rules**: What are acceptable ranges?
6. **Default values**: What should they be for new users?

---

This plan provides a comprehensive roadmap for building a fully functional, ultra-premium settings page. Each section is broken down into implementable pieces with clear requirements.

