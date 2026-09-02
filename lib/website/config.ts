import { getCurrentSchoolWebsite } from "@/lib/school/context";
import { getWebsiteTemplate } from "@/components/website/template-registry";

export async function getSiteConfig() {
  const current = await getCurrentSchoolWebsite();
  return current ? { ...current, template: getWebsiteTemplate(current.website.design_template) } : null;
}

export async function getSiteTemplate() {
  return (await getSiteConfig())?.template ?? getWebsiteTemplate("design-1");
}

export async function getSchoolWebsite() {
  return getCurrentSchoolWebsite();
}
