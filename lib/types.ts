export type UserRole = "super_admin" | "staff" | "student" | "organization_admin" | "school_admin";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  organization_id?: string | null;
  school_id?: string | null;
  username?: string | null;
  user_type?: "SUPER_ADMIN" | "ORGANISATION_USER" | "SCHOOL_USER" | null;
  platform_role?: string | null;
};
