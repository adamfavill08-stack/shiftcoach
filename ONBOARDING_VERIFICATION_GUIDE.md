# Onboarding Verification Guide

This guide helps you verify that onboarding is working correctly and all data is being saved.

---

## Quick Verification

### Option 1: Use the Verification Page (Easiest)

1. **Start your dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Navigate to**: `http://localhost:3000/verify-onboarding`

3. **The page will automatically check**:
   - ✅ Database migration status (age/date_of_birth columns)
   - ✅ Your current profile data completeness
   - ✅ Onboarding flow structure

4. **Review the results**:
   - Green = ✅ Working correctly
   - Red = ❌ Needs attention
   - Yellow = ⚠️ Warning (may still work)

### Option 2: Use the API Endpoint Directly

Visit: `http://localhost:3000/api/profile/check-age-column`

This will return:
```json
{
  "columnExists": true,
  "profileData": { ... },
  "age": 35,
  "dateOfBirth": "1990-01-01",
  "message": "Age column exists and is accessible"
}
```

Or if migration not run:
```json
{
  "columnExists": false,
  "error": "The age column does not exist in the database",
  "message": "Please run the migration: supabase/migrations/20250124_add_age_to_profiles.sql"
}
```

---

## Manual Database Check

### Check in Supabase Dashboard

1. **Open Supabase Dashboard** → Your Project
2. **Go to Table Editor** → `profiles` table
3. **Check for these columns**:
   - ✅ `age` (integer)
   - ✅ `date_of_birth` (date)

### If Columns Are Missing

**Run the migration**:

1. **Go to SQL Editor** in Supabase Dashboard
2. **Click "New Query"**
3. **Copy the ENTIRE contents** of: `supabase/migrations/20250124_add_age_to_profiles.sql`
4. **Paste into SQL Editor**
5. **Click "Run"** (or press Ctrl+Enter)
6. **You should see**: "Success. No rows returned"

---

## Test Onboarding Flow

### Step-by-Step Test

1. **Create a test user** (or use existing):
   - Sign up at `/auth/sign-up`
   - Or sign in at `/auth/sign-in`

2. **Complete onboarding** at `/onboarding`:
   - **Step 1**: Enter name, gender, date of birth, age
   - **Step 2**: Select units, enter height and weight
   - **Step 3**: Select goal, set sleep/water goals
   - **Click "Complete Setup"**

3. **Check browser console** (F12):
   - Look for: `[onboarding] Profile saved successfully`
   - Check for any errors

4. **Verify data saved**:
   - Go to `/profile` page
   - Check that all data is displayed
   - Or check Supabase Table Editor → `profiles` table

5. **Verify age saved**:
   - Check profile page shows your age
   - Or check database: `SELECT age, date_of_birth FROM profiles WHERE user_id = 'your-user-id'`

---

## What Should Be Saved

### All These Fields Should Save:

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| `name` | text | No | Display name |
| `sex` | enum | No | Calorie calculations (BMR) |
| `date_of_birth` | date | No | Age calculation |
| `age` | integer | No | Calorie calculations, sleep predictions |
| `height_cm` | integer | No | Calorie calculations (BMR) |
| `weight_kg` | number | No | Calorie calculations (BMR) |
| `goal` | enum | No | Calorie adjustments (lose/maintain/gain) |
| `units` | enum | No | Display preferences |
| `sleep_goal_h` | number | No | Sleep tracking goals |
| `water_goal_ml` | integer | No | Hydration goals |
| `tz` | text | Auto | Timezone handling |
| `theme` | enum | Auto | UI theme |
| `default_activity_level` | enum | Auto | Calorie calculations |

---

## Common Issues & Fixes

### Issue 1: Age Not Saving

**Symptoms**:
- Age entered in onboarding but not showing in profile
- Console shows: `[api/profile] AGE COLUMN DOES NOT EXIST`

**Fix**:
1. Run migration: `supabase/migrations/20250124_add_age_to_profiles.sql`
2. Re-check verification page
3. Complete onboarding again

### Issue 2: Date of Birth Not Saving

**Symptoms**:
- DOB entered but not in database
- Age not calculated from DOB

**Fix**:
1. Same as Issue 1 - run the migration
2. Migration adds both `age` and `date_of_birth` columns

### Issue 3: Other Fields Not Saving

**Symptoms**:
- Height, weight, goal not saving

**Fix**:
1. Check browser console for errors
2. Check network tab - is `/api/profile` returning 200?
3. Check Supabase logs for RLS policy issues
4. Verify user is authenticated

### Issue 4: Onboarding Redirects Immediately

**Symptoms**:
- Can't complete onboarding
- Redirects to profile page

**Fix**:
1. Check if profile already exists
2. Clear browser storage
3. Try in incognito mode
4. Check authentication status

---

## Verification Checklist

- [ ] Migration has been run (age/date_of_birth columns exist)
- [ ] Can access `/verify-onboarding` page
- [ ] Verification shows all green checks
- [ ] Can complete onboarding flow
- [ ] All data appears on profile page
- [ ] Age is saved correctly
- [ ] Date of birth is saved correctly
- [ ] Height/weight are saved correctly
- [ ] Goal is saved correctly
- [ ] Sleep/water goals are saved correctly

---

## Next Steps After Verification

Once everything is verified:

1. ✅ **Fix sleep predictions** - Update `app/api/sleep/predict-stages/route.ts` to use age from profile
2. ✅ **Test calorie calculations** - Verify they use profile data (weight, height, age, sex, goal)
3. ✅ **Test AI Coach** - Verify it uses profile data for personalized advice

---

## Support

If you encounter issues:

1. Check the verification page: `/verify-onboarding`
2. Check browser console for errors
3. Check Supabase logs
4. Review `ONBOARDING_STATUS_REPORT.md` for detailed analysis

