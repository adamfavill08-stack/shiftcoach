-- Simple Calendar Pro - Complete Database Schema
-- Based on Simple Calendar Pro Kotlin Room database

-- ============================================
-- 1. EVENT TYPES TABLE
-- ============================================
create table if not exists public.event_types (
  id bigserial primary key,
  title text not null,
  color integer not null default 0,
  caldav_calendar_id integer not null default 0,
  caldav_display_name text not null default '',
  caldav_email text not null default '',
  type integer not null default 0, -- OTHER_EVENT, BIRTHDAY_EVENT, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists event_types_id_idx on public.event_types(id);

-- Insert default "Regular Event" type
insert into public.event_types (id, title, color, type)
values (1, 'Regular Event', 0, 0)
on conflict (id) do nothing;

-- ============================================
-- 2. EVENTS TABLE (includes both events and tasks)
-- ============================================
create table if not exists public.events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  
  -- Basic event info
  start_ts bigint not null default 0,
  end_ts bigint not null default 0,
  title text not null default '',
  location text not null default '',
  description text not null default '',
  
  -- Reminders (3 reminders supported)
  reminder_1_minutes integer not null default -1, -- REMINDER_OFF = -1
  reminder_2_minutes integer not null default -1,
  reminder_3_minutes integer not null default -1,
  reminder_1_type integer not null default 0, -- REMINDER_NOTIFICATION = 0
  reminder_2_type integer not null default 0,
  reminder_3_type integer not null default 0,
  
  -- Recurrence
  repeat_interval integer not null default 0, -- 0 = no repeat
  repeat_rule integer not null default 0, -- REPEAT_SAME_DAY, etc.
  repeat_limit bigint not null default 0, -- 0 = no limit
  repetition_exceptions jsonb default '[]'::jsonb, -- Array of day codes (YYYYMMdd)
  
  -- Attendees (stored as JSON array)
  attendees jsonb default '[]'::jsonb,
  
  -- Metadata
  import_id text not null default '',
  time_zone text not null default '',
  flags integer not null default 0, -- FLAG_ALL_DAY, FLAG_IS_IN_PAST, etc.
  event_type bigint not null default 1 references public.event_types(id),
  parent_id bigint not null default 0, -- For recurring event instances
  last_updated bigint not null default 0,
  source text not null default 'simple-calendar', -- simple-calendar, imported-ics, caldav, etc.
  availability integer not null default 0,
  color integer not null default 0,
  type integer not null default 0, -- TYPE_EVENT = 0, TYPE_TASK = 1
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for events
create unique index if not exists events_id_idx on public.events(id);
create index if not exists events_user_id_idx on public.events(user_id);
create index if not exists events_start_ts_idx on public.events(start_ts);
create index if not exists events_end_ts_idx on public.events(end_ts);
create index if not exists events_type_idx on public.events(type);
create index if not exists events_event_type_idx on public.events(event_type);
create index if not exists events_repeat_interval_idx on public.events(repeat_interval) where repeat_interval != 0;
create index if not exists events_import_id_idx on public.events(import_id) where import_id != '';
create index if not exists events_source_idx on public.events(source);
create index if not exists events_parent_id_idx on public.events(parent_id) where parent_id != 0;

-- Composite index for date range queries
create index if not exists events_date_range_idx on public.events(start_ts, end_ts) where start_ts != 0;

-- Full text search index
create index if not exists events_search_idx on public.events using gin(to_tsvector('english', title || ' ' || coalesce(location, '') || ' ' || coalesce(description, '')));

-- ============================================
-- 3. TASKS TABLE (separate table for task-specific data)
-- ============================================
create table if not exists public.tasks (
  id bigserial primary key,
  task_id bigint not null, -- References events.id where type = TYPE_TASK
  start_ts bigint not null default 0,
  flags integer not null default 0, -- FLAG_TASK_COMPLETED
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(id, task_id)
);

create unique index if not exists tasks_id_task_id_idx on public.tasks(id, task_id);
create index if not exists tasks_task_id_idx on public.tasks(task_id);

-- ============================================
-- 4. WIDGETS TABLE (for calendar widgets)
-- ============================================
create table if not exists public.widgets (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  widget_id integer not null,
  period integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, widget_id)
);

create unique index if not exists widgets_user_widget_idx on public.widgets(user_id, widget_id);

-- ============================================
-- 5. CALDAV CALENDARS TABLE (for external calendar sync)
-- ============================================
create table if not exists public.caldav_calendars (
  id serial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  calendar_id integer not null,
  display_name text not null,
  email text not null,
  url text not null,
  username text not null,
  password text not null, -- Encrypted
  sync_enabled boolean not null default true,
  last_sync_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, calendar_id)
);

create unique index if not exists caldav_calendars_user_calendar_idx on public.caldav_calendars(user_id, calendar_id);

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Event Types (public read, user write)
alter table public.event_types enable row level security;

drop policy if exists "event_types_select_public" on public.event_types;
create policy "event_types_select_public"
  on public.event_types for select
  using (true);

drop policy if exists "event_types_insert_authenticated" on public.event_types;
create policy "event_types_insert_authenticated"
  on public.event_types for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "event_types_update_authenticated" on public.event_types;
create policy "event_types_update_authenticated"
  on public.event_types for update
  using (auth.role() = 'authenticated');

-- Events (user-specific)
alter table public.events enable row level security;

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
  on public.events for select
  using (auth.uid() = user_id);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
  on public.events for insert
  with check (auth.uid() = user_id);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
  on public.events for update
  using (auth.uid() = user_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
  on public.events for delete
  using (auth.uid() = user_id);

-- Tasks (user-specific)
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks for select
  using (exists (
    select 1 from public.events
    where events.id = tasks.task_id
    and events.user_id = auth.uid()
  ));

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
  on public.tasks for insert
  with check (exists (
    select 1 from public.events
    where events.id = tasks.task_id
    and events.user_id = auth.uid()
  ));

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
  on public.tasks for update
  using (exists (
    select 1 from public.events
    where events.id = tasks.task_id
    and events.user_id = auth.uid()
  ));

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
  on public.tasks for delete
  using (exists (
    select 1 from public.events
    where events.id = tasks.task_id
    and events.user_id = auth.uid()
  ));

-- Widgets (user-specific)
alter table public.widgets enable row level security;

drop policy if exists "widgets_select_own" on public.widgets;
create policy "widgets_select_own"
  on public.widgets for select
  using (auth.uid() = user_id);

drop policy if exists "widgets_insert_own" on public.widgets;
create policy "widgets_insert_own"
  on public.widgets for insert
  with check (auth.uid() = user_id);

drop policy if exists "widgets_update_own" on public.widgets;
create policy "widgets_update_own"
  on public.widgets for update
  using (auth.uid() = user_id);

drop policy if exists "widgets_delete_own" on public.widgets;
create policy "widgets_delete_own"
  on public.widgets for delete
  using (auth.uid() = user_id);

-- CalDAV Calendars (user-specific)
alter table public.caldav_calendars enable row level security;

drop policy if exists "caldav_calendars_select_own" on public.caldav_calendars;
create policy "caldav_calendars_select_own"
  on public.caldav_calendars for select
  using (auth.uid() = user_id);

drop policy if exists "caldav_calendars_insert_own" on public.caldav_calendars;
create policy "caldav_calendars_insert_own"
  on public.caldav_calendars for insert
  with check (auth.uid() = user_id);

drop policy if exists "caldav_calendars_update_own" on public.caldav_calendars;
create policy "caldav_calendars_update_own"
  on public.caldav_calendars for update
  using (auth.uid() = user_id);

drop policy if exists "caldav_calendars_delete_own" on public.caldav_calendars;
create policy "caldav_calendars_delete_own"
  on public.caldav_calendars for delete
  using (auth.uid() = user_id);

-- ============================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_event_types_updated_at
  before update on public.event_types
  for each row
  execute function update_updated_at_column();

create trigger update_events_updated_at
  before update on public.events
  for each row
  execute function update_updated_at_column();

create trigger update_tasks_updated_at
  before update on public.tasks
  for each row
  execute function update_updated_at_column();

create trigger update_widgets_updated_at
  before update on public.widgets
  for each row
  execute function update_updated_at_column();

create trigger update_caldav_calendars_updated_at
  before update on public.caldav_calendars
  for each row
  execute function update_updated_at_column();

