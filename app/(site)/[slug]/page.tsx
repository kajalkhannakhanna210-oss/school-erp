import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { getPageMetadata } from "@/lib/seo";

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
    return <AboutPage imageUrl={imageUrl} />;
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-700">{page?.title || fallbackTitle}</h1>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={page?.title || fallbackTitle} className="mt-8 max-h-96 w-full rounded-lg object-cover" />
      )}
      <div className="mt-8 whitespace-pre-line text-slate/80">{content || "Content coming soon."}</div>
    </div>
  );
}

function AboutPage({ imageUrl }: { imageUrl: string }) {
  const pillars = [
    ["Purposeful learning", "A strong academic foundation, built through curiosity, discussion, and meaningful practice."],
    ["Character & confidence", "A caring environment where students learn to take responsibility, communicate well, and try bravely."],
    ["Life beyond lessons", "Sport, the arts, service, and clubs help every learner discover interests and build lasting friendships."],
  ];

  const mission = [
    "Create engaging, future-ready learning experiences.",
    "Build leadership, teamwork, and resilience in everyday school life.",
    "Encourage creativity, wellbeing, and a habit of service.",
  ];

  return (
    <div className="about-page bg-paper">
      <section className="relative isolate overflow-hidden bg-ink-900 py-20 text-paper sm:py-28">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "linear-gradient(120deg, rgba(34, 47, 87, .97), rgba(34, 47, 87, .72)), url('/remote-images/photo-1509062522246-3755977927d7.jpg')" }}
        />
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">Welcome to our school</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight sm:text-6xl">A place to learn, belong, and grow.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-paper/80">We nurture thoughtful, capable learners through a balanced education shaped by high expectations, genuine care, and rich opportunities beyond the classroom.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center sm:py-24">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-600">Our story</p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-ink-700 sm:text-5xl">Education with direction and heart.</h2>
          <div className="mt-6 space-y-5 text-lg leading-8 text-slate/75">
            <p>Our school is a community where every child is known, encouraged, and challenged to do their best. We combine rigorous learning with creativity, sport, collaboration, and a strong sense of responsibility.</p>
            <p>With trusted teachers and engaged families working together, students develop the knowledge, character, and confidence to contribute positively wherever life takes them.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-[0_24px_55px_-28px_rgba(34,47,87,.6)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Students together on campus" className="aspect-[4/3] w-full object-cover" />
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-600">What matters here</p><h2 className="mt-4 font-display text-4xl text-ink-700">An education for the whole child.</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {pillars.map(([title, text], index) => (
              <article key={title} className="rounded-xl border border-ink-100 bg-paper p-7 shadow-sm"><span className="font-mono text-sm font-bold text-gold-600">0{index + 1}</span><h3 className="mt-5 font-display text-2xl text-ink-700">{title}</h3><p className="mt-3 leading-7 text-slate/70">{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-900 py-20 text-paper sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2">
          <div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">Our vision</p><h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Young people ready to shape a better future.</h2><p className="mt-6 text-lg leading-8 text-paper/75">We aim to help students become knowledgeable, kind, adaptable, and confident people who can thrive in a changing world while remaining grounded in strong values.</p></div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-sm"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">Our mission</p><ul className="mt-6 space-y-5">{mission.map((item) => <li key={item} className="flex gap-3 leading-7 text-paper/85"><span className="mt-1 text-gold">●</span><span>{item}</span></li>)}</ul></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24"><div className="rounded-2xl bg-gold px-8 py-12 text-ink-900 sm:px-12"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">Our commitment</p><h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">Learning should strengthen both the individual and the community.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-ink-900/75">We foster respect, inclusion, and service—encouraging students to use their learning and talents in ways that make a meaningful difference.</p></div></section>
    </div>
  );
}
