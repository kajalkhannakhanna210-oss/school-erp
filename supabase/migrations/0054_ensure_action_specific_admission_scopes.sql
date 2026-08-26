-- Ensure the action-specific scope column exists even when migration 0053 was
-- skipped or was applied before the staff scope table was created.
ALTER TABLE public.staff_module_scopes
  ADD COLUMN IF NOT EXISTS action_key TEXT DEFAULT 'ALL';

-- Existing rows represent an unrestricted scope and must continue to match all
-- actions after the column is introduced.
UPDATE public.staff_module_scopes
SET action_key = 'ALL'
WHERE action_key IS NULL;

-- Replace the pre-action uniqueness rule so each action can have its own
-- CLASS/SECTION/ALL scope rows.
DROP INDEX IF EXISTS ux_staff_module_scopes_unique;
DROP INDEX IF EXISTS staff_module_scopes_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_module_scopes_action_unique
  ON public.staff_module_scopes (
    staff_id,
    module_key,
    COALESCE(action_key, 'ALL'),
    scope_type,
    COALESCE(resource_id::text, '')
  );

CREATE INDEX IF NOT EXISTS idx_staff_module_scopes_action
  ON public.staff_module_scopes (action_key);

-- Make the newly-added column visible to PostgREST immediately after deploy.
NOTIFY pgrst, 'reload schema';
