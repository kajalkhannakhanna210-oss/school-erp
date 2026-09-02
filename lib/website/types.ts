export type WebsiteTemplateId = "design-1" | "design-2";

export type SchoolWebsite = {
  id: string;
  organization_id: string;
  school_id: string;
  design_template: WebsiteTemplateId;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  website_title: string | null;
  website_description: string | null;
  status: "active" | "draft" | "disabled";
};
