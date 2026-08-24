-- Migration 0053: Action-Specific Admission Enquiry Scopes
-- Adds action_key column to staff_module_scopes table to support independent per-action scopes
-- e.g., create, view, edit, assign, followup, change_status, report, export

ALTER TABLE public.staff_module_scopes 
  ADD COLUMN IF NOT EXISTS action_key TEXT DEFAULT 'ALL';

-- Create or update index to include action_key
DROP INDEX IF EXISTS ux_staff_module_scopes_unique;
CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_module_scopes_action_unique
  ON public.staff_module_scopes (staff_id, module_key, COALESCE(action_key, 'ALL'), scope_type, COALESCE(resource_id::text, ''));

CREATE INDEX IF NOT EXISTS idx_staff_module_scopes_action ON public.staff_module_scopes (action_key);
