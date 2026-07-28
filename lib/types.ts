export type UserRole = "super_admin" | "staff" | "student";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
};
