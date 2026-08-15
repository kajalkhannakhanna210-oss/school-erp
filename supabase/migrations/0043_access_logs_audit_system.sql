-- Migration 0043: Access Logs Audit System for School ERP
-- Table, indexes, RLS, role_page_access permissions, and seed demo records.

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_name text,
  email text,
  role public.user_role,
  module text not null,
  page text not null,
  resource text not null,
  request_method text not null check (request_method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD')),
  action text not null,
  status_code integer not null,
  ip_address text,
  device text,
  browser text,
  operating_system text,
  user_agent text,
  response_time_ms integer not null default 0 check (response_time_ms >= 0),
  session_reference text,
  request_id text,
  outcome text,
  created_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists access_logs_created_at_idx on public.access_logs (created_at desc);
create index if not exists access_logs_user_id_idx on public.access_logs (user_id, created_at desc);
create index if not exists access_logs_module_idx on public.access_logs (module, created_at desc);
create index if not exists access_logs_page_idx on public.access_logs (page, created_at desc);
create index if not exists access_logs_status_code_idx on public.access_logs (status_code, created_at desc);
create index if not exists access_logs_ip_address_idx on public.access_logs (ip_address);
create index if not exists access_logs_request_method_idx on public.access_logs (request_method);
create index if not exists access_logs_action_idx on public.access_logs (action);

-- Enable RLS
alter table public.access_logs enable row level security;

-- Row Level Security Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'access_logs_select_admin' AND n.nspname = 'public' AND c.relname = 'access_logs'
  ) THEN
    CREATE POLICY "access_logs_select_admin"
      ON public.access_logs FOR SELECT
      USING (public.is_super_admin() or exists (
        select 1 from public.role_page_access rpa
        join public.profiles p on p.role = rpa.role
        where p.id = auth.uid() and rpa.page_key = 'access_logs'
      ));
  END IF;
END
$$;

-- Register access_logs in role_page_access for super_admin
insert into public.role_page_access (role, page_key, icon)
values
  ('super_admin', 'access_logs', '📑')
on conflict (role, page_key) do update
set icon = excluded.icon;

-- Seed rich, realistic initial access logs for demonstration & immediate testing
insert into public.access_logs (
  user_name, email, role, module, page, resource, request_method, action,
  status_code, ip_address, device, browser, operating_system, user_agent,
  response_time_ms, session_reference, request_id, outcome, created_at
)
values
  ('Administrator', 'superadmin@school.edu', 'super_admin', 'Students', 'Student Directory', '/students', 'GET', 'View', 200, '103.21.244.12', 'Desktop', 'Chrome 124.0', 'Windows 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0', 142, 'sess_9f2a81', 'req_a78c10', 'Success', now() - interval '2 minutes'),
  ('Administrator', 'superadmin@school.edu', 'super_admin', 'Students', 'Add Student', '/students/new', 'POST', 'Create', 201, '103.21.244.12', 'Desktop', 'Chrome 124.0', 'Windows 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0', 380, 'sess_9f2a81', 'req_b89d21', 'Student created successfully', now() - interval '8 minutes'),
  ('Priya Sharma', 'priya.sharma@school.edu', 'staff', 'Attendance', 'Attendance Register', '/attendance', 'GET', 'View', 200, '49.36.128.55', 'Laptop', 'Firefox 125.0', 'macOS Sonoma', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Firefox/125.0', 195, 'sess_4e1c90', 'req_c90e32', 'Success', now() - interval '14 minutes'),
  ('Priya Sharma', 'priya.sharma@school.edu', 'staff', 'Attendance', 'Daily Attendance Mark', '/api/attendance/mark', 'POST', 'Update', 200, '49.36.128.55', 'Laptop', 'Firefox 125.0', 'macOS Sonoma', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Firefox/125.0', 420, 'sess_4e1c90', 'req_d01f43', 'Batch attendance saved', now() - interval '18 minutes'),
  ('Amit Verma', 'amit.verma@school.edu', 'staff', 'Examination', 'Mark Sheet Entry', '/exams', 'GET', 'View', 200, '157.34.89.201', 'Tablet', 'Safari 17.4', 'iPadOS 17.4', 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) Safari/605.1.15', 260, 'sess_8b3d12', 'req_e12a54', 'Success', now() - interval '25 minutes'),
  ('Rohan Gupta', 'rohan.gupta@student.edu', 'student', 'Fees & Finance', 'Fee Statement', '/payments', 'GET', 'View', 200, '182.72.19.44', 'Mobile', 'Chrome Mobile 124.0', 'Android 14', 'Mozilla/5.0 (Linux; Android 14) Chrome/124.0.0.0 Mobile', 180, 'sess_2a7e45', 'req_f23b65', 'Success', now() - interval '32 minutes'),
  ('Anonymous Client', null, null, 'Auth', 'Login Portal', '/api/auth/sign-in', 'POST', 'Login', 401, '45.133.1.88', 'Desktop', 'Chrome 123.0', 'Linux', 'Mozilla/5.0 (X11; Linux x86_64) Chrome/123.0.0.0', 610, null, 'req_034c76', 'Invalid credentials provided', now() - interval '45 minutes'),
  ('Administrator', 'superadmin@school.edu', 'super_admin', 'Fees & Finance', 'Fee Collection Report', '/reports?type=collection', 'GET', 'Export', 200, '103.21.244.12', 'Desktop', 'Chrome 124.0', 'Windows 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0', 890, 'sess_9f2a81', 'req_145d87', 'Exported Excel report', now() - interval '55 minutes'),
  ('Priya Sharma', 'priya.sharma@school.edu', 'staff', 'Settings', 'Role Page Access', '/role-access', 'GET', 'View', 403, '49.36.128.55', 'Laptop', 'Firefox 125.0', 'macOS Sonoma', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Firefox/125.0', 95, 'sess_4e1c90', 'req_256e98', 'Access Denied: Super Admin role required', now() - interval '1 hour 10 minutes'),
  ('Administrator', 'superadmin@school.edu', 'super_admin', 'Documents', 'Document Management', '/documents', 'POST', 'Create', 201, '103.21.244.12', 'Desktop', 'Chrome 124.0', 'Windows 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0', 1450, 'sess_9f2a81', 'req_367f09', 'Document uploaded successfully', now() - interval '1 hour 30 minutes'),
  ('Rajesh Kumar', 'rajesh.kumar@school.edu', 'staff', 'Academics', 'Class Schedule', '/academic/class-teachers', 'GET', 'View', 200, '106.51.78.190', 'Desktop', 'Edge 124.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/124.0.0.0', 210, 'sess_5c9a33', 'req_478a10', 'Success', now() - interval '2 hours'),
  ('Rajesh Kumar', 'rajesh.kumar@school.edu', 'staff', 'Students', 'Student Profile', '/students/stu_0884', 'GET', 'Search', 200, '106.51.78.190', 'Desktop', 'Edge 124.0', 'Windows 10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/124.0.0.0', 175, 'sess_5c9a33', 'req_589b21', 'Success', now() - interval '2 hours 15 minutes'),
  ('Anonymous Client', null, null, 'Admissions', 'Public Enquiry', '/api/public/contact', 'POST', 'Create', 429, '194.26.29.112', 'Desktop', 'Python-Requests 2.31', 'Linux', 'python-requests/2.31.0', 45, null, 'req_690c32', 'Rate limit exceeded: 429 Too Many Requests', now() - interval '3 hours'),
  ('Administrator', 'superadmin@school.edu', 'super_admin', 'Reports', 'Login Activity', '/reports/login-activity', 'GET', 'View', 200, '103.21.244.12', 'Desktop', 'Chrome 124.0', 'Windows 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0', 310, 'sess_9f2a81', 'req_701d43', 'Success', now() - interval '3 hours 45 minutes'),
  ('Sneha Patil', 'sneha.patil@student.edu', 'student', 'Examination', 'Report Card', '/exams/report-card', 'GET', 'Download', 200, '223.187.2.14', 'Mobile', 'Mobile Safari 17.3', 'iOS 17.3', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) Safari/604.1', 520, 'sess_3d8b19', 'req_812e54', 'Downloaded student grade PDF', now() - interval '4 hours 20 minutes'),
  ('Administrator', 'superadmin@school.edu', 'super_admin', 'Website CMS', 'Events Editor', '/cms?tab=events', 'PUT', 'Update', 200, '103.21.244.12', 'Desktop', 'Chrome 124.0', 'Windows 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0', 440, 'sess_9f2a81', 'req_923f65', 'Annual Sports Day event updated', now() - interval '5 hours'),
  ('Administrator', 'superadmin@school.edu', 'super_admin', 'Students', 'Delete Student Record', '/api/students/delete', 'DELETE', 'Delete', 200, '103.21.244.12', 'Desktop', 'Chrome 124.0', 'Windows 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0', 650, 'sess_9f2a81', 'req_034a76', 'Soft-deleted student archive created', now() - interval '6 hours 30 minutes'),
  ('Amit Verma', 'amit.verma@school.edu', 'staff', 'Fees & Finance', 'Fee Adjustments', '/fees/concessions', 'GET', 'View', 403, '157.34.89.201', 'Tablet', 'Safari 17.4', 'iPadOS 17.4', 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) Safari/605.1.15', 110, 'sess_8b3d12', 'req_145b87', 'Forbidden: Teacher lacks finance write permissions', now() - interval '8 hours'),
  ('System Cron', 'system@school.internal', 'super_admin', 'Academics', 'Academic Session Rollback', '/api/cron/session-sync', 'POST', 'Update', 500, '127.0.0.1', 'Desktop', 'Internal Cron Service', 'Linux', 'SchoolERP-Internal-Runner/1.0', 2150, null, 'req_256c98', 'Database transaction lock timeout on academic_sessions', now() - interval '12 hours'),
  ('Administrator', 'superadmin@school.edu', 'super_admin', 'Reports', 'Access Logs', '/reports/access-logs', 'GET', 'View', 200, '103.21.244.12', 'Desktop', 'Chrome 124.0', 'Windows 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0', 165, 'sess_9f2a81', 'req_367d09', 'Success', now() - interval '14 hours');
