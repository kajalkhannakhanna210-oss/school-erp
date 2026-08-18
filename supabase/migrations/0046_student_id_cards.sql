-- Student ID cards: templates, immutable card versions, and audit history.
create table if not exists public.student_id_card_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  card_title text not null default 'STUDENT IDENTITY CARD',
  orientation text not null default 'portrait' check (orientation in ('portrait', 'landscape')),
  width_mm numeric not null default 54 check (width_mm between 40 and 150),
  height_mm numeric not null default 86 check (height_mm between 40 and 150),
  front_fields jsonb not null default '["student_name","admission_number","class","section","roll_number","academic_session"]'::jsonb,
  back_fields jsonb not null default '["guardian_name","guardian_phone","address"]'::jsonb,
  options jsonb not null default '{"allow_missing_photo":false,"show_qr":false,"show_barcode":false,"barcode_value":"admission_number","instructions":"If found, please return to the school."}'::jsonb,
  footer_text text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists student_id_card_templates_default_idx on public.student_id_card_templates ((is_default)) where is_default;

create table if not exists public.student_id_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  template_id uuid not null references public.student_id_card_templates(id) on delete restrict,
  session_id uuid not null references public.academic_sessions(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  status text not null default 'generated' check (status in ('generated','printed','expired','cancelled','lost','damaged','replaced')),
  secure_token uuid not null default gen_random_uuid() unique,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles(id) on delete set null,
  printed_at timestamptz,
  printed_by uuid references public.profiles(id) on delete set null,
  regeneration_reason text,
  remarks text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (student_id, session_id, version)
);
create unique index if not exists student_id_cards_active_idx on public.student_id_cards(student_id, session_id) where status in ('generated','printed');
create index if not exists student_id_cards_list_idx on public.student_id_cards(session_id, status, generated_at desc);

create table if not exists public.student_id_card_audit_logs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.student_id_cards(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  template_id uuid references public.student_id_card_templates(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  previous_status text,
  new_status text,
  remarks text,
  created_at timestamptz not null default now()
);
create index if not exists student_id_card_audit_logs_card_idx on public.student_id_card_audit_logs(card_id, created_at desc);

alter table public.student_id_card_templates enable row level security;
alter table public.student_id_cards enable row level security;
alter table public.student_id_card_audit_logs enable row level security;
create policy "id_card_templates_read" on public.student_id_card_templates for select using (auth.uid() is not null);
create policy "id_cards_read" on public.student_id_cards for select using (auth.uid() is not null);
create policy "id_card_audit_read" on public.student_id_card_audit_logs for select using (auth.uid() is not null);
create policy "id_card_templates_admin" on public.student_id_card_templates for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "id_cards_admin" on public.student_id_cards for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "id_card_audit_admin" on public.student_id_card_audit_logs for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.role_page_access (role, page_key, icon) values
  ('super_admin', 'student_id_cards', '▤'),
  ('staff', 'student_id_cards', '▤')
on conflict (role, page_key) do update set icon = excluded.icon;
