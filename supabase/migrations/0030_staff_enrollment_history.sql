create table if not exists public.staff_enrollments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  session_id uuid not null references public.academic_sessions(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (staff_id, session_id)
);
alter table public.staff_enrollments enable row level security;
create policy "staff_enrollments_read_admin" on public.staff_enrollments for select using (public.is_super_admin());
create policy "staff_enrollments_write_admin" on public.staff_enrollments for all using (public.is_super_admin()) with check (public.is_super_admin());
insert into public.staff_enrollments (staff_id, session_id, is_active)
select st.id, sess.id, st.is_active from public.staff st cross join lateral (select id from public.academic_sessions where is_current = true limit 1) sess
on conflict (staff_id, session_id) do nothing;
