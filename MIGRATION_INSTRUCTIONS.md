# How to Add the Age Column to Your Database

## The Problem
The age is being sent from onboarding (39) but not being saved because the `age` column doesn't exist in your `profiles` table.

## The Solution
You need to run the database migration to add the `age` column.

## Steps to Run the Migration

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the ENTIRE contents of the file: `supabase/migrations/20250124_add_age_to_profiles.sql`
5. Paste it into the SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd /path/to/your/project
supabase db push
```

This will run all pending migrations.

## Verify the Migration Worked

After running the migration, you can verify it worked by:

1. Going to your Supabase dashboard
2. Click on "Table Editor"
3. Select the `profiles` table
4. Check if you see an `age` column

OR

Visit: `http://localhost:3000/api/profile/check-age-column`

This endpoint will tell you if the column exists.

## After Running the Migration

Once the migration is complete:
1. Complete onboarding again with an age
2. The age should now save correctly
3. It should appear on the profile page

