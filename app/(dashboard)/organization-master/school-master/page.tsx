import { redirect } from "next/navigation";

/**
 * Compatibility route for older bookmarks/links.
 * School Master is a platform-level Super Admin page, not a child route of
 * one organisation, so the canonical URL remains /school-master.
 */
export default function OrganizationSchoolMasterRedirect() {
  redirect("/school-master");
}
