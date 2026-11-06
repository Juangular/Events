create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null check (category in ('Cultura', 'Música', 'Deportes', 'Educación', 'Tecnología', 'Gastronomía', 'Familiar', 'Otros')),
  modality text not null check (modality in ('Presencial', 'Virtual')),
  image_url text,
  start_date date not null,
  end_date date,
  time text not null,
  place text not null,
  district text,
  department text not null default 'Lima',
  organizer text not null,
  source text not null,
  source_url text not null,
  registration_url text,
  requires_registration boolean not null default false,
  price_type text not null default 'free' check (price_type in ('free', 'paid')),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'finished', 'inactive')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_event_dates check (end_date is null or end_date >= start_date),
  constraint valid_event_content check (length(trim(title)) > 0 and length(trim(description)) > 0 and length(trim(time)) > 0 and length(trim(place)) > 0 and length(trim(organizer)) > 0 and length(trim(source)) > 0),
  constraint valid_event_urls check (source_url ~ '^https://[^[:space:]]+$' and (registration_url is null or registration_url ~ '^https://[^[:space:]]+$')),
  constraint registration_url_required check (not requires_registration or registration_url is not null)
);

alter table public.events drop constraint if exists valid_event_content;
alter table public.events add constraint valid_event_content check (length(trim(title)) > 0 and length(trim(description)) > 0 and length(trim(time)) > 0 and length(trim(place)) > 0 and length(trim(organizer)) > 0 and length(trim(source)) > 0);
alter table public.events drop constraint if exists valid_event_urls;
alter table public.events add constraint valid_event_urls check (source_url ~ '^https://[^[:space:]]+$' and (registration_url is null or registration_url ~ '^https://[^[:space:]]+$'));
alter table public.events drop constraint if exists registration_url_required;
alter table public.events add constraint registration_url_required check (not requires_registration or registration_url is not null);

alter table public.events enable row level security;

drop policy if exists "Public can read current free events" on public.events;
drop policy if exists "Public can read free Lima events" on public.events;
drop policy if exists "Public can read free Lima and Callao events" on public.events;

-- Lectura pública de eventos gratuitos de Lima y Callao publicados, con cualquier fecha.
-- El sitio separa en la interfaz entre eventos disponibles y eventos pasados.
create policy "Public can read free Lima and Callao events"
on public.events for select
to anon, authenticated
using (
  status = 'published'
  and price_type = 'free'
  and department in ('Lima', 'Callao')
);

create index if not exists events_public_dates_idx on public.events (department, status, price_type, start_date, end_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;

create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null check (category in ('Historia y patrimonio', 'Cultura y museos', 'Parques y naturaleza', 'Miradores y paseos', 'Playas', 'Barrios y arquitectura')),
  image_url text,
  area text not null check (area = 'Lima'),
  district text not null,
  address text not null,
  hours text not null,
  source text not null,
  source_url text not null,
  price_type text not null default 'free' check (price_type in ('free', 'paid')),
  status text not null default 'draft' check (status in ('draft', 'published', 'inactive')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_place_content check (length(trim(name)) > 0 and length(trim(description)) > 0 and length(trim(district)) > 0 and length(trim(address)) > 0),
  constraint valid_place_url check (source_url ~ '^https://(www\.)?google\.com/maps/.*$' or source_url ~ '^https://maps\.google\.com/.*$' or source_url ~ '^https://maps\.app\.goo\.gl/.*$' or source_url ~ '^https://goo\.gl/maps/.*$')
);

alter table public.places drop constraint if exists valid_place_content;
alter table public.places add constraint valid_place_content check (length(trim(name)) > 0 and length(trim(description)) > 0 and length(trim(district)) > 0 and length(trim(address)) > 0);
alter table public.places drop constraint if exists valid_place_url;
alter table public.places add constraint valid_place_url check (source_url ~ '^https://(www\.)?google\.com/maps/.*$' or source_url ~ '^https://maps\.google\.com/.*$' or source_url ~ '^https://maps\.app\.goo\.gl/.*$' or source_url ~ '^https://goo\.gl/maps/.*$');

alter table public.places drop constraint if exists places_area_check;
alter table public.places add constraint places_area_check check (area = 'Lima');

alter table public.places enable row level security;

drop policy if exists "Public can read free published places" on public.places;

create policy "Public can read free published places"
on public.places for select
to anon, authenticated
using (
  status = 'published'
  and price_type = 'free'
  and area = 'Lima'
);

create index if not exists places_public_order_idx on public.places (status, price_type, area, sort_order);

drop trigger if exists places_set_updated_at on public.places;

create trigger places_set_updated_at
before update on public.places
for each row
execute function public.set_updated_at();

-- Automatización de ingesta (pipeline en GitHub Actions).
-- El pipeline escribe con la service_role; el público nunca escribe.

alter table public.events add column if not exists origin text not null default 'manual' check (origin in ('manual', 'auto'));
alter table public.events add column if not exists source_key text;
alter table public.events add column if not exists fingerprint text;
alter table public.events add column if not exists raw jsonb;
alter table public.events add column if not exists synced_at timestamptz;

create unique index if not exists events_fingerprint_idx on public.events (fingerprint) where fingerprint is not null;

create table if not exists public.automation_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.automation_settings enable row level security;

create or replace function public.automation_settings_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists automation_settings_touch on public.automation_settings;

create trigger automation_settings_touch
before update on public.automation_settings
for each row
execute function public.automation_settings_touch_updated_at();

-- Switch de publicación: 'auto' publica directo lo que pasa todos los
-- filtros de calidad; 'review' guarda todo como draft para aprobación
-- manual desde Supabase. Sin políticas públicas: solo service_role.
insert into public.automation_settings (key, value)
values ('publish_mode', 'auto')
on conflict (key) do nothing;

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  fetched integer not null default 0,
  inserted integer not null default 0,
  published integer not null default 0,
  drafted integer not null default 0,
  skipped_dupes integer not null default 0,
  rejected integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);

alter table public.sync_runs enable row level security;

create index if not exists sync_runs_recent_idx on public.sync_runs (started_at desc);
