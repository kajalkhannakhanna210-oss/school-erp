import { getCurrentUser } from "./authorization";

export async function getAuthContext() {
  const current = await getCurrentUser();
  if (!current) return null;
  const { profile, userType, loginContext } = current;
  const organisationId = loginContext?.organizationId ?? profile.organization_id ?? null;
  const schoolId = loginContext?.schoolId ?? profile.school_id ?? null;
  return {
    user: current.authUser,
    profile,
    userType,
    organisation: organisationId,
    organisationId,
    school: schoolId,
    schoolId,
    role: profile.role,
    assignedRole: current.assignedRole,
    permissions: current.permissions,
    isSuperAdmin: userType === "SUPER_ADMIN",
    isOrganisationUser: userType === "ORGANISATION_USER",
    isSchoolUser: userType === "SCHOOL_USER",
  };
}
