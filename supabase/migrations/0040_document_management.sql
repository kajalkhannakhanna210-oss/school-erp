-- Phase 11: private, versioned student and staff document management.
-- Files remain in private Storage buckets; this migration intentionally gives
-- browser clients no direct document-object access. The application authorizes
-- every upload/download through server routes before using the service role.

do $$
begin
  create type public.document_subject_type as enum ('student', 'staff');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum ('active', 'pending_review', 'approved', 'rejected', 'expired', 'archived');
exception when duplicate_object then null;
end $$;

create table if not exists public.document_categories (
  id uuid primary key default gen_random_uuid(),
  subject_type public.document_subject_type not null,
  code text not null check (code ~ '^[a-z0-9_]{2,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  is_required boolean not null default false,
  is_sensitive boolean not null default false,
  subject_visible boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_type, code)
);

create table if not exists public.document_settings (
  id boolean primary key default true check (id),
  max_file_size_bytes integer not null default 10485760 check (max_file_size_bytes between 1048576 and 10485760),
  allowed_file_types text[] not null default array['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx'],
  expiry_reminder_days integer not null default 30 check (expiry_reminder_days between 1 and 365),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  check (allowed_file_types <@ array['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx'])
);

insert into public.document_settings (id) values (true) on conflict (id) do nothing;

insert into public.document_categories (subject_type, code, name, is_required, is_sensitive, subject_visible) values
  ('student', 'admission_form', 'Admission Form', true, false, true),
  ('student', 'birth_certificate', 'Birth Certificate', true, true, false),
  ('student', 'government_id', 'Aadhaar / Government ID', false, true, false),
  ('student', 'transfer_certificate', 'Previous School Transfer Certificate', true, false, true),
  ('student', 'previous_marksheet', 'Previous Marksheet', false, false, true),
  ('student', 'report_card', 'Report Card', false, false, true),
  ('student', 'character_certificate', 'Character Certificate', false, false, true),
  ('student', 'address_proof', 'Address Proof', true, true, false),
  ('student', 'passport_photo', 'Passport Size Photograph', false, false, true),
  ('student', 'medical_certificate', 'Medical Certificate', false, true, false),
  ('student', 'fee_documents', 'Fee-related Documents', false, true, false),
  ('student', 'scholarship_documents', 'Scholarship Documents', false, true, false),
  ('student', 'transport_documents', 'Transport Documents', false, false, true),
  ('student', 'guardian_documents', 'Parent/Guardian Documents', false, true, false),
  ('student', 'other', 'Other Documents', false, false, false),
  ('staff', 'resume_cv', 'Resume / CV', true, true, true),
  ('staff', 'appointment_letter', 'Appointment Letter', true, true, true),
  ('staff', 'joining_letter', 'Joining Letter', false, true, true),
  ('staff', 'employment_contract', 'Employment Contract', false, true, true),
  ('staff', 'educational_certificates', 'Educational Certificates', true, true, true),
  ('staff', 'experience_certificates', 'Experience Certificates', false, true, true),
  ('staff', 'government_id', 'Government ID', true, true, false),
  ('staff', 'address_proof', 'Address Proof', false, true, false),
  ('staff', 'tax_documents', 'PAN / Tax Documents', false, true, false),
  ('staff', 'bank_documents', 'Bank Details Documents', false, true, false),
  ('staff', 'salary_documents', 'Salary-related Documents', false, true, false),
  ('staff', 'performance_documents', 'Performance Documents', false, true, false),
  ('staff', 'training_certificates', 'Training Certificates', false, false, true),
  ('staff', 'leave_documents', 'Leave-related Documents', false, true, true),
  ('staff', 'resignation_documents', 'Resignation Documents', false, true, true),
  ('staff', 'relieving_letter', 'Relieving Letter', false, true, true),
  ('staff', 'other', 'Other Documents', false, false, false)
on conflict (subject_type, code) do nothing;

alter table public.student_documents
  add column if not exists category_id uuid references public.document_categories(id) on delete restrict,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists original_file_name text,
  add column if not exists stored_file_name text,
  add column if not exists file_type text,
  add column if not exists file_size_bytes integer,
  add column if not exists file_sha256 text,
  add column if not exists status public.document_status not null default 'pending_review',
  add column if not exists expiry_date date,
  add column if not exists version integer not null default 1,
  add column if not exists supersedes_document_id uuid references public.student_documents(id) on delete set null,
  add column if not exists uploaded_by uuid references public.profiles(id) on delete set null,
  add column if not exists uploaded_by_role public.user_role,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.student_documents
set
  category_id = coalesce(category_id, (select id from public.document_categories where subject_type = 'student' and code = 'other')),
  title = coalesce(nullif(title, ''), file_name),
  original_file_name = coalesce(nullif(original_file_name, ''), file_name),
  stored_file_name = coalesce(nullif(stored_file_name, ''), regexp_replace(file_path, '^.*/', '')),
  file_type = coalesce(nullif(file_type, ''), 'application/octet-stream'),
  file_size_bytes = coalesce(file_size_bytes, 0),
  status = coalesce(status, 'pending_review'),
  version = coalesce(version, 1),
  created_at = coalesce(created_at, uploaded_at, now()),
  updated_at = coalesce(updated_at, uploaded_at, now());

alter table public.student_documents
  alter column category_id set not null,
  alter column title set not null,
  alter column original_file_name set not null,
  alter column stored_file_name set not null,
  alter column file_type set not null,
  alter column file_size_bytes set not null,
  alter column created_at set not null;

alter table public.student_documents
  drop constraint if exists student_documents_title_length,
  drop constraint if exists student_documents_description_length,
  drop constraint if exists student_documents_size_check,
  drop constraint if exists student_documents_version_check;

alter table public.student_documents
  add constraint student_documents_title_length check (char_length(title) between 1 and 180),
  add constraint student_documents_description_length check (description is null or char_length(description) <= 2000),
  add constraint student_documents_size_check check (file_size_bytes >= 0),
  add constraint student_documents_version_check check (version >= 1);

create table if not exists public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  category_id uuid not null references public.document_categories(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 180),
  description text check (description is null or char_length(description) <= 2000),
  original_file_name text not null,
  stored_file_name text not null,
  file_path text not null unique,
  file_type text not null,
  file_size_bytes integer not null check (file_size_bytes >= 0),
  file_sha256 text,
  status public.document_status not null default 'pending_review',
  expiry_date date,
  version integer not null default 1 check (version >= 1),
  supersedes_document_id uuid references public.staff_documents(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_by_role public.user_role,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_activity_logs (
  id uuid primary key default gen_random_uuid(),
  document_subject_type public.document_subject_type not null,
  document_id uuid not null,
  student_id uuid references public.students(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  category_id uuid references public.document_categories(id) on delete set null,
  action text not null check (action in ('uploaded', 'viewed', 'downloaded', 'updated', 'replaced', 'archived', 'deleted', 'status_changed')),
  performed_by uuid references public.profiles(id) on delete set null,
  performed_by_role public.user_role,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((student_id is not null)::integer + (staff_id is not null)::integer = 1)
);

create index if not exists student_documents_student_id_idx on public.student_documents(student_id);
create index if not exists student_documents_category_id_idx on public.student_documents(category_id);
create index if not exists student_documents_status_idx on public.student_documents(status);
create index if not exists student_documents_uploaded_by_idx on public.student_documents(uploaded_by);
create index if not exists student_documents_created_at_idx on public.student_documents(created_at desc);
create index if not exists student_documents_expiry_date_idx on public.student_documents(expiry_date) where expiry_date is not null;
create index if not exists student_documents_hash_idx on public.student_documents(student_id, category_id, file_sha256) where file_sha256 is not null;
create index if not exists staff_documents_staff_id_idx on public.staff_documents(staff_id);
create index if not exists staff_documents_category_id_idx on public.staff_documents(category_id);
create index if not exists staff_documents_status_idx on public.staff_documents(status);
create index if not exists staff_documents_uploaded_by_idx on public.staff_documents(uploaded_by);
create index if not exists staff_documents_created_at_idx on public.staff_documents(created_at desc);
create index if not exists staff_documents_expiry_date_idx on public.staff_documents(expiry_date) where expiry_date is not null;
create index if not exists staff_documents_hash_idx on public.staff_documents(staff_id, category_id, file_sha256) where file_sha256 is not null;
create index if not exists document_activity_logs_document_idx on public.document_activity_logs(document_subject_type, document_id, created_at desc);
create index if not exists document_activity_logs_student_idx on public.document_activity_logs(student_id, created_at desc);
create index if not exists document_activity_logs_staff_idx on public.document_activity_logs(staff_id, created_at desc);
create index if not exists document_activity_logs_created_idx on public.document_activity_logs(created_at desc);

create or replace function public.has_document_permission(permission text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.staff_permissions
    where staff_id = auth.uid() and permission_key = permission
  );
$$;

create or replace function public.document_category_is_sensitive(category uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_sensitive from public.document_categories where id = category), true);
$$;

create or replace function public.document_category_subject_visible(category uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select subject_visible from public.document_categories where id = category), false);
$$;

create or replace function public.can_view_student_document(target_student_id uuid, category uuid, document_state public.document_status)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
    or (target_student_id = auth.uid() and document_state = 'approved' and public.document_category_subject_visible(category))
    or (
      (public.has_document_permission('view_student_documents') or public.has_document_permission('manage_student_documents'))
      and (not public.document_category_is_sensitive(category) or public.has_document_permission('view_sensitive_documents') or public.has_document_permission('manage_sensitive_documents'))
    );
$$;

create or replace function public.can_manage_student_document(category uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
    or (
      public.has_document_permission('manage_student_documents')
      and (not public.document_category_is_sensitive(category) or public.has_document_permission('manage_sensitive_documents'))
    );
$$;

create or replace function public.can_view_staff_document(target_staff_id uuid, category uuid, document_state public.document_status)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
    or (target_staff_id = auth.uid() and document_state = 'approved' and public.document_category_subject_visible(category))
    or (
      (public.has_document_permission('view_staff_documents') or public.has_document_permission('manage_staff_documents'))
      and (not public.document_category_is_sensitive(category) or public.has_document_permission('view_sensitive_documents') or public.has_document_permission('manage_sensitive_documents'))
    );
$$;

create or replace function public.can_manage_staff_document(category uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin()
    or (
      public.has_document_permission('manage_staff_documents')
      and (not public.document_category_is_sensitive(category) or public.has_document_permission('manage_sensitive_documents'))
    );
$$;

create or replace function public.document_category_matches_subject(category uuid, expected_type public.document_subject_type)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.document_categories where id = category and subject_type = expected_type and is_active);
$$;

create or replace function public.protect_document_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  previous_version integer;
  previous_subject uuid;
  previous_category uuid;
begin
  if tg_op = 'INSERT' then
    if not public.document_category_matches_subject(new.category_id, case when tg_table_name = 'student_documents' then 'student'::public.document_subject_type else 'staff'::public.document_subject_type end) then
      raise exception 'Invalid document category';
    end if;
    if auth.uid() is not null then
      new.uploaded_by := auth.uid();
      select role into new.uploaded_by_role from public.profiles where id = auth.uid();
    end if;
    if new.supersedes_document_id is not null then
      if tg_table_name = 'student_documents' then
        select student_id, category_id, version into previous_subject, previous_category, previous_version from public.student_documents where id = new.supersedes_document_id;
        if previous_subject is distinct from new.student_id or previous_category is distinct from new.category_id then raise exception 'Replacement must keep the same subject and category'; end if;
        new.version := previous_version + 1;
        update public.student_documents set status = 'archived' where id = new.supersedes_document_id;
      else
        select staff_id, category_id, version into previous_subject, previous_category, previous_version from public.staff_documents where id = new.supersedes_document_id;
        if previous_subject is distinct from new.staff_id or previous_category is distinct from new.category_id then raise exception 'Replacement must keep the same subject and category'; end if;
        new.version := previous_version + 1;
        update public.staff_documents set status = 'archived' where id = new.supersedes_document_id;
      end if;
      if previous_version is null then raise exception 'Superseded document does not exist'; end if;
    end if;
  else
    if tg_table_name = 'student_documents' then
      new.student_id := old.student_id;
    else
      new.staff_id := old.staff_id;
    end if;
    new.file_path := old.file_path;
    if tg_table_name = 'student_documents' then
      new.file_name := old.file_name;
    end if;
    new.original_file_name := old.original_file_name;
    new.stored_file_name := old.stored_file_name;
    new.file_type := old.file_type;
    new.file_size_bytes := old.file_size_bytes;
    new.file_sha256 := old.file_sha256;
    new.version := old.version;
    new.supersedes_document_id := old.supersedes_document_id;
    new.uploaded_by := old.uploaded_by;
    new.uploaded_by_role := old.uploaded_by_role;
    new.uploaded_at := old.uploaded_at;
    new.created_at := old.created_at;
    if not public.document_category_matches_subject(new.category_id, case when tg_table_name = 'student_documents' then 'student'::public.document_subject_type else 'staff'::public.document_subject_type end) then
      raise exception 'Invalid document category';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.audit_document_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  row_data record;
  action_name text;
  actor_role public.user_role;
begin
  if tg_op = 'DELETE' then
    row_data := old;
  else
    row_data := new;
  end if;
  select role into actor_role from public.profiles where id = auth.uid();
  if tg_op = 'INSERT' then action_name := case when row_data.supersedes_document_id is null then 'uploaded' else 'replaced' end;
  elsif tg_op = 'DELETE' then action_name := 'deleted';
  elsif row_data.status = 'archived' and old.status is distinct from 'archived' then action_name := 'archived';
  elsif row_data.status is distinct from old.status then action_name := 'status_changed';
  else action_name := 'updated';
  end if;
  insert into public.document_activity_logs (
    document_subject_type, document_id, student_id, staff_id, category_id, action, performed_by, performed_by_role, metadata
  ) values (
    case when tg_table_name = 'student_documents' then 'student'::public.document_subject_type else 'staff'::public.document_subject_type end,
    row_data.id,
    case when tg_table_name = 'student_documents' then row_data.student_id else null end,
    case when tg_table_name = 'staff_documents' then row_data.staff_id else null end,
    row_data.category_id,
    action_name,
    auth.uid(),
    actor_role,
    jsonb_build_object('status', row_data.status, 'version', row_data.version)
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists student_documents_protect_row on public.student_documents;
create trigger student_documents_protect_row before insert or update on public.student_documents for each row execute function public.protect_document_row();
drop trigger if exists staff_documents_protect_row on public.staff_documents;
create trigger staff_documents_protect_row before insert or update on public.staff_documents for each row execute function public.protect_document_row();
drop trigger if exists student_documents_audit_change on public.student_documents;
create trigger student_documents_audit_change after insert or update or delete on public.student_documents for each row execute function public.audit_document_change();
drop trigger if exists staff_documents_audit_change on public.staff_documents;
create trigger staff_documents_audit_change after insert or update or delete on public.staff_documents for each row execute function public.audit_document_change();

create or replace function public.touch_document_category_or_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_table_name = 'document_settings' then new.updated_by := auth.uid(); end if;
  return new;
end;
$$;
drop trigger if exists document_categories_touch on public.document_categories;
create trigger document_categories_touch before update on public.document_categories for each row execute function public.touch_document_category_or_settings();
drop trigger if exists document_settings_touch on public.document_settings;
create trigger document_settings_touch before update on public.document_settings for each row execute function public.touch_document_category_or_settings();

alter table public.document_categories enable row level security;
alter table public.document_settings enable row level security;
alter table public.staff_documents enable row level security;
alter table public.document_activity_logs enable row level security;

drop policy if exists "student_documents_select" on public.student_documents;
drop policy if exists "student_documents_write_admin" on public.student_documents;
drop policy if exists "student_documents_read_authorized" on public.student_documents;
drop policy if exists "student_documents_insert_authorized" on public.student_documents;
drop policy if exists "student_documents_update_authorized" on public.student_documents;
drop policy if exists "student_documents_delete_admin" on public.student_documents;

create policy "student_documents_read_authorized" on public.student_documents for select
  using (public.can_view_student_document(student_id, category_id, status));
create policy "student_documents_insert_authorized" on public.student_documents for insert
  with check (public.can_manage_student_document(category_id) and uploaded_by = auth.uid());
create policy "student_documents_update_authorized" on public.student_documents for update
  using (public.can_manage_student_document(category_id))
  with check (public.can_manage_student_document(category_id));
create policy "student_documents_delete_admin" on public.student_documents for delete using (public.is_super_admin());

create policy "staff_documents_read_authorized" on public.staff_documents for select
  using (public.can_view_staff_document(staff_id, category_id, status));
create policy "staff_documents_insert_authorized" on public.staff_documents for insert
  with check (public.can_manage_staff_document(category_id) and uploaded_by = auth.uid());
create policy "staff_documents_update_authorized" on public.staff_documents for update
  using (public.can_manage_staff_document(category_id))
  with check (public.can_manage_staff_document(category_id));
create policy "staff_documents_delete_admin" on public.staff_documents for delete using (public.is_super_admin());

create policy "document_categories_read_authenticated" on public.document_categories for select using (auth.uid() is not null);
create policy "document_categories_write_admin" on public.document_categories for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "document_settings_read_authenticated" on public.document_settings for select using (auth.uid() is not null);
create policy "document_settings_write_admin" on public.document_settings for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy "document_activity_logs_read_authorized" on public.document_activity_logs for select
  using (public.is_super_admin() or public.has_document_permission('view_document_audit'));
-- No insert/update/delete policy is intentionally granted for audit records.

insert into public.permissions (key, label) values
  ('view_student_documents', 'View student documents'),
  ('manage_student_documents', 'Manage student documents'),
  ('view_staff_documents', 'View staff documents'),
  ('manage_staff_documents', 'Manage staff documents'),
  ('view_sensitive_documents', 'View sensitive documents'),
  ('manage_sensitive_documents', 'Manage sensitive documents'),
  ('view_document_audit', 'View document audit history')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public) values
  ('student-documents', 'student-documents', false),
  ('staff-documents', 'staff-documents', false)
on conflict (id) do nothing;

-- Storage is service-role-only. These broad legacy policies allowed a class
-- teacher to access all student files and are superseded by document RLS plus
-- authenticated application routes.
drop policy if exists "student_documents_bucket_read" on storage.objects;
drop policy if exists "student_documents_bucket_write_admin" on storage.objects;
drop policy if exists "staff_documents_bucket_read" on storage.objects;
drop policy if exists "staff_documents_bucket_write" on storage.objects;

create or replace function public.search_document_subjects(
  p_subject_type public.document_subject_type,
  p_query text default '',
  p_limit integer default 20
)
returns table (id uuid, display_name text, reference_id text)
language plpgsql security definer set search_path = public as $$
begin
  if p_limit < 1 or p_limit > 50 then raise exception 'Invalid limit'; end if;
  if p_subject_type = 'student' then
    if not (public.is_super_admin() or public.has_document_permission('view_student_documents') or public.has_document_permission('manage_student_documents')) then raise exception 'Not authorized'; end if;
    return query
      select s.id, p.full_name, s.admission_number
      from public.students s join public.profiles p on p.id = s.id
      where p_query = '' or p.full_name ilike '%' || p_query || '%' or s.admission_number ilike '%' || p_query || '%'
      order by p.full_name limit p_limit;
  else
    if not (public.is_super_admin() or public.has_document_permission('view_staff_documents') or public.has_document_permission('manage_staff_documents')) then raise exception 'Not authorized'; end if;
    return query
      select s.id, p.full_name, s.employee_id
      from public.staff s join public.profiles p on p.id = s.id
      where p_query = '' or p.full_name ilike '%' || p_query || '%' or s.employee_id ilike '%' || p_query || '%'
      order by p.full_name limit p_limit;
  end if;
end;
$$;
revoke all on function public.search_document_subjects(public.document_subject_type, text, integer) from public;
grant execute on function public.search_document_subjects(public.document_subject_type, text, integer) to authenticated;

insert into public.role_page_access (role, page_key) values
  ('super_admin', 'documents'), ('staff', 'documents')
on conflict (role, page_key) do nothing;

notify pgrst, 'reload schema';
