import { redirect } from "next/navigation";

/** Compatibility route for links that include the dashboard route-group name. */
export default function DashboardOrganizationMasterRedirect() {
  redirect("/organization-master");
}
