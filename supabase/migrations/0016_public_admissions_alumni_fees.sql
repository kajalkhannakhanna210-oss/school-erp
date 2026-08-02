create table public.fee_structures (
  id uuid primary key default gen_random_uuid(), class_name text not null unique,
  admission_fee numeric(12,2) not null default 0, annual_fee numeric(12,2) not null default 0,
  tuition_fee numeric(12,2) not null default 0, transport_fee numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table public.admission_applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), phone text not null,
  student_name text not null, date_of_birth date not null, applying_for text not null,
  parent_name text not null, parent_email text not null, address text not null,
  status text not null default 'new' check (status in ('new','reviewing','contacted','closed')), created_at timestamptz not null default now()
);
create table public.alumni_registrations (
  id uuid primary key default gen_random_uuid(), full_name text not null, email text not null, phone text,
  graduation_year integer not null, occupation text, message text, created_at timestamptz not null default now()
);
alter table public.fee_structures enable row level security;
alter table public.admission_applications enable row level security;
alter table public.alumni_registrations enable row level security;
create policy "fee_read_public" on public.fee_structures for select using (true);
create policy "fee_manage_admin" on public.fee_structures for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "admission_submit_verified" on public.admission_applications for insert with check (auth.uid() = user_id);
create policy "admission_read_admin" on public.admission_applications for select using (public.is_super_admin());
create policy "admission_manage_admin" on public.admission_applications for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy "alumni_submit_public" on public.alumni_registrations for insert with check (true);
create policy "alumni_read_admin" on public.alumni_registrations for select using (public.is_super_admin());
