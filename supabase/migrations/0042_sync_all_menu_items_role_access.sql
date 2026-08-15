-- Migration 0042: Synchronize and bind all menu links and icons in role_page_access database table

insert into public.role_page_access (role, page_key, icon)
values
  -- Super Admin All Menu Links
  ('super_admin', 'dashboard', '⌂'),
  ('super_admin', 'master', '▦'),
  ('super_admin', 'sessions', '◷'),
  ('super_admin', 'classes', '▤'),
  ('super_admin', 'sections', '▥'),
  ('super_admin', 'class_teachers', '♙'),
  ('super_admin', 'students', '♟'),
  ('super_admin', 'add_student', '+'),
  ('super_admin', 'admission_allotment', '✓'),
  ('super_admin', 'staff', '♚'),
  ('super_admin', 'staff_sessions', '◷'),
  ('super_admin', 'exams', '▣'),
  ('super_admin', 'fees', '₹'),
  ('super_admin', 'documents', '▤'),
  ('super_admin', 'reports', '▥'),
  ('super_admin', 'login_activity', '◷'),
  ('super_admin', 'attendance', '◴'),
  ('super_admin', 'cms', '◆'),
  ('super_admin', 'admissions', '♜'),
  ('super_admin', 'role_access', '⚙'),
  ('super_admin', 'profile', '●'),

  -- Staff Menu Links
  ('staff', 'dashboard', '⌂'),
  ('staff', 'students', '♟'),
  ('staff', 'add_student', '+'),
  ('staff', 'exams', '▣'),
  ('staff', 'documents', '▤'),
  ('staff', 'reports', '▥'),
  ('staff', 'attendance', '◴'),
  ('staff', 'profile', '●'),

  -- Student Menu Links
  ('student', 'dashboard', '⌂'),
  ('student', 'exams', '▣'),
  ('student', 'payments', '₹'),
  ('student', 'attendance', '◴'),
  ('student', 'profile', '●')
on conflict (role, page_key) do update
set icon = excluded.icon;
