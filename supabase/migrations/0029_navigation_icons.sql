alter table public.role_page_access add column if not exists icon text;

update public.role_page_access set icon = case page_key
  when 'dashboard' then '⌂' when 'master' then '▦' when 'sessions' then '◷'
  when 'classes' then '▤' when 'sections' then '▥' when 'class_teachers' then '♙'
  when 'students' then '♟' when 'admission_allotment' then '✓' when 'staff' then '♚'
  when 'attendance' then '◴' when 'exams' then '▣' when 'fees' then '₹'
  when 'payments' then '₹' when 'reports' then '▥' when 'cms' then '◆'
  when 'admissions' then '♜' when 'role_access' then '⚙' when 'profile' then '●'
  else '•' end
where icon is null;
