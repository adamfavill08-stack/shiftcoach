# How to View and Test the Changes

## 📁 Files Modified

### New Files Created:
1. `app/(app)/settings/components/ShiftsScheduleSection.tsx` - New settings section for shifts & schedule
2. `app/account/delete/page.tsx` - Web-based account deletion page
3. `REVENUECAT_INTEGRATION_PLAN.md` - Payment integration plan
4. `FEATURE_REVIEW_AND_TESTING.md` - Testing documentation
5. `HOW_TO_VIEW_CHANGES.md` - This file

### Files Modified:
1. `app/(app)/profile/page.tsx` - Added DOB/age editing modal
2. `app/(app)/settings/page.tsx` - Added ShiftsScheduleSection
3. `app/api/profile/route.ts` - Added Priority 2 settings handling
4. `app/(app)/settings/components/DataPrivacySection.tsx` - Added web deletion link
5. `lib/coach/systemPrompt.ts` - Added medical disclaimers
6. `components/coach/CoachChatModal.tsx` - Added disclaimer banner

---

## 🚀 How to See the Changes

### Step 1: Start Your Development Server

If your server isn't running, start it:

```bash
npm run dev
```

The app should be available at `http://localhost:3000`

---

## 🧪 Testing the New Features

### 1. Profile Page - DOB/Age Editing

**Navigate to**: `/profile` or click "Profile" in the app

**What to test**:
1. Find the "Age / Date of Birth" field (should be clickable now)
2. Click it - a modal should open
3. If you have a DOB set, it should pre-fill
4. Enter a date of birth (e.g., `1990-01-15`)
5. You should see an age preview below the input
6. Click "Save"
7. The profile should refresh and show the new age

**Try these edge cases**:
- Future date (should be rejected)
- Date that makes age < 13 (should be rejected)
- Date that makes age > 120 (should be rejected)
- Invalid format (should be rejected)

---

### 2. Settings Page - Shifts & Schedule

**Navigate to**: `/settings` or click "Settings" in the app

**What to test**:
1. Scroll to the "Preferences" section
2. You should see a new "Shifts & Schedule" section at the top
3. Click it to expand
4. You should see:
   - **Default Shift Pattern** dropdown (Rotating, Mostly Days, etc.)
   - **Ideal Sleep Window** with two time pickers (start and end)
   - **Wake Reminders** toggle switch
   - **Wake Reminder Trigger** dropdown (only shows when toggle is ON)

**Test each setting**:
- Change shift pattern → Should save automatically
- Set sleep window times → Should save after 1 second (debounced)
- Toggle wake reminders ON → Trigger dropdown should appear
- Select trigger option → Should save automatically
- Toggle wake reminders OFF → Trigger should be set to 'off' and dropdown should hide
- Collapse the section → Should show sleep window preview (e.g., "22:00–07:00")

---

### 3. Account Deletion - Web Link

**Navigate to**: `/settings` → Scroll to "Support" section → "Data & Privacy"

**What to test**:
1. You should see a new link: "Delete account on web"
2. Click it → Should open `/account/delete` in a new tab
3. The page should have a form asking for email and password
4. Enter credentials and submit → Should delete account

**Note**: This is for Google Play compliance. The in-app deletion button should also work.

---

### 4. Health Disclaimers - AI Coach

**Navigate to**: Open the AI Coach chat (from dashboard or any page)

**What to test**:
1. You should see a yellow/amber disclaimer banner at the top of the chat
2. It should say: "This is wellbeing guidance, not medical advice..."
3. At the bottom of the chat, there should be a "Health Data Notice" link
4. Click the link → Should open the health data notice page

---

## 🔍 Viewing Changes in Your Code Editor

### Using Git (if you have it set up):

```bash
# See all modified files
git status

# See changes in a specific file
git diff app/(app)/profile/page.tsx

# See all changes
git diff
```

### Using VS Code:

1. Open VS Code in your project directory
2. The **Source Control** panel (left sidebar) will show modified files
3. Click on any file to see the diff
4. Green lines = added code
5. Red lines = removed code

### Key Changes to Look For:

**Profile Page** (`app/(app)/profile/page.tsx`):
- Look for `handleSaveDOB` function (around line 578)
- Look for the Age/DOB button (around line 820)
- Look for the DOB modal (around line 1100)

**Settings Page** (`app/(app)/settings/page.tsx`):
- Look for `ShiftsScheduleSection` import (line 8)
- Look for `<ShiftsScheduleSection />` in the Preferences section (around line 79)

**New ShiftsScheduleSection** (`app/(app)/settings/components/ShiftsScheduleSection.tsx`):
- Entire file is new - check it out!

**API Route** (`app/api/profile/route.ts`):
- Look for Priority 2 settings handling (around line 213-249)
- Look for time format conversion (HH:MM → HH:MM:SS)

---

## 🐛 Troubleshooting

### If changes don't appear:

1. **Restart the dev server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart
   npm run dev
   ```

2. **Clear browser cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private window

3. **Check for TypeScript errors**:
   ```bash
   npm run lint
   ```

4. **Check browser console**:
   - Open DevTools (F12)
   - Look for any errors in the Console tab

### If database columns are missing:

The new settings require database columns. If you see errors about missing columns:

1. Check if migration has been run:
   - `supabase/migrations/20250122_user_settings.sql` should be applied
   
2. Run the migration in Supabase:
   - Go to Supabase Dashboard → SQL Editor
   - Run the migration file

---

## 📸 What You Should See

### Profile Page:
- Age field should be clickable (has a chevron icon)
- Clicking opens a modal with date picker
- Age preview shows calculated age

### Settings Page:
- New "Shifts & Schedule" section in Preferences
- Collapsed state shows sleep window preview
- Expanded state shows all settings with proper controls

### Account Deletion:
- New "Delete account on web" link in Data & Privacy section

### AI Coach:
- Yellow disclaimer banner at top of chat
- "Health Data Notice" link at bottom

---

## ✅ Quick Test Checklist

- [ ] Profile page: Age field is clickable
- [ ] Profile page: DOB modal opens and saves correctly
- [ ] Settings page: "Shifts & Schedule" section appears
- [ ] Settings page: All settings save correctly
- [ ] Settings page: Sleep window preview shows in collapsed state
- [ ] Account deletion: Web link appears in settings
- [ ] AI Coach: Disclaimer banner is visible
- [ ] AI Coach: Health Data Notice link works

---

**Need help?** Check the browser console for errors or let me know what you're seeing!
