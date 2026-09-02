export type UserRole = "super_admin" | "staff" | "student" | "organization_admin" | "school_admin";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
};
