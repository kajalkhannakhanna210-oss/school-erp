-- Add indexes for student queries to improve performance
-- These indexes speed up filtering and searching on the students table

CREATE INDEX IF NOT EXISTS idx_students_is_active ON public.students(is_active);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON public.students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_section_id ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_session_id ON public.students(session_id);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students(created_at DESC);

-- Indexes for student enrollments
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_session_id ON public.student_enrollments(session_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_session ON public.student_enrollments(student_id, session_id);

-- Indexes for student leaving requests
CREATE INDEX IF NOT EXISTS idx_student_leaving_requests_student_id ON public.student_leaving_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leaving_requests_status ON public.student_leaving_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_leaving_requests_session_id ON public.student_leaving_requests(session_id);
