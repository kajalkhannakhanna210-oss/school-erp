import type { WebsiteTemplateId } from "@/lib/website/types";

export type WebsiteTemplateDefinition = {
  id: WebsiteTemplateId;
  label: string;
  implementation: string;
};

// Design 1 is the existing app/(site) implementation. Keeping that route
// group in place preserves URLs, styling, forms, and current behavior.
// Design 2 is registered as an extension point for a later implementation.
export const WEBSITE_TEMPLATES: Record<WebsiteTemplateId, WebsiteTemplateDefinition> = {
  "design-1": { id: "design-1", label: "Current school website", implementation: "components/website/templates/design-1" },
  "design-2": { id: "design-2", label: "Future website design", implementation: "components/website/templates/design-2" },
};

export function getWebsiteTemplate(template: string | null | undefined): WebsiteTemplateDefinition {
  return WEBSITE_TEMPLATES[template as WebsiteTemplateId] ?? WEBSITE_TEMPLATES["design-1"];
}
