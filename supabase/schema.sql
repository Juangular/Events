create table public.events (
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

create policy "Public can read current free events"
on public.events for select
to anon, authenticated
using (
  status = 'published'
  and price_type = 'free'
  and department = 'Lima'
  and coalesce(end_date, start_date) >= current_date
);

create index events_public_dates_idx on public.events (department, status, price_type, start_date, end_date);

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
