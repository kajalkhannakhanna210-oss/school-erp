-- Global India location reference masters.
-- Additive and organisation-independent; safe to run more than once.

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  country_name text not null,
  iso2 text not null,
  iso3 text not null,
  phone_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (iso2), unique (iso3), unique (country_code)
);

create table if not exists public.states (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete restrict,
  state_code text,
  state_name text not null,
  state_type text not null default 'STATE' check (state_type in ('STATE', 'UNION_TERRITORY')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_id, state_name)
);

create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.states(id) on delete restrict,
  district_code text,
  district_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state_id, district_name)
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.states(id) on delete restrict,
  district_id uuid not null references public.districts(id) on delete restrict,
  city_name text not null,
  city_type text not null default 'LOCALITY' check (city_type in ('CITY', 'TOWN', 'VILLAGE', 'LOCALITY')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, city_name)
);

create table if not exists public.pincodes (
  id uuid primary key default gen_random_uuid(),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  country_id uuid not null references public.countries(id) on delete restrict,
  state_id uuid not null references public.states(id) on delete restrict,
  district_id uuid not null references public.districts(id) on delete restrict,
  city_id uuid references public.cities(id) on delete restrict,
  post_office_name text,
  office_type text,
  delivery_status text,
  division_name text,
  region_name text,
  circle_name text,
  latitude numeric,
  longitude numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pincode, district_id, post_office_name)
);

create index if not exists states_country_idx on public.states(country_id);
create index if not exists districts_state_idx on public.districts(state_id);
create index if not exists cities_district_idx on public.cities(district_id);
create index if not exists cities_state_idx on public.cities(state_id);
create index if not exists pincodes_pincode_idx on public.pincodes(pincode);
create index if not exists pincodes_state_idx on public.pincodes(state_id);
create index if not exists pincodes_district_idx on public.pincodes(district_id);
create index if not exists pincodes_city_idx on public.pincodes(city_id);

alter table public.countries enable row level security;
alter table public.states enable row level security;
alter table public.districts enable row level security;
alter table public.cities enable row level security;
alter table public.pincodes enable row level security;

drop policy if exists location_countries_read on public.countries;
create policy location_countries_read on public.countries for select to authenticated using (true);
drop policy if exists location_states_read on public.states;
create policy location_states_read on public.states for select to authenticated using (true);
drop policy if exists location_districts_read on public.districts;
create policy location_districts_read on public.districts for select to authenticated using (true);
drop policy if exists location_cities_read on public.cities;
create policy location_cities_read on public.cities for select to authenticated using (true);
drop policy if exists location_pincodes_read on public.pincodes;
create policy location_pincodes_read on public.pincodes for select to authenticated using (true);

do $$ declare t text; begin
  foreach t in array array['countries','states','districts','cities','pincodes'] loop
    execute format('drop policy if exists %I on public.%I', 'location_' || t || '_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin())', 'location_' || t || '_write', t);
  end loop;
end $$;

insert into public.countries (country_code, country_name, iso2, iso3, phone_code)
values ('IN', 'India', 'IN', 'IND', '+91')
on conflict (iso2) do update set country_code = excluded.country_code, country_name = excluded.country_name, iso3 = excluded.iso3, phone_code = excluded.phone_code, updated_at = now();
