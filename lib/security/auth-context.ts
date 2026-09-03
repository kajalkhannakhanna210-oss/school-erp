import { getCurrentUser } from "./authorization";

export async function getAuthContext() {
  const current = await getCurrentUser();
  if (!current) return null;
  const { profile, userType, loginContext } = current;
  return {
    user: current.authUser,
    profile,
    userType,
    organisation: loginContext?.organizationId ?? null,
    organisationId: loginContext?.organizationId ?? null,
    school: loginContext?.schoolId ?? null,
    schoolId: loginContext?.schoolId ?? null,
    role: profile.role,
    permissions: [] as string[],
    isSuperAdmin: userType === "SUPER_ADMIN",
    isOrganisationUser: userType === "ORGANISATION_USER",
    isSchoolUser: userType === "SCHOOL_USER",
  };
}
