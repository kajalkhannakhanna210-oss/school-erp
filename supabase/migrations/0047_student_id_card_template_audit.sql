-- Track which template became the default, when it happened, and who changed it.
create table if not exists public.student_id_card_template_audit_logs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.student_id_card_templates(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('set_default', 'unset_default', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists student_id_card_template_audit_template_idx
  on public.student_id_card_template_audit_logs(template_id, created_at desc);
create index if not exists student_id_card_template_audit_created_idx
  on public.student_id_card_template_audit_logs(created_at desc);

alter table public.student_id_card_template_audit_logs enable row level security;
create policy "id_card_template_audit_read"
  on public.student_id_card_template_audit_logs for select
  using (auth.uid() is not null);
create policy "id_card_template_audit_admin"
  on public.student_id_card_template_audit_logs for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
