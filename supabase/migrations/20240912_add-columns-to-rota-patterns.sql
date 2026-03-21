alter table public.rota_patterns
  add column if not exists shift_length text default '12h';

alter table public.rota_patterns
  add column if not exists pattern_slots text default 'DNO';

alter table public.rota_patterns
  add column if not exists notes text;

alter table public.rota_patterns
  alter column color_config set default '{}'::jsonb;

update public.rota_patterns
  set color_config = '{}'::jsonb
  where color_config is null;

alter table public.rota_patterns
  alter column color_config set not null;

alter table public.rota_patterns
  alter column shift_length set not null;

alter table public.rota_patterns
  alter column pattern_slots set not null;

alter table public.rota_patterns
  alter column shift_length drop default;

alter table public.rota_patterns
  alter column pattern_slots drop default;
