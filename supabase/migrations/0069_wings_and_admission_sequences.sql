-- School wings, class-to-wing mapping, and atomic wing admission sequences.
create table if not exists public.school_wings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  wing_code text not null,
  wing_name text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, wing_code),
  unique (id, school_id)
);

create index if not exists school_wings_scope_idx on public.school_wings(organization_id, school_id, is_active, display_order);
-- Older installations may still have global classes. Add the tenant columns
-- during the transition so new class records can be scoped safely.
alter table public.classes add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.classes add column if not exists school_id uuid references public.schools(id) on delete cascade;
do $$
declare school_count integer;
begin
  select count(*) into school_count from public.schools;
  if school_count = 1 then
    update public.classes c
    set organization_id = s.organization_id, school_id = s.id
    from public.schools s
    where c.organization_id is null and c.school_id is null;
  end if;
end $$;
alter table public.classes add column if not exists wing_id uuid;
alter table public.classes drop constraint if exists classes_wing_id_fkey;
alter table public.classes add constraint classes_wing_id_fkey foreign key (wing_id) references public.school_wings(id) on delete set null;
create index if not exists classes_wing_idx on public.classes(school_id, wing_id);

create table if not exists public.wing_admission_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  wing_id uuid not null references public.school_wings(id) on delete cascade,
  prefix text not null default '', suffix text not null default '',
  starting_number bigint not null default 1, current_number bigint not null default 0,
  number_length integer not null default 4, separator text not null default '/',
  include_academic_year boolean not null default true,
  academic_year_format text not null default 'YYYY-YY',
  reset_policy text not null default 'never',
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (school_id, wing_id), check (starting_number > 0), check (number_length between 1 and 12),
  check (reset_policy in ('never', 'academic_year'))
);

create table if not exists public.wing_admission_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  wing_id uuid not null references public.school_wings(id) on delete cascade,
  academic_session_id uuid references public.academic_sessions(id) on delete cascade,
  sequence_key uuid generated always as (coalesce(academic_session_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  current_number bigint not null default 0,
  updated_at timestamptz not null default now()
);
create unique index if not exists wing_admission_sequences_scope_uq on public.wing_admission_sequences(school_id, wing_id, sequence_key);
create index if not exists wing_admission_sequences_scope_idx on public.wing_admission_sequences(organization_id, school_id, wing_id);

create or replace function public.format_wing_academic_year(p_session_id uuid, p_format text)
returns text language plpgsql stable as $$
declare n text; y1 text; y2 text;
begin
  select name into n from public.academic_sessions where id = p_session_id;
  if n is null then return ''; end if;
  y1 := substring(n from '(20[0-9]{2})');
  if y1 is null then return n; end if;
  y2 := right((y1::integer + 1)::text, 2);
  return replace(replace(coalesce(p_format, 'YYYY-YY'), 'YYYY', y1), 'YY', y2);
end $$;

create or replace function public.generate_wing_admission_number(p_organization_id uuid, p_school_id uuid, p_wing_id uuid, p_academic_session_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare p public.wing_admission_policies%rowtype; next_no bigint; year_text text; sequence_session uuid;
begin
  if not public.has_school_access(p_organization_id, p_school_id) then raise exception 'Not authorized for this school'; end if;
  select * into p from public.wing_admission_policies where organization_id = p_organization_id and school_id = p_school_id and wing_id = p_wing_id and is_active for update;
  if not found then raise exception 'No active admission policy is configured for this wing'; end if;
  sequence_session := case when p.reset_policy = 'academic_year' then p_academic_session_id else null end;
  insert into public.wing_admission_sequences(organization_id, school_id, wing_id, academic_session_id, current_number)
    values (p_organization_id, p_school_id, p_wing_id, sequence_session, p.starting_number - 1)
    on conflict (school_id, wing_id, sequence_key) do nothing;
  update public.wing_admission_sequences s set current_number = s.current_number + 1, updated_at = now()
    where s.school_id = p_school_id and s.wing_id = p_wing_id and s.academic_session_id is not distinct from sequence_session
    returning current_number into next_no;
  if next_no is null then raise exception 'Could not allocate admission number'; end if;
  update public.wing_admission_policies set current_number = next_no, updated_at = now() where id = p.id;
  year_text := case when p.include_academic_year then public.format_wing_academic_year(p_academic_session_id, p.academic_year_format) else '' end;
  return concat_ws(p.separator, nullif(p.prefix, ''), nullif(year_text, ''), lpad(next_no::text, p.number_length, '0'), nullif(p.suffix, ''));
end $$;

alter table public.school_wings enable row level security;
alter table public.wing_admission_policies enable row level security;
alter table public.wing_admission_sequences enable row level security;
drop policy if exists school_wings_tenant_access on public.school_wings;
create policy school_wings_tenant_access on public.school_wings for all to authenticated using (public.has_school_access(organization_id, school_id)) with check (public.has_school_access(organization_id, school_id));
drop policy if exists wing_policies_tenant_access on public.wing_admission_policies;
create policy wing_policies_tenant_access on public.wing_admission_policies for all to authenticated using (public.has_school_access(organization_id, school_id)) with check (public.has_school_access(organization_id, school_id));
drop policy if exists wing_sequences_tenant_access on public.wing_admission_sequences;
create policy wing_sequences_tenant_access on public.wing_admission_sequences for select to authenticated using (public.has_school_access(organization_id, school_id));

insert into public.role_page_access(role, page_key, icon)
select r.role, 'wing_master', '◈' from (values ('super_admin'::public.user_role), ('organization_admin'::public.user_role), ('school_admin'::public.user_role)) r(role)
where not exists (select 1 from public.role_page_access a where a.role = r.role and a.page_key = 'wing_master');
