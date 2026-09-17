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
  constraint valid_event_dates check (end_date is null or end_date >= start_date)
);

alter table public.events enable row level security;

drop policy if exists "Public can read current free events" on public.events;

create policy "Public can read current free events"
on public.events for select
to anon, authenticated
using (
  status = 'published'
  and price_type = 'free'
  and department = 'Lima'
  and coalesce(end_date, start_date) >= current_date
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
  updated_at timestamptz not null default now()
);

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
