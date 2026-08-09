alter table public.student_enrollments alter column section_id drop not null;

insert into public.student_enrollments (student_id, session_id, class_id, section_id)
select id, session_id, class_id, section_id
from public.students
where session_id is not null and class_id is not null
on conflict (student_id, session_id) do update
set class_id = excluded.class_id, section_id = excluded.section_id;
