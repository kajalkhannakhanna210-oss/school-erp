import { redirect } from "next/navigation";
import { getMasterDataContext } from "@/lib/security/master-data-context";
import { getCurrentUser } from "@/lib/security/authorization";
import { LoginAsClient } from "./login-as-client";
import { recordServerAction } from "@/lib/security/access-logs";

export default async function LoginAsPage() {
  const current = await getCurrentUser();
  if (!current || !["SUPER_ADMIN", "ORGANISATION_USER"].includes(current.userType)) redirect("/dashboard");
  await recordServerAction({ action: "View Login As User", resource: "/login-as", module: "Security", page: "Login As User", userId: current.authUser.id, requestMethod: "GET", outcome: "Login As User page opened" });
  const context = await getMasterDataContext();
  const organizations = context.organizations;
  return <LoginAsClient organizations={organizations} schools={context.schools} isSuperAdmin={current.userType === "SUPER_ADMIN"} />;
}
