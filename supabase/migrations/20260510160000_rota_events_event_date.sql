-- Production uses NOT NULL event_date (calendar anchor); keep in sync with `date`.
alter table public.rota_events
  add column if not exists event_date date;

update public.rota_events
set event_date = date
where event_date is null;

alter table public.rota_events
  alter column event_date set not null;
