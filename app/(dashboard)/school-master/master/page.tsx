import { redirect } from "next/navigation";

/** Compatibility route for an accidentally nested School Master URL. */
export default function NestedSchoolMasterRedirect() {
  redirect("/school-master");
}
