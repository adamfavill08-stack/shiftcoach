# Troubleshooting Guide - Missing Features

## Issue 1: Preferences Section Not Showing in Settings

### What Should Be There:
- A "Preferences" section header (uppercase, gray text)
- "Shifts & Schedule" section (new, with clock icon)
- "Notifications" section
- "Nutrition" section  
- "Appearance" section

### How to Fix:

1. **Check Browser Console for Errors**:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for any red errors related to `ShiftsScheduleSection` or imports

2. **Restart Dev Server**:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

3. **Clear Browser Cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or use incognito/private window

4. **Check if Component File Exists**:
   - Verify: `app/(app)/settings/components/ShiftsScheduleSection.tsx` exists
   - Check the file has proper export: `export function ShiftsScheduleSection()`

5. **Check Import in Settings Page**:
   - Open: `app/(app)/settings/page.tsx`
   - Line 9 should have: `import { ShiftsScheduleSection } from './components/ShiftsScheduleSection'`
   - Line 80 should have: `<ShiftsScheduleSection />`

6. **Check for TypeScript Errors**:
   ```bash
   npm run lint
   ```

### If Still Not Showing:

The Preferences section should be between "Account" and "Coaching" sections. If you only see:
- Account
- Coaching  
- Support

Then the Preferences section is not rendering. Check the browser console for the specific error.

---

## Issue 2: Yellow Disclaimer Banner Not Showing in AI Coach

### What Should Be There:
- A yellow/amber banner at the very top of the chat modal
- Text: "This is wellbeing guidance, not medical advice..."
- A "Health Data Notice" link at the bottom right of the chat

### How to Fix:

1. **Verify You're Using the Correct Modal**:
   - The app uses: `components/modals/CoachChatModal.tsx`
   - NOT: `components/coach/CoachChatModal.tsx`

2. **Check if Changes Were Saved**:
   - Open: `components/modals/CoachChatModal.tsx`
   - Look for "Disclaimer Banner" around line 277
   - Should see amber/yellow background styling

3. **Restart Dev Server**:
   ```bash
   npm run dev
   ```

4. **Hard Refresh Browser**:
   - `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

5. **Check Browser Console**:
   - Look for any CSS/styling errors
   - Check if the banner element exists in DOM (Inspect Element)

### Expected Appearance:

The disclaimer should be:
- **Position**: At the very top of the chat modal, above the header
- **Color**: Light yellow/amber background (`bg-amber-50/90`)
- **Text**: Small text with warning emoji (⚠️)
- **Link**: "Health Data Notice" at bottom right of footer

---

## Quick Diagnostic Steps

### 1. Check File Structure:
```
app/(app)/settings/
  ├── page.tsx ✅ (should import ShiftsScheduleSection)
  └── components/
      └── ShiftsScheduleSection.tsx ✅ (should exist)

components/modals/
  └── CoachChatModal.tsx ✅ (should have disclaimer banner)
```

### 2. Check Browser Console:
- Open DevTools (F12)
- Console tab
- Look for:
  - Import errors
  - Component errors
  - TypeScript errors

### 3. Check Network Tab:
- Open DevTools (F12)
- Network tab
- Refresh page
- Look for failed requests (red)

### 4. Verify Build:
```bash
npm run build
```
- Should complete without errors
- If errors, fix them first

---

## Still Not Working?

1. **Check Git Status**:
   ```bash
   git status
   ```
   - Verify files are actually modified
   - Check if changes were saved

2. **Compare with Expected Code**:
   - Settings page should have Preferences section (lines 74-85)
   - CoachChatModal should have disclaimer banner (around line 277)

3. **Try Fresh Install**:
   ```bash
   rm -rf node_modules .next
   npm install
   npm run dev
   ```

---

## Contact for Help

If issues persist, provide:
1. Browser console errors (screenshot)
2. Terminal output from `npm run dev`
3. Screenshot of what you're seeing vs. what's expected
