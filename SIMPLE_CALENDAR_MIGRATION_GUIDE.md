# Simple Calendar Migration Guide

## The Problem
You're seeing this error:
```
Error fetching events: {
  code: 'PGRST205',
  message: "Could not find the table 'public.events' in the schema cache"
}
```

This means the `events` table (and related tables) haven't been created in your Supabase database yet.

## The Solution
Run the migration file to create all the required tables.

## Steps to Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy the Migration**
   - Open the file: `supabase/migrations/20250122_simple_calendar_schema.sql`
   - Copy the **ENTIRE** contents (all 311 lines)

4. **Paste and Run**
   - Paste the SQL into the SQL Editor
   - Click "Run" (or press Ctrl+Enter / Cmd+Enter)
   - Wait for it to complete (should take a few seconds)

5. **Verify Success**
   - You should see "Success. No rows returned" or similar
   - If you see errors, check the error message

### Option 2: Using Supabase CLI (If Installed)

```bash
# Make sure you're in the project directory
cd /home/growli/shiftcali/shiftcali

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## What This Migration Creates

The migration creates these tables:
- ✅ `public.event_types` - Event categories/types
- ✅ `public.events` - Main events table (calendar events and tasks)
- ✅ `public.tasks` - Task-specific data
- ✅ `public.widgets` - Calendar widget settings
- ✅ `public.caldav_calendars` - External calendar sync

It also:
- ✅ Creates all necessary indexes for performance
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Creates triggers for automatic timestamp updates

## Verify the Migration Worked

After running the migration, you can verify:

1. **In Supabase Dashboard:**
   - Go to "Table Editor"
   - You should see these new tables:
     - `event_types`
     - `events`
     - `tasks`
     - `widgets`
     - `caldav_calendars`

2. **In Your App:**
   - Restart your dev server (`npm run dev`)
   - The errors should stop appearing
   - The calendar should work correctly

## Troubleshooting

### If you get "relation already exists" errors:
- Some tables might already exist
- The migration uses `create table if not exists`, so it should be safe
- You can ignore these warnings

### If you get permission errors:
- Make sure you're using the SQL Editor (not the Table Editor)
- The SQL Editor runs with admin privileges

### If the migration partially fails:
- Check which table failed
- You may need to manually create missing tables
- Or drop existing tables and re-run the migration

## After Migration

Once the migration is complete:
1. ✅ Restart your dev server
2. ✅ The calendar API routes should work
3. ✅ You can create and view events
4. ✅ The test page at `/settings/test-page` should work

## Need Help?

If you encounter issues:
1. Check the Supabase SQL Editor for detailed error messages
2. Verify your Supabase project is active and accessible
3. Make sure you have the correct project selected in the dashboard

