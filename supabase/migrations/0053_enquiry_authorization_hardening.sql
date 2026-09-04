-- Enquiry authorization hardening.
-- RLS is the final server-side boundary; UI filtering is never authorization.

-- The enquiries table currently has class_id but no section_id. Class scope is
-- therefore the deepest record scope available for this module.

DROP POLICY IF EXISTS enquiries_select_admission ON public.enquiries;
DROP POLICY IF EXISTS enquiries_insert_admission ON public.enquiries;
DROP POLICY IF EXISTS enquiries_update_admission ON public.enquiries;
DROP POLICY IF EXISTS enquiries_delete_admission ON public.enquiries;

CREATE POLICY enquiries_select_authorized ON public.enquiries FOR SELECT USING (
  public.is_super_admin()
  OR (
    EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.view')
    AND EXISTS (
      SELECT 1 FROM public.staff_module_scopes s
      WHERE s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
        AND (s.action_key IN ('view', 'ALL') OR s.action_key IS NULL)
        AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = public.enquiries.class_id::text)
          OR (s.scope_type = 'OWN_ASSIGNED' AND public.enquiries.assigned_staff_id = auth.uid()))
    )
  )
);

CREATE POLICY enquiries_insert_authorized ON public.enquiries FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR (
    EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.create')
    AND EXISTS (
      SELECT 1 FROM public.staff_module_scopes s
      WHERE s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
        AND (s.action_key IN ('create', 'ALL') OR s.action_key IS NULL)
        AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = class_id::text))
    )
  )
);

CREATE POLICY enquiries_update_authorized ON public.enquiries FOR UPDATE
USING (
  public.is_super_admin()
  OR (
    EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.edit')
    AND EXISTS (
      SELECT 1 FROM public.staff_module_scopes s
      WHERE s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
        AND (s.action_key IN ('edit', 'ALL') OR s.action_key IS NULL)
        AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = public.enquiries.class_id::text)
          OR (s.scope_type = 'OWN_ASSIGNED' AND public.enquiries.assigned_staff_id = auth.uid()))
    )
  )
)
WITH CHECK (public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.edit'
));

-- There is no delete permission key in the module. Keep deletion super-admin only.
CREATE POLICY enquiries_delete_authorized ON public.enquiries FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS enquiry_followups_select_admission ON public.enquiry_followups;
DROP POLICY IF EXISTS enquiry_followups_insert_admission ON public.enquiry_followups;
DROP POLICY IF EXISTS enquiry_followups_update_admission ON public.enquiry_followups;
DROP POLICY IF EXISTS enquiry_followups_all_staff ON public.enquiry_followups;

CREATE POLICY enquiry_followups_select_authorized ON public.enquiry_followups FOR SELECT USING (
  public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.enquiries e
    JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
    WHERE e.id = enquiry_followups.enquiry_id
      AND EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.view')
      AND (s.action_key IN ('view', 'ALL') OR s.action_key IS NULL)
      AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid()))
  )
);

CREATE POLICY enquiry_followups_insert_authorized ON public.enquiry_followups FOR INSERT WITH CHECK (
  public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.enquiries e
    JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
    WHERE e.id = enquiry_id
      AND EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.followup')
      AND (s.action_key IN ('followup', 'ALL') OR s.action_key IS NULL)
      AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text)
        OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid()))
  )
);

CREATE POLICY enquiry_followups_update_authorized ON public.enquiry_followups FOR UPDATE
USING (public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.enquiries e JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
  WHERE e.id = enquiry_followups.enquiry_id AND EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.followup')
    AND (s.action_key IN ('followup', 'ALL') OR s.action_key IS NULL)
    AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text) OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid()))
)) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS enquiry_assignment_select ON public.enquiry_assignment_history;
DROP POLICY IF EXISTS enquiry_assignment_all_staff ON public.enquiry_assignment_history;
CREATE POLICY enquiry_assignment_select_authorized ON public.enquiry_assignment_history FOR SELECT USING (
  public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.enquiries e JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
    WHERE e.id = enquiry_assignment_history.enquiry_id AND EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.view')
      AND (s.action_key IN ('view', 'ALL') OR s.action_key IS NULL)
      AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text) OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid()))
  )
);
CREATE POLICY enquiry_assignment_insert_authorized ON public.enquiry_assignment_history FOR INSERT WITH CHECK (public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.enquiries e JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
  WHERE e.id = enquiry_id AND EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.assign')
    AND (s.action_key IN ('assign', 'ALL') OR s.action_key IS NULL)
    AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text) OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid()))
));

DROP POLICY IF EXISTS enquiry_audit_select ON public.enquiry_audit_logs;
DROP POLICY IF EXISTS enquiry_audit_all_staff ON public.enquiry_audit_logs;
CREATE POLICY enquiry_audit_select_authorized ON public.enquiry_audit_logs FOR SELECT USING (
  public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.enquiries e JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
    WHERE e.id = enquiry_audit_logs.enquiry_id AND EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.view')
      AND (s.action_key IN ('view', 'ALL') OR s.action_key IS NULL)
      AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text) OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid()))
  )
);
CREATE POLICY enquiry_audit_insert_authorized ON public.enquiry_audit_logs FOR INSERT WITH CHECK (public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.enquiries e JOIN public.staff_module_scopes s ON s.staff_id = auth.uid() AND s.module_key = 'admission_enquiry'
  WHERE e.id = enquiry_id AND EXISTS (SELECT 1 FROM public.staff_permissions p WHERE p.staff_id = auth.uid() AND p.permission_key = 'admission_enquiry.view')
    AND (s.action_key IN ('view', 'ALL') OR s.action_key IS NULL)
    AND (s.scope_type = 'ALL' OR (s.scope_type = 'CLASS' AND s.resource_id::text = e.class_id::text) OR (s.scope_type = 'OWN_ASSIGNED' AND e.assigned_staff_id = auth.uid()))
));
