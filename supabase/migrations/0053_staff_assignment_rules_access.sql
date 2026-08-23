-- Add page access for Admission Enquiry Staff Assignment Rules page

-- Add 'staff_assignment_rules' page key to role_page_access for super_admin
insert into public.role_page_access (role, page_key) 
values ('super_admin', 'staff_assignment_rules')
on conflict do nothing;

-- Update the pagePathMap in lib/require-role.ts to include:
--   staff_assignment_rules: "/admissions-admin/staff-assignment-rules"
