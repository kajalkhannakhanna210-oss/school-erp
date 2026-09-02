import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { getPageMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/website/config";
import { Design2AboutPage } from "@/components/website/templates/design-2/about";
import { Design1AboutPage } from "@/components/website/templates/design-1/about";
import { Design1ContentPage } from "@/components/website/templates/design-1/content-page";
import { Design1AcademicsPage } from "@/components/website/templates/design-1/academics";
import { Design1AdmissionsPage } from "@/components/website/templates/design-1/admissions";
import { Design1FacilitiesPage } from "@/components/website/templates/design-1/facilities";
import { Design1PrincipalMessagePage } from "@/components/website/templates/design-1/principal-message";
import { Design1ChairmanMessagePage } from "@/components/website/templates/design-1/chairman-message";
import { Design2ContentPage } from "@/components/website/templates/design-2/content-page";

const ALLOWED_SLUGS = new Set([
  "about",
  "principal-message",
  "chairman-message",
  "facilities",
  "academics",
  "admissions",
]);

const SEO: Record<string, { title: string; description: string }> = {
  about: { title: "About the School", description: "Learn about our school community, educational values, and approach to student growth." },
  "principal-message": { title: "Principal's Message", description: "Read the principal's message about our school's learning community and educational vision." },
  "chairman-message": { title: "Chairman's Message", description: "Read the chairman's message about the school's purpose, values, and future." },
  facilities: { title: "School Facilities", description: "Explore the learning, science, library, sports, arts, and campus facilities available at our school." },
  academics: { title: "Academics", description: "Discover our academic approach, curriculum, and learning opportunities for students." },
  admissions: { title: "School Admissions", description: "Find school admission information, application guidance, and important enrollment details." },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const seo = SEO[params.slug];
  if (!seo) return {};
  return getPageMetadata(`/${params.slug}`, { title: seo.title, description: seo.description, alternates: { canonical: `/${params.slug}` }, openGraph: { title: seo.title, description: seo.description, url: `/${params.slug}` } });
}

export default async function SitePage({ params }: { params: { slug: string } }) {
  if (!ALLOWED_SLUGS.has(params.slug)) notFound();

  const supabase = await createClient();
  if (params.slug === "about") {
    const { data: aboutPage } = await supabase.from("site_pages").select("image_path").eq("slug", "about").single();
    const imageUrl = aboutPage?.image_path
      ? supabase.storage.from("site-media").getPublicUrl(aboutPage.image_path).data.publicUrl
      : "/about-school.jpg";
    const siteConfig = await getSiteConfig();
    if (siteConfig?.template.id === "design-2") {
      return <Design2AboutPage schoolName={siteConfig.school.name} imageUrl={imageUrl} />;
    }
    return <Design1AboutPage imageUrl={imageUrl} />;
  }

  const { data: page } = await supabase.from("site_pages").select("*").eq("slug", params.slug).single();

  const fallbackTitle = params.slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  let imageUrl: string | null = null;
  if (page?.image_path) {
    const { data } = supabase.storage.from("site-media").getPublicUrl(page.image_path);
    imageUrl = data.publicUrl;
  }

  const content = page?.content;

  const pageProps = { title: page?.title || fallbackTitle, content: content || "", imageUrl };
  const siteConfig = await getSiteConfig();
  if (siteConfig?.template.id === "design-2") return <Design2ContentPage {...pageProps} />;
  if (params.slug === "academics") return <Design1AcademicsPage {...pageProps} />;
  if (params.slug === "admissions") return <Design1AdmissionsPage {...pageProps} />;
  if (params.slug === "facilities") return <Design1FacilitiesPage {...pageProps} />;
  if (params.slug === "principal-message") return <Design1PrincipalMessagePage {...pageProps} />;
  if (params.slug === "chairman-message") return <Design1ChairmanMessagePage {...pageProps} />;
  return <Design1ContentPage {...pageProps} />;
}
