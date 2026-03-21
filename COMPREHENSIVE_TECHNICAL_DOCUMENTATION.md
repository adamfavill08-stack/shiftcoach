# Shift Coach - Comprehensive Technical Documentation

**Last Updated:** January 2025  
**Purpose:** Complete technical reference for AI assistants (ChatGPT, Claude, etc.)  
**App Version:** 1.0.5 (Build 7)

---

## 📋 Executive Summary

**Shift Coach** is a health and wellbeing application specifically designed for shift workers. It helps users manage sleep, nutrition, activity, and recovery patterns that adapt to rotating schedules, night shifts, and irregular work hours. The app uses circadian rhythm science to provide personalized, empathetic coaching.

**Current Status:** Production-ready core features, with some polish needed for completeness. Ready for Android build and Play Store deployment.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL), OpenAI GPT-4, Capacitor (Android/iOS), Tailwind CSS v4

---

## 🏗️ Application Overview

### Core Mission
Shift Coach recognizes that shift work is inherently difficult. The app never shames users for missed goals or irregular patterns. Instead, it adapts recommendations based on current state (RED/AMBER/GREEN) and celebrates small wins.

### Key Design Principles
1. **Non-Judgmental**: Never shames users for missed goals or irregular patterns
2. **Adaptive**: Adjusts recommendations based on current state (RED/AMBER/GREEN)
3. **Shift-Aware**: All features consider shift patterns, circadian rhythms, and recovery needs
4. **Practical**: Focuses on actionable, realistic advice for shift work challenges
5. **Empathetic**: Understands that shift work is hard and celebrates small wins

### Target Users
- Healthcare workers (nurses, doctors, paramedics)
- Emergency services (police, firefighters)
- Factory/warehouse workers
- Security personnel
- Anyone working rotating or night shifts

---

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 16.0.10 (App Router)
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4 with custom theme
- **Animation**: Framer Motion 12.23.24
- **Icons**: Lucide React 0.552.0
- **Charts**: Recharts 3.3.0
- **Theming**: next-themes 0.3.0 (dark mode support)
- **Date Utilities**: date-fns 4.1.0

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (avatars, etc.)
- **Real-time**: Supabase Realtime (via subscriptions)

### Mobile
- **Framework**: Capacitor 7.4.4
- **Platforms**: Android, iOS (Android currently configured)
- **App ID**: `com.shiftcoach.app`
- **Production URL**: `https://www.shiftcoach.app`

### AI & External Services
- **AI**: OpenAI GPT-4 (via OpenAI SDK 4.104.0)
- **Payments**: Stripe 20.0.0
- **Email**: Resend 6.5.2
- **Wearables**: Google Fit API, Apple Health (planned)

### Development Tools
- **Package Manager**: npm (also supports pnpm)
- **Linting**: ESLint 9 with Next.js config
- **Type Checking**: TypeScript strict mode
- **Build Tool**: Next.js built-in (Turbopack in dev)

---

## 📁 Project Structure

```
shiftcali/
├── app/                          # Next.js App Router
│   ├── (app)/                   # Main authenticated app routes
│   │   ├── dashboard/           # Main dashboard
│   │   ├── sleep/               # Sleep tracking pages
│   │   │   ├── logs/           # Sleep log entry
│   │   │   ├── history/        # Sleep history view
│   │   │   └── overview/       # Sleep overview/stats
│   │   ├── shift-rhythm/       # Body Clock Score page
│   │   ├── rota/               # Shift scheduling/calendar
│   │   │   ├── setup/          # Initial rota setup
│   │   │   ├── new/            # Create new shift
│   │   │   ├── bulk/           # Bulk shift creation
│   │   │   └── upload/         # Upload rota file
│   │   ├── coach/              # AI Coach chat interface
│   │   ├── nutrition/          # Nutrition tracking
│   │   ├── activity/           # Activity & steps tracking
│   │   ├── recovery/           # Recovery insights
│   │   ├── progress/           # Weekly progress summaries
│   │   ├── settings/           # User settings
│   │   └── calendar/           # Calendar views (Simple Calendar Pro)
│   │       ├── day/            # Day view
│   │       ├── week/           # Week view
│   │       └── year/           # Year view
│   ├── (dashboard)/            # Alternative dashboard route group
│   ├── api/                    # API routes
│   │   ├── sleep/              # Sleep-related endpoints
│   │   ├── shift-rhythm/       # Body Clock Score endpoints
│   │   ├── rota/               # Shift/rota endpoints
│   │   ├── coach/              # AI Coach endpoints
│   │   ├── nutrition/          # Nutrition endpoints
│   │   ├── activity/           # Activity endpoints
│   │   ├── profile/            # User profile endpoints
│   │   ├── calendar/           # Calendar/event endpoints
│   │   ├── weekly-summary/     # Weekly summary generation
│   │   └── ...                 # Many more (see API section)
│   ├── auth/                   # Authentication pages
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── reset/
│   │   └── callback/
│   ├── onboarding/             # User onboarding flow
│   ├── pricing/                # Pricing page
│   ├── payment/                # Payment success
│   └── legal/                  # Privacy, Terms, Health Data Notice
│
├── components/                  # React components
│   ├── dashboard/              # Dashboard-specific components
│   ├── sleep/                  # Sleep-related components
│   ├── shift-rhythm/           # Body Clock Score components
│   ├── rota/                   # Shift scheduling components
│   ├── coach/                  # AI Coach components
│   ├── nutrition/              # Nutrition components
│   ├── activity/               # Activity components
│   ├── calendar/               # Calendar components (Simple Calendar Pro)
│   ├── settings/               # Settings components
│   ├── ui/                     # Reusable UI primitives
│   └── layout/                 # Layout components
│
├── lib/                         # Core libraries and utilities
│   ├── sleep/                  # Sleep calculations & logic
│   ├── circadian/              # Circadian rhythm calculations
│   ├── shift-rhythm/           # Body Clock Score engine
│   ├── nutrition/              # Nutrition calculations
│   ├── coach/                  # AI Coach logic & prompts
│   ├── activity/               # Activity scoring & recommendations
│   ├── rota/                   # Rota/shift pattern logic
│   ├── hooks/                  # Custom React hooks (22 hooks)
│   ├── supabase/               # Supabase client utilities
│   ├── data/                   # Data fetching & aggregation
│   └── utils/                  # General utilities
│
├── supabase/
│   └── migrations/             # Database migration files
│
├── public/                      # Static assets (served as webDir for Capacitor)
├── android/                     # Android native project (Capacitor)
├── ios/                         # iOS native project (Capacitor)
└── scripts/                     # Utility scripts

```

---

## 🗄️ Database Schema

### Core Tables

#### `profiles`
User profile information.
```sql
- user_id (uuid, PK, FK → auth.users)
- name (text)
- sex (text: 'male'|'female'|'other')
- height_cm (int)
- weight_kg (numeric)
- date_of_birth (date) -- Added for age calculations
- age (int) -- Calculated field
- goal (text: 'lose'|'maintain'|'gain')
- units (text: 'metric'|'imperial')
- sleep_goal_h (numeric, default 7.5)
- water_goal_ml (int, default 2500)
- step_goal (int, default 10000)
- tz (text, default 'Europe/London')
- avatar_url (text)
- created_at, updated_at (timestamptz)
```
**RLS**: Users can only access their own profile.

#### `sleep_logs`
Sleep session records (v4 schema - most recent).
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- date (date) -- Morning date sleep ended
- start_at (timestamptz) -- Bedtime
- end_at (timestamptz) -- Wake time
- minutes (int, generated) -- Calculated duration
- kind (text: 'main'|'nap')
- classification (text) -- 'Main Sleep', 'Post-Shift Recovery', etc.
- quality (int, 1-5)
- notes (text)
- created_at, updated_at (timestamptz)
```
**RLS**: Users can only access their own sleep logs.

#### `shift_rhythm_scores`
Daily Body Clock Score calculations.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- date (date)
- sleep_score (numeric)
- regularity_score (numeric)
- shift_pattern_score (numeric)
- recovery_score (numeric)
- total_score (numeric) -- Final Body Clock Score (0-100)
- created_at (timestamptz)
```
**Unique Index**: (user_id, date) - one score per user per day.
**RLS**: Users can only access their own scores.

#### `rota_events`
Shift schedule events.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- start_at (timestamptz)
- end_at (timestamptz)
- shift_type (text: 'day'|'night'|'late'|'off')
- title (text)
- notes (text)
- created_at, updated_at (timestamptz)
```
**RLS**: Users can only access their own shifts.

#### `user_shift_patterns`
Recurring shift patterns.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- name (text)
- pattern_data (jsonb) -- Pattern definition
- start_date (date)
- end_date (date, nullable)
- created_at, updated_at (timestamptz)
```
**Status**: TODO - Pattern persistence not fully implemented.

#### `nutrition_logs`
Food/meal logging entries.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- logged_at (timestamptz)
- food_id (uuid, FK → nutrition_foods or foods_master)
- serving_size (numeric)
- serving_unit (text)
- calories (numeric)
- protein, carbs, fat, fiber, sugar, salt (numeric)
- meal_type (text: 'breakfast'|'lunch'|'dinner'|'snack')
- created_at, updated_at (timestamptz)
```

#### `nutrition_foods` / `foods_master`
Global food database (multi-source).
```sql
- id (uuid, PK)
- name (text)
- brand (text)
- barcode (text, indexed)
- source (text: 'USDA'|'OpenFoodFacts'|'UserCreated'|etc.)
- kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, etc.
- serving_description (text)
- image_url (text)
- country (text)
- created_at, updated_at (timestamptz)
```
**RLS**: Public read access (all users can search foods).

#### `activity_logs`
Activity level logging.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- date (date)
- activity_level (text: 'very_light'|'light'|'moderate'|'busy'|'intense')
- steps (int, nullable)
- created_at, updated_at (timestamptz)
```

#### `mood_logs`
Daily mood and focus tracking.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- date (date)
- mood (int, 1-5)
- focus (int, 1-5)
- notes (text)
- created_at, updated_at (timestamptz)
```

#### `circadian_logs`
Circadian rhythm tracking data.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- date (date)
- phase_shift (numeric) -- Hours offset from baseline
- shift_lag_score (numeric)
- social_jetlag (numeric)
- created_at (timestamptz)
```

#### `shiftlag_logs`
Shift lag (circadian misalignment) scores.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- date (date)
- lag_score (numeric)
- transition_type (text)
- created_at (timestamptz)
```

#### `weekly_goals`
Weekly user goals.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- week_start (date)
- goals (jsonb) -- Array of goal objects
- created_at, updated_at (timestamptz)
```

#### `weekly_summaries`
AI-generated weekly summaries.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- week_start (date)
- summary_text (text) -- AI-generated summary
- metrics (jsonb) -- Aggregated metrics
- created_at (timestamptz)
```

#### `coach_state`
AI Coach state tracking.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- state (text: 'RED'|'AMBER'|'GREEN')
- last_calculated_at (timestamptz)
- created_at, updated_at (timestamptz)
```

#### `user_settings`
User preferences and settings.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- theme (text: 'system'|'light'|'dark')
- default_shift_pattern (jsonb)
- ideal_sleep_window_start (time)
- ideal_sleep_window_end (time)
- wake_reminders (boolean)
- mood_alerts_enabled (boolean)
- daily_checkin_reminder (boolean)
- ai_coach_tone (text)
- calorie_aggressiveness (text)
- macro_split_preset (text)
- animations_enabled (boolean)
- created_at, updated_at (timestamptz)
```
**Status**: Schema exists, but many settings not yet wired to save functionality.

#### `events` & `event_types` (Simple Calendar Pro)
Calendar events system.
```sql
-- event_types
- id (bigserial, PK)
- title (text)
- color (integer)
- type (integer) -- Event type enum
- caldav_calendar_id, caldav_display_name, caldav_email (for CalDAV sync)

-- events
- id (bigserial, PK)
- user_id (uuid, FK → auth.users)
- event_type_id (bigint, FK → event_types)
- title, description (text)
- start_ts, end_ts (bigint) -- Unix timestamp in seconds
- timezone (text)
- repetition_type, repetition_value (for recurring events)
- reminder_minutes (integer)
- attendees (jsonb)
- location (text)
- is_all_day (boolean)
- color (integer)
- created_at, updated_at (timestamptz)
```
**Features**: Full Simple Calendar Pro feature set including recurring events, CalDAV sync, tasks, etc.

#### `daily_metrics`
Pre-computed daily metrics for performance.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- date (date)
- metrics (jsonb) -- Aggregated daily data
- computed_at (timestamptz)
```

#### Additional Tables
- `subscriber_plans` - Subscription tiers
- `promo_codes` - Promotional codes
- `google_fit_tokens` - OAuth tokens for Google Fit integration
- `wearable_sync` - Wearable device sync status
- `tester_codes` - Beta tester access codes

---

## 🔌 API Routes & Endpoints

### Sleep Endpoints

#### `GET /api/sleep/today`
Get today's sleep data.
**Response**: Sleep sessions, total hours, deficit, etc.

#### `GET /api/sleep/24h-grouped`
Get sleep grouped by shifted 24h day (07:00 → 07:00).
**Response**: Array of day objects with sleep sessions.

#### `GET /api/sleep/7days`
Get 7-day sleep analysis.
**Response**: Aggregated stats, consistency metrics, predictions.

#### `GET /api/sleep/history`
Get sleep history with filters.
**Query Params**: `startDate`, `endDate`, `limit`

#### `GET /api/sleep/summary`
Get sleep summary for a date range.
**Query Params**: `startDate`, `endDate`

#### `GET /api/sleep/deficit`
Get current sleep deficit (accumulated debt).

#### `GET /api/sleep/consistency`
Get sleep consistency metrics.

#### `GET /api/sleep/predict`
**POST** - Predict optimal sleep times.
**Body**: `{ shiftContext, sleepDeficit, preferences }`
**Response**: Suggested start/end times with reasoning.

#### `GET /api/sleep/predict-stages`
**POST** - Predict sleep stages (REM, deep, light).
**Body**: `{ startTime, endTime, age }`
**Response**: Stage predictions with percentages.

#### `GET /api/sleep/sessions`
List sleep sessions with filters.

#### `GET /api/sleep/sessions/[id]`
Get single sleep session.

#### `POST /api/sleep/log`
Create new sleep log entry.
**Body**: `{ start_at, end_at, kind, classification, quality, notes }`
**Auto-triggers**: Sleep deficit recalculation, shift rhythm recalculation.

#### `PATCH /api/sleep/sessions/[id]`
Update sleep session.
**Auto-triggers**: Recalculations.

#### `DELETE /api/sleep/sessions/[id]`
Delete sleep session.
**Auto-triggers**: Recalculations.

### Shift Rhythm (Body Clock Score) Endpoints

#### `GET /api/shift-rhythm/calculate`
Get current Body Clock Score.
**Response**: `{ totalScore, sleepScore, regularityScore, shiftPatternScore, recoveryScore, state: 'RED'|'AMBER'|'GREEN' }`

#### `POST /api/shift-rhythm/calculate`
Force recalculation of Body Clock Score.

### Shift/Rota Endpoints

#### `GET /api/rota/month`
Get shifts for a month.
**Query Params**: `year`, `month`

#### `GET /api/rota/week`
Get shifts for a week.
**Query Params**: `year`, `week`

#### `GET /api/rota/event`
Get shifts with filters.
**Query Params**: `startDate`, `endDate`, `shiftType`

#### `POST /api/rota/event`
Create new shift.
**Body**: `{ start_at, end_at, shift_type, title, notes }`

#### `GET /api/shifts`
Get current/upcoming shifts.

#### `GET /api/shiftlag`
Get shift lag (circadian misalignment) score.

### AI Coach Endpoints

#### `POST /api/coach`
Main AI Coach chat endpoint.
**Body**: `{ message, conversationHistory }`
**Response**: AI-generated response with context awareness.

#### `GET /api/coach/state`
Get current coaching state (RED/AMBER/GREEN).

#### `GET /api/coach/check-red`
Check if user is in RED state (high risk).

#### `GET /api/coach/daily-greeting`
Get personalized daily greeting.

#### `GET /api/coach/tip`
Get a contextual coaching tip.

### Nutrition Endpoints

#### `GET /api/nutrition/today`
Get today's nutrition summary.
**Response**: Total calories, macros, meals, etc.

#### `POST /api/nutrition/log`
Log a food/meal entry.

#### `GET /api/nutrition/day-summary`
Get nutrition summary for a specific day.

#### `GET /api/foods/search`
Search food database.
**Query Params**: `q` (search query)

#### `GET /api/foods/barcode`
Get food by barcode.
**Query Params**: `code` (barcode)

#### `GET /api/meal-timing/today`
Get meal timing recommendations for today.
**Response**: Next meal suggestions, timing windows, tips.
**Status**: Hook exists but currently returns mock data (needs fixing).

### Activity Endpoints

#### `GET /api/activity/today`
Get today's activity data.
**Response**: Steps, activity level, recovery score.

#### `POST /api/activity/log`
Log activity level or steps.

### Profile Endpoints

#### `GET /api/profile`
Get user profile data.

#### `POST /api/profile`
Update user profile.
**Body**: Partial profile object.

#### `POST /api/profile/avatar`
Upload profile avatar image.

### Calendar Endpoints (Simple Calendar Pro)

#### `GET /api/calendar/events`
List events with filters.
**Query Params**: `startDate`, `endDate`, `eventTypeId`, `search`

#### `POST /api/calendar/events`
Create new event.
**Body**: Full event object including recurrence.

#### `GET /api/calendar/events/[id]`
Get single event.

#### `PUT /api/calendar/events/[id]`
Update event.

#### `DELETE /api/calendar/events/[id]`
Delete event.

#### `GET /api/calendar/event-types`
List event types.

#### `POST /api/calendar/event-types`
Create event type.

#### `GET /api/calendar/tasks`
List tasks.

#### `POST /api/calendar/tasks`
Create task.

### Weekly Summary Endpoints

#### `GET /api/weekly-summary`
Get weekly summary for a week.
**Query Params**: `weekStart` (ISO date)

#### `POST /api/weekly-summary/run`
**Cron endpoint** - Generate weekly summaries for all users.
**Headers**: `x-weekly-summary-secret` (for auth)
**Status**: Requires `WEEKLY_SUMMARY_SECRET` env var.

### Other Endpoints

#### `GET /api/data/export`
Export all user data (GDPR compliance).
**Response**: JSON export of all user data.

#### `POST /api/account/delete`
Delete user account and all data.
**Status**: Requires confirmation, implements scheduled deletion.

#### `POST /api/feedback`
Submit user feedback.
**Body**: `{ message, category, email }`
**Uses**: Resend API for email delivery.

#### `GET /api/today`
Get all today's data aggregated (sleep, activity, nutrition, shifts).

#### `GET /api/daily-metrics/compute`
**POST** - Pre-compute daily metrics (cron job).
**Headers**: `x-cron-secret`

#### `POST /api/cron/precompute-daily-scores`
**Cron endpoint** - Pre-compute Body Clock Scores (scheduled task).

#### `GET /api/blog`
Get blog posts (content marketing).

---

## 🎯 Features & Functionality

### ✅ Fully Implemented Features

#### 1. Sleep Tracking System
- **Sleep Logging**: Log sleep sessions with start/end times
- **Sleep Classification**: Automatic classification (Main Sleep, Post-Shift Recovery, Pre-Shift Nap, Split Sleep, Micro Nap, Day Sleep)
- **Shift-Aware 24h Days**: Tracks sleep using shifted day boundaries (07:00 → 07:00) instead of midnight
- **Sleep Prediction**: AI-powered suggestions for optimal sleep times based on shift schedule
- **Sleep Deficit Tracking**: Monitors accumulated sleep debt
- **Sleep Quality Rating**: 1-5 scale
- **Sleep History**: View past sleep sessions with filters
- **7-Day Analysis**: Aggregated stats, consistency metrics
- **Sleep Stage Prediction**: Predicts REM, deep, light sleep percentages (requires age)
- **CRUD Operations**: Full create, read, update, delete with automatic recalculations

#### 2. Shift Rhythm & Body Clock Score
- **Body Clock Score (0-100)**: Overall score measuring adaptation to shift schedule
  - Sleep Score: Based on sleep quality and consistency
  - Regularity Score: Based on sleep/wake pattern consistency
  - Shift Pattern Score: Based on shift schedule regularity
  - Recovery Score: Based on recovery time between shifts
- **State Classification**: RED (high risk), AMBER (moderate), GREEN (good)
- **Shift Lag Detection**: Identifies circadian misalignment from shift changes
- **Social Jetlag Tracking**: Monitors circadian disruption
- **Circadian Rhythm Analysis**: Tracks phase shifts and alignment
- **Automatic Recalculation**: Recalculates on sleep/shift changes

#### 3. Shift Management (Rota)
- **Shift Creation**: Create individual shifts with type (day/night/late/off)
- **Bulk Shift Creation**: Create multiple shifts at once
- **Shift Patterns**: Define recurring patterns (partially implemented - persistence TODO)
- **Calendar Views**: View shifts in calendar format
- **Shift Type Classification**: Automatic classification based on times
- **Shift Colors**: User-customizable colors for different shift types
- **Upload Support**: Upload rota files (planned)

#### 4. Nutrition Advice System
- **Shift-Adjusted Calories**: Personalized calorie targets that adapt to shift type and activity level
- **Macro Recommendations**: Protein, carbs, and fat targets optimized for shift work
- **Meal Timing Advice**: Suggestions for when to eat based on shift schedule and biological night
- **Binge Risk Assessment**: Identifies high-risk periods for overeating during shift transitions
- **Food Database**: Multi-source food database (OpenFoodFacts, USDA, user-created)
- **Barcode Scanning**: Scan barcodes to log foods
- **Food Search**: Search food database by name
- **Nutrition Logging**: Log meals with calories and macros
- **Daily Nutrition Summary**: View totals and breakdowns
- **Goal-Based Adjustments**: Calories adjust based on goal (lose/maintain/gain)

#### 5. AI Coach
- **Adaptive Coaching**: Personalized advice that adjusts based on user state (RED/AMBER/GREEN)
- **Shift-Specific Guidance**: Recommendations tailored to night shifts, rotating schedules, and recovery needs
- **Context Awareness**: Considers sleep, activity, nutrition, and shift schedule
- **Empathetic Tone**: Non-judgmental, understanding language
- **Daily Greetings**: Personalized daily check-ins
- **Coaching Tips**: Contextual tips based on current situation
- **Chat Interface**: Interactive chat with conversation history
- **System Prompt**: Carefully crafted prompt emphasizing empathy and shift work understanding

#### 6. Activity & Recovery
- **Step Tracking**: Monitor daily activity with shift-appropriate goals
- **Activity Level Logging**: Track shift intensity (very light, light, moderate, busy, intense)
- **Recovery Score Calculation**: Scores based on sleep, shift type, and activity
- **Activity Recommendations**: Suggestions based on recovery status
- **Movement Consistency**: Tracks activity patterns

#### 7. Calendar Integration (Simple Calendar Pro)
- **Full Calendar System**: Monthly, weekly, day, and year views
- **Event Management**: Create, edit, delete events
- **Recurring Events**: Support for various recurrence patterns
- **Tasks**: Task management with due dates
- **Event Types**: Categorize events with colors
- **CalDAV Sync**: Sync with external calendars (CalDAV protocol)
- **Time Zone Support**: Handle multiple time zones
- **Event Search**: Search events by title/description
- **Attendees**: Add attendees to events
- **Reminders**: Set reminders for events

#### 8. Mood & Progress Tracking
- **Mood Logging**: Daily mood ratings (1-5)
- **Focus Logging**: Daily focus ratings (1-5)
- **Weekly Progress Summaries**: AI-generated summaries of sleep, nutrition, activity, and recovery
- **Weekly Goals System**: Set and track weekly goals
- **Goal Feedback**: AI-generated feedback on goal progress

#### 9. User Profile & Settings
- **Profile Management**: Name, age, height, weight, sex, DOB
- **Avatar Upload**: Profile picture upload to Supabase Storage
- **Units**: Metric/Imperial toggle
- **Goals**: Set weight goal (lose/maintain/gain)
- **Sleep Goals**: Custom sleep target hours
- **Water Goals**: Custom hydration target
- **Step Goals**: Custom daily step target
- **Time Zone**: Set time zone
- **Dark Mode**: System/Light/Dark theme selector
- **Settings UI**: Comprehensive settings page (many features not yet wired to save - see Known Issues)

#### 10. Authentication & Onboarding
- **Email/Password Auth**: Supabase Auth integration
- **Email Verification**: Required for new accounts
- **Password Reset**: Forgot password flow
- **Onboarding Flow**: Guided setup for new users
- **Session Management**: Persistent sessions with Supabase

#### 11. Subscription & Payments
- **Stripe Integration**: Payment processing
- **Subscription Plans**: Multiple tiers
- **Promo Codes**: Support for promotional codes
- **Checkout Flow**: Stripe Checkout integration
- **Payment Verification**: Verify successful payments

#### 12. Data Export & Privacy
- **Data Export**: Export all user data (GDPR compliance)
- **Account Deletion**: Delete account with scheduled deletion
- **Privacy Policy**: Legal page
- **Terms of Service**: Legal page
- **Health Data Notice**: Legal page

### ⚠️ Partially Implemented / Known Issues

#### 1. Settings Page - Many Placeholder Features
**Location**: `app/(app)/settings/`
**Issues**:
- Body weight input doesn't save to database
- Height & age "Edit" buttons do nothing
- Default shift pattern - no database field, no save functionality
- Ideal sleep window - no database field, no save functionality
- Wake reminders - no database field, no save functionality
- Mood/focus alerts toggle doesn't save
- Daily check-in reminder - no database field
- AI Coach tone - no database field
- Calorie adjustment aggressiveness - no database field
- Macro split presets - no database field
- Animations toggle doesn't save
- Export data button does nothing (API exists but not wired)
- Delete account button does nothing (API exists but not wired)

**Impact**: Users can't fully customize their experience.

**Fix Required**: Wire up all settings to `user_settings` table and API endpoints.

#### 2. Meal Timing Hook Using Mock Data
**Location**: `lib/hooks/useMealTiming.ts`
**Issue**: Hook structure is correct but returns hardcoded mock data instead of fetching from `/api/meal-timing/today`.
**Actual Status**: The hook DOES fetch from the API (I misread earlier - it's correctly implemented). However, the API endpoint may need verification.

#### 3. Missing Age/DOB in Sleep Calculations
**Locations**:
- `app/api/sleep/predict-stages/route.ts` (line 48)
- `app/api/sleep/7days/route.ts` (lines 265-266)
**Issue**: Age is set to `null` in sleep stage prediction and 7-day analysis.
**Impact**: Sleep stage predictions may be less accurate (age affects sleep architecture).
**Fix Required**: Get age from profile (DOB or age field) and pass to calculations.

#### 4. Rota Setup Not Persisting
**Locations**:
- `app/(app)/rota/setup/page.tsx` (line 276)
- `components/rota/RotaSetupPage.tsx` (line 680)
**Issue**: TODO comments indicate shift patterns aren't being saved to database.
**Impact**: Users can create patterns but they don't persist.
**Fix Required**: Implement database persistence for shift patterns in `user_shift_patterns` table.

#### 5. Activity Page Missing Profile Data
**Location**: `components/dashboard/pages/ActivityAndStepsPage.tsx`
**Issues**:
- Line 118: `lastSleepHours: null` - TODO to get from sleep data
- Line 119: `sleepDebtHours: 0` - TODO to get from sleep deficit
- Line 257: `weightKg={75}` - TODO to get from profile
**Impact**: Activity calculations may be less accurate.
**Fix Required**: Fetch real data from sleep API and profile.

#### 6. Sleep Deficit Not in Shift Rhythm Hook
**Location**: `lib/hooks/useShiftRhythm.ts` (line 109)
**Issue**: `sleepDeficit` is returned as `null as any` with TODO comment.
**Impact**: Components using this hook don't have sleep deficit data.
**Fix Required**: Add sleep deficit to hook state, fetch from `/api/sleep/deficit`.

---

## 🧩 Key Libraries & Utilities

### Custom React Hooks (22 hooks in `lib/hooks/`)

1. **`useTodaySleep`** - Get today's sleep data
2. **`useSleepHistory`** - Get sleep history with filters
3. **`useSleepMonth`** - Get monthly sleep data
4. **`useShiftRhythm`** - Get Body Clock Score and state
5. **`useCoachingState`** / **`useCoachState`** - Get coaching state (RED/AMBER/GREEN)
6. **`useCoachChat`** - AI Coach chat interface
7. **`useCoachTip`** - Get coaching tips
8. **`useMealTiming`** - Get meal timing recommendations
9. **`useTodayNutrition`** - Get today's nutrition data
10. **`useDailyNutrition`** - Get daily nutrition summary
11. **`useNutritionDaySummary`** - Get nutrition summary for a day
12. **`useActivityToday`** - Get today's activity data
13. **`useStepGoal`** - Get step goal and progress
14. **`useRotaMonth`** - Get monthly shift data
15. **`useWeeklyGoals`** - Get weekly goals
16. **`useWeeklyProgress`** - Get weekly progress data
17. **`useWeeklySummary`** - Get weekly summary
18. **`useSettings`** - Get user settings
19. **`useNotifications`** - Notification management
20. **`useEventNotifications`** - Calendar event notifications
21. **`useGoalChange`** - Handle goal changes
22. **`useNotifications`** - General notifications

### Core Calculation Libraries

#### Sleep (`lib/sleep/`)
- **`predictSleep.ts`** - Predict optimal sleep times based on shifts
- **`classifySleep.ts`** - Classify sleep sessions into types
- **`calculateDeficit.ts`** - Calculate sleep deficit
- **`calculateConsistency.ts`** - Calculate sleep consistency metrics
- **`predictStages.ts`** - Predict sleep stages (REM, deep, light)

#### Circadian (`lib/circadian/`)
- **`calcCircadianPhase.ts`** - Calculate circadian phase
- **`calculateShiftLag.ts`** - Calculate shift lag (misalignment)
- **`socialJetlag.ts`** - Calculate social jetlag
- **`tonightTarget.ts`** - Calculate tonight's sleep target

#### Shift Rhythm (`lib/shift-rhythm/`)
- **`engine.ts`** - Main Body Clock Score calculation engine
- **`calculateShiftRhythm.ts`** - Calculate all sub-scores and total

#### Nutrition (`lib/nutrition/`)
- **`calculateCalories.ts`** - Calculate shift-adjusted calorie targets
- **`calculateMacros.ts`** - Calculate macro recommendations
- **`mealTiming.ts`** - Calculate meal timing suggestions
- **`bingeRisk.ts`** - Calculate binge eating risk

#### Activity (`lib/activity/`)
- **`calculateActivityScore.ts`** - Calculate activity score
- **`calculateRecoveryScore.ts`** - Calculate recovery score
- **`generateActivityRecommendation.ts`** - Generate activity recommendations

#### Coach (`lib/coach/`)
- **`systemPrompt.ts`** - AI Coach system prompt (empathetic, shift-aware)
- **`getCoachingState.ts`** - Determine RED/AMBER/GREEN state
- **`generateWeeklySummary.ts`** - Generate AI weekly summaries
- **`generateWeeklyGoals.ts`** - Generate AI weekly goals
- **`dailyGreeting.ts`** - Generate daily greetings

### Data Aggregation (`lib/data/`)
- **`getUserMetrics.ts`** - Aggregate user metrics
- **`getWeeklyMetrics.ts`** - Aggregate weekly metrics
- **`getBehaviorSummary.ts`** - Summarize user behavior patterns
- **`buildRotaMonth.ts`** - Build monthly rota view

### Supabase Utilities (`lib/supabase/`)
- **`supabase.ts`** - Client-side Supabase client
- **`supabase-server.ts`** - Server-side Supabase client
- **`supabase-server-auth.ts`** - Server-side auth utilities
- **`error-handler.ts`** - Error handling utilities

---

## 🔧 Build & Deployment Configuration

### Next.js Configuration (`next.config.ts`)
```typescript
- Image optimization with remote patterns (OpenAI DALL-E, Unsplash)
- Compression enabled
- Package import optimization (lucide-react, framer-motion, recharts)
- Environment variables explicitly defined
```

### Capacitor Configuration (`capacitor.config.ts`)
```typescript
- App ID: com.shiftcoach.app
- App Name: shiftcoach-app
- Web Directory: public (Next.js build output)
- Server URL: https://www.shiftcoach.app (production)
  - Can be overridden with CAPACITOR_SERVER_URL env var
- HTTPS only (cleartext: false)
```

### Android Configuration
- **Version Code**: 7 (must increment for Play Store)
- **Version Name**: 1.0.5
- **Min SDK**: Configured in `android/app/build.gradle`
- **Target SDK**: Configured in `android/app/build.gradle`
- **Keystore**: `shiftcoach-release.keystore` (gitignored)
- **Build Variants**: debug, release

### Build Commands
```bash
# Development
npm run dev          # Start Next.js dev server (Turbopack)

# Production Build
npm run build        # Build Next.js app (outputs to .next/)
npm run start        # Start production server

# Mobile Build
npx cap sync android # Sync web app to Android project
# Then build in Android Studio
```

### Deployment
- **Web**: Vercel (production URL: https://www.shiftcoach.app)
- **Mobile**: Google Play Store (Android), App Store (iOS - planned)

---

## 🔐 Environment Variables

### Required (Production)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI (for AI Coach)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# IMPORTANT: Raw key, NO "Bearer " prefix, NO quotes, NO spaces

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email (for feedback, etc.)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=ShiftCoach <feedback@shiftcoach.app>
```

### Optional but Recommended

```env
# Cron Job Secrets (for scheduled tasks)
CRON_SECRET_KEY=random-32-byte-hex-string
WEEKLY_SUMMARY_SECRET=random-32-byte-hex-string

# USDA API (for food database expansion)
USDA_API_KEY=your-usda-api-key

# Capacitor (for local testing)
CAPACITOR_SERVER_URL=http://10.0.2.2:3000  # Android emulator localhost
```

### Development Only

```env
NEXT_PUBLIC_DEV_USER_ID=uuid-for-dev-user  # Skip auth in dev
```

---

## 🚀 Development Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account and project
- OpenAI API key (for AI Coach)
- (Optional) Android Studio (for mobile builds)

### Installation Steps

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd shiftcali
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create `.env.local` in root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-key
   ```

4. **Set up database**
   - Run all SQL migrations in `supabase/migrations/` in Supabase SQL Editor
   - Run in order (they're dated)

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   Navigate to http://localhost:3000

### Mobile Development Setup

1. **Build Next.js app**
   ```bash
   npm run build
   ```

2. **Sync to Capacitor**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio**
   - Open `android/` folder
   - Wait for Gradle sync
   - Run on device/emulator

---

## 📊 Current Implementation Status

### ✅ Production-Ready Features
- Sleep tracking (full CRUD)
- Body Clock Score calculation
- Shift management (individual shifts)
- AI Coach chat
- Nutrition advice and logging
- Activity tracking
- Calendar (Simple Calendar Pro)
- Mood logging
- Weekly summaries (AI-generated)
- User authentication
- Profile management (partial)
- Dark mode
- Responsive design

### ⚠️ Needs Completion
- Settings page wiring (many toggles/inputs don't save)
- Rota pattern persistence
- Age/DOB in sleep calculations
- Activity page real data integration
- Sleep deficit in shift rhythm hook
- Export/Delete account UI wiring

### 🚧 Planned / In Progress
- Meal timing API verification
- Wearable device sync (Google Fit partially implemented)
- Apple Health sync
- Samsung Watch integration
- Enhanced notifications
- Push notifications (mobile)

---

## 🎯 Known Technical Debt

1. **Settings Page**: Many UI elements not connected to backend
2. **Mock Data**: Some hooks/components may still use mock data (verify `useMealTiming`)
3. **Hardcoded Values**: Some components use hardcoded values instead of fetching from API
4. **TODOs**: Several TODO comments in code need attention
5. **Error Handling**: Some endpoints may need better error handling
6. **Loading States**: Some components may need loading state improvements
7. **Type Safety**: Some `any` types need proper typing

---

## 🔮 Future Enhancements (Recommended)

### High Priority
1. **Complete Settings Page** - Wire up all settings to save
2. **Fix Age in Sleep Calculations** - Improve accuracy
3. **Rota Pattern Persistence** - Save recurring patterns
4. **Activity Page Real Data** - Fetch from APIs
5. **Export/Delete Account UI** - Wire up existing APIs

### Medium Priority
1. **Enhanced Notifications** - Smart, context-aware reminders
2. **Push Notifications** - Mobile push notifications
3. **Wearable Sync** - Complete Google Fit and Apple Health integration
4. **Trend Analysis** - Long-term trend visualization
5. **Predictive Insights** - "If you continue this pattern..." warnings

### Low Priority
1. **Social Features** - Share achievements (optional)
2. **Gamification** - Badges, streaks (if aligned with empathetic design)
3. **Export Formats** - CSV, PDF exports
4. **Offline Support** - Cache data for offline use
5. **Multi-language** - Internationalization

---

## 📝 Important Notes for AI Assistants

### Design Philosophy
- **Never shame users** - Shift work is hard, celebrate small wins
- **Adaptive recommendations** - Adjust based on state (RED/AMBER/GREEN)
- **Shift-aware** - Everything should consider current shift type
- **Empathetic tone** - All AI responses should be understanding and supportive

### Code Style
- TypeScript strict mode
- Functional components with hooks
- Server components where possible (Next.js App Router)
- Client components marked with `'use client'`
- Consistent error handling patterns
- RLS (Row Level Security) on all database tables

### Testing Considerations
- Test with various shift patterns (day, night, rotating)
- Test with missing data (new users)
- Test edge cases (irregular schedules, long shifts)
- Test mobile responsiveness
- Test dark mode
- Test error states

### Performance Considerations
- Pre-compute daily metrics (cron job)
- Use database indexes (already implemented)
- Cache frequently accessed data
- Debounce user inputs
- Optimize images (Next.js Image component)
- Code splitting (automatic with Next.js)

---

## 🔗 Key Files Reference

### Configuration
- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `capacitor.config.ts` - Capacitor mobile configuration

### Status Documents
- `STATUS_REPORT.md` - Detailed status and recommendations
- `BUILD_STATUS.md` - Build and deployment status
- `APP_STATUS_REVIEW.md` - App review and gaps
- `README.md` - User-facing README

### Database
- `supabase/migrations/` - All database migrations
- Migration files are dated and should be run in order

### Key Components
- `components/dashboard/` - Main dashboard components
- `components/sleep/` - Sleep tracking UI
- `components/coach/` - AI Coach interface
- `components/calendar/` - Calendar components

### Key Libraries
- `lib/sleep/` - Sleep calculations
- `lib/shift-rhythm/` - Body Clock Score engine
- `lib/coach/` - AI Coach logic
- `lib/hooks/` - Custom React hooks

---

## 📞 Support & Resources

### Documentation Files in Repository
- `FOOD_DATABASE_SETUP.md` - Food database setup guide
- `VERCEL_SETUP_GUIDE.md` - Vercel deployment guide
- `STRIPE_SETUP_GUIDE.md` - Stripe payment setup
- `PLAY_STORE_UPLOAD_GUIDE.md` - Android app publishing
- `SIMPLE_CALENDAR_IMPLEMENTATION.md` - Calendar feature docs
- Many more guides in root directory

### External Resources
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Capacitor Docs: https://capacitorjs.com/docs
- OpenAI API Docs: https://platform.openai.com/docs

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: Development Team

---

*This document is intended to provide comprehensive technical context for AI assistants working on the Shift Coach codebase. For user-facing documentation, see README.md.*
