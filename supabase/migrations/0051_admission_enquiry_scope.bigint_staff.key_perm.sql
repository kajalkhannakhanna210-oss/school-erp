BEGIN;

-- core table for module-level scopes (staff_id as BIGINT)
CREATE TABLE IF NOT EXISTS public.staff_module_scopes (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL,
  module_key TEXT NOT NULL,
  scope_type TEXT NOT NULL, -- 'ALL','CLASS','SECTION','OWN_ASSIGNED'
  resource_id BIGINT,       -- class_id / section_id when applicable
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- uniqueness: one row per staff + module + scope_type + resource
CREATE UNIQUE INDEX IF NOT EXISTS staff_module_scopes_unique_idx
  ON public.staff_module_scopes (staff_id, module_key, scope_type, COALESCE(resource_id::text, ''));

-- optional FK to staff table (uncomment & adjust if staff PK exists and is BIGINT)
-- ALTER TABLE public.staff_module_scopes
--   ADD CONSTRAINT staff_module_scopes_staff_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

-- helpful indexes
CREATE INDEX IF NOT EXISTS staff_module_scopes_module_idx ON public.staff_module_scopes (module_key);
CREATE INDEX IF NOT EXISTS staff_module_scopes_resource_idx ON public.staff_module_scopes (resource_id);

-- Insert admission_enquiry permission keys using column "key"
INSERT INTO public.permissions ("key", description)
SELECT k, d FROM (VALUES
  ('admission_enquiry.view', 'View admission enquiries'),
  ('admission_enquiry.create', 'Create admission enquiries'),
  ('admission_enquiry.edit', 'Edit admission enquiries'),
  ('admission_enquiry.assign', 'Assign admission enquiries'),
  ('admission_enquiry.reassign', 'Reassign admission enquiries'),
  ('admission_enquiry.followup', 'Add follow-ups for enquiries'),
  ('admission_enquiry.change_status', 'Change enquiry status'),
  ('admission_enquiry.convert_won', 'Convert enquiry to Won'),
  ('admission_enquiry.mark_lost', 'Mark enquiry Lost'),
  ('admission_enquiry.export', 'Export admission enquiries'),
  ('admission_enquiry.view_reports', 'View admission enquiry reports'),
  ('admission_enquiry.manage_configuration', 'Manage admission enquiry configuration')
) AS t(k,d)
ON CONFLICT ("key") DO NOTHING;

COMMIT;
