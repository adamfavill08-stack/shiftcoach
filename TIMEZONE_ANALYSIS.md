# Timezone Handling Analysis - Shift Coach

## Current Status: ⚠️ **Partially Working**

Your app **will adjust to timezones**, but there are some issues that need attention.

---

## ✅ What Works Well

### 1. **Database Storage** ✅
- Uses `timestamptz` (timezone-aware) in Supabase
- All timestamps stored with timezone information
- Proper UTC storage in database

### 2. **Browser Timezone Detection** ✅
- Uses browser's local timezone automatically via `new Date()`
- `toLocalTime()` function converts UTC timestamps to local time
- Most date displays use browser's locale

### 3. **Shift Times** ✅
- Shift start/end times stored as ISO timestamps with timezone
- Displayed in user's local timezone via browser

---

## ⚠️ Issues Found

### 1. **`isoLocalDate()` Function** ❌ **PROBLEM**

**Location:** `lib/shifts.ts:15-17`

```typescript
export function isoLocalDate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0,10)
}
```

**Problem:**
- Uses UTC to determine "today's date"
- If user is in Tokyo (UTC+9) and it's 2:00 AM local time (yesterday in UTC), it will show yesterday's date
- Should use user's local timezone instead

**Impact:**
- "Today" might be wrong for users far from UTC
- Shift dates might be off by one day
- Sleep logs might be grouped into wrong days

**Example:**
- User in Tokyo at 2:00 AM on Jan 15 (local time)
- UTC time is 5:00 PM on Jan 14
- `isoLocalDate()` returns "2025-01-14" (wrong!)
- Should return "2025-01-15" (correct)

---

### 2. **`toTS()` Function** ⚠️ **POTENTIAL ISSUE**

**Location:** `app/(app)/rota/sheet.tsx:34-39`

```typescript
function toTS(isoDate: string, hhmm: string) {
  const [hh, mm] = hhmm.split(':').map(Number)
  const d = new Date(isoDate + 'T00:00:00')
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}
```

**Problem:**
- Creates date without timezone specification
- `new Date(isoDate + 'T00:00:00')` is ambiguous
- Browser interprets this as local time, then converts to UTC
- If user travels, shift times might shift

**Impact:**
- Shift times might be stored incorrectly if user's timezone changes
- Less critical if user stays in same timezone

---

### 3. **Profile Timezone Not Used** ⚠️ **MISSING FEATURE**

**Location:** `lib/profile.ts:16`

```typescript
tz: string | null  // Timezone field exists but not used
```

**Problem:**
- Profile has `tz` field but it's never read or used
- App relies entirely on browser's timezone
- If user travels, timezone changes automatically (good)
- But can't manually set timezone (might be needed for some users)

**Impact:**
- Can't override browser timezone if needed
- Not a critical issue, but limits flexibility

---

### 4. **Hardcoded Locale Formats** ⚠️ **MINOR**

**Location:** Multiple files

```typescript
// Hardcoded 'en-GB' locale
date.toLocaleDateString('en-GB', { weekday: 'long' })
new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opt })
```

**Problem:**
- Uses UK date format everywhere
- Should use user's browser locale

**Impact:**
- Dates show as "Monday 21 Jan" (UK format) even for US users
- Times show correctly (browser handles this)
- Cosmetic issue, not functional

---

## 📊 Real-World Scenarios

### Scenario 1: User in New York (UTC-5)
✅ **Works:** Browser detects EST/EDT automatically
✅ **Works:** Times display in local time
⚠️ **Issue:** "Today" might be wrong if calculated at midnight UTC

### Scenario 2: User Travels from London to Tokyo
✅ **Works:** Browser updates timezone automatically
✅ **Works:** New times display correctly
⚠️ **Issue:** Old shift times might appear shifted (stored in old timezone)

### Scenario 3: User in Sydney (UTC+10)
✅ **Works:** Most features work correctly
⚠️ **Issue:** `isoLocalDate()` might return wrong date if called at certain times

---

## 🎯 Recommendations

### **Priority 1: Fix `isoLocalDate()`** 🔴 **HIGH**

**Current:**
```typescript
export function isoLocalDate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0,10)
}
```

**Fixed:**
```typescript
export function isoLocalDate(d: Date) {
  // Use local date components, not UTC
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

**Impact:** Fixes "today" date calculation for all users

---

### **Priority 2: Use Profile Timezone (Optional)** 🟡 **MEDIUM**

If you want to allow manual timezone override:

1. Detect browser timezone on signup
2. Save to `profile.tz`
3. Use `profile.tz` for date calculations if set
4. Fall back to browser timezone if not set

**Code:**
```typescript
function getUserTimezone(profile: Profile | null): string {
  return profile?.tz || Intl.DateTimeFormat().resolvedOptions().timeZone
}
```

---

### **Priority 3: Fix Date Formatting** 🟢 **LOW**

Replace hardcoded `'en-GB'` with user's locale:

```typescript
// Instead of:
date.toLocaleDateString('en-GB', { weekday: 'long' })

// Use:
date.toLocaleDateString(undefined, { weekday: 'long' })
// or
date.toLocaleDateString(navigator.language, { weekday: 'long' })
```

---

## ✅ Will It Work Globally?

### **Short Answer: YES, with caveats**

✅ **Works:**
- Users in any timezone can use the app
- Times display correctly in local timezone
- Shifts work correctly
- Sleep logs work correctly
- Most calculations are timezone-aware

⚠️ **Issues:**
- "Today" date might be wrong in edge cases (midnight UTC)
- Date formats are UK-style everywhere
- Can't manually override timezone

### **Recommendation:**

**Fix `isoLocalDate()` first** - this is the only critical issue. The rest are nice-to-haves.

After fixing `isoLocalDate()`, the app will work correctly for 99% of users worldwide.

---

## 🔧 Quick Fix

I can fix the `isoLocalDate()` function right now if you want. It's a 3-line change that will make the app work correctly for all timezones.

Would you like me to:
1. ✅ Fix `isoLocalDate()` (recommended)
2. ⏸️ Add profile timezone support (optional)
3. ⏸️ Fix date formatting (cosmetic)

