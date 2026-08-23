-- Migration 0052: Tighten RLS for Admission Enquiries and Follow-ups (defense-in-depth)

-- Drop permissive policies if present
DROP POLICY IF EXISTS enquiries_select ON public.enquiries;
DROP POLICY IF EXISTS enquiries_all_super_admin ON public.enquiries;
DROP POLICY IF EXISTS enquiries_insert_staff ON public.enquiries;
DROP POLICY IF EXISTS enquiries_update_staff ON public.enquiries;

DROP POLICY IF EXISTS enquiry_followups_select ON public.enquiry_followups;
DROP POLICY IF EXISTS enquiry_followups_all_staff ON public.enquiry_followups;

-- Select policy for enquiries: allow if super_admin OR staff_module_scopes grants access
CREATE POLICY IF NOT EXISTS enquiries_select_admission ON public.enquiries FOR SELECT USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.staff_module_scopes s
    WHERE s.staff_id = auth.uid()
      AND s.module_key = 'admission_enquiry'
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = public.enquiries.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND public.enquiries.assigned_staff_id = auth.uid())
      )
  )
);

-- Insert policy: allow creating an enquiry only if user has scope for the target class (or ALL)
CREATE POLICY IF NOT EXISTS enquiries_insert_admission ON public.enquiries FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.staff_module_scopes s
    WHERE s.staff_id = auth.uid()
      AND s.module_key = 'admission_enquiry'
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = NEW.class_id::text)
      )
  )
);

-- Update policy: allow updating if super_admin OR scope covers original or target class OR own assigned
CREATE POLICY IF NOT EXISTS enquiries_update_admission ON public.enquiries FOR UPDATE USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.staff_module_scopes s
    WHERE s.staff_id = auth.uid()
      AND s.module_key = 'admission_enquiry'
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = public.enquiries.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND public.enquiries.assigned_staff_id = auth.uid())
      )
  )
) WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.staff_module_scopes s
    WHERE s.staff_id = auth.uid()
      AND s.module_key = 'admission_enquiry'
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = NEW.class_id::text)
      )
  )
);

-- Delete policy: similar to update (allow only if scope applies)
CREATE POLICY IF NOT EXISTS enquiries_delete_admission ON public.enquiries FOR DELETE USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.staff_module_scopes s
    WHERE s.staff_id = auth.uid()
      AND s.module_key = 'admission_enquiry'
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = public.enquiries.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND public.enquiries.assigned_staff_id = auth.uid())
      )
  )
);

-- Follow-ups: allow select/insert/update if user can access the parent enquiry (defense-in-depth)
DROP POLICY IF EXISTS enquiry_followups_select ON public.enquiry_followups;
CREATE POLICY IF NOT EXISTS enquiry_followups_select_admission ON public.enquiry_followups FOR SELECT USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.enquiries e
    JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
    WHERE e.id = public.enquiry_followups.enquiry_id
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS enquiry_followups_insert ON public.enquiry_followups;
CREATE POLICY IF NOT EXISTS enquiry_followups_insert_admission ON public.enquiry_followups FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.enquiries e
    JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
    WHERE e.id = NEW.enquiry_id
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid())
      )
  )
);

-- Updates/deletes on followups follow same rule as parent enquiry
DROP POLICY IF EXISTS enquiry_followups_update ON public.enquiry_followups;
CREATE POLICY IF NOT EXISTS enquiry_followups_update_admission ON public.enquiry_followups FOR UPDATE USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.enquiries e
    JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
    WHERE e.id = public.enquiry_followups.enquiry_id
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid())
      )
  )
) WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.enquiries e
    JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
    WHERE e.id = NEW.enquiry_id
      AND (
        s.scope_type = 'ALL'
        OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid())
      )
  )
);

-- Done
