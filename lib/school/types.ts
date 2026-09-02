export type Organization = {
  id: string;
  code: string;
  name: string;
};

export type School = {
  id: string;
  organization_id: string;
  code: string;
  slug: string;
  name: string;
};
