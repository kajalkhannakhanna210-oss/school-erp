import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { HeroSlider, type HeroSlide } from "./hero-slider";

const HIGHLIGHTS = [
  { number: "01", title: "A considered education", text: "Learning that balances curiosity, confidence, and strong foundations." },
  { number: "02", title: "A caring community", text: "Teachers and families working together so every child feels known." },
  { number: "03", title: "A future in view", text: "Experiences that prepare students to participate thoughtfully in the world." },
];

const SCHOOL_STATS = [
  { value: "40+", label: "Years of experience" },
  { value: "2,500+", label: "Students" },
  { value: "150+", label: "Faculty members" },
  { value: "98%", label: "Board pass rate" },
];

const FACILITIES = [
  { icon: "⌘", title: "Smart classrooms", text: "Well-equipped spaces that make every lesson engaging and interactive.", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80" },
  { icon: "⌁", title: "Science laboratories", text: "Safe, practical labs for discovery, observation, and experimentation.", image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80" },
  { icon: "◈", title: "Library & reading", text: "A welcoming collection of books and digital resources for every learner.", image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80" },
  { icon: "◎", title: "Sports & fitness", text: "Open play spaces and structured activities that build confidence and teamwork.", image: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=900&q=80" },
  { icon: "✦", title: "Creative arts", text: "Dedicated opportunities for music, art, performance, and self-expression.", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80" },
  { icon: "↗", title: "Safe campus", text: "A caring, secure environment with attentive staff and clear student support.", image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80" },
];

const ACHIEVERS = [
  { name: "Aarav Sharma", achievement: "National Science Quiz — Gold Medal", activity: "Science & innovation", image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=700&q=80" },
  { name: "Ananya Verma", achievement: "State Art Showcase — First Place", activity: "Visual arts", image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=700&q=80" },
  { name: "Kabir Singh", achievement: "Inter-school Athletics — Champion", activity: "Sports & leadership", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=80" },
];

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80",
];

const HERO_VIDEO_URL = "https://videos.pexels.com/video-files/3209298/3209298-hd_1920_1080_25fps.mp4";
const DEFAULT_ABOUT_TITLE = "A community where every child can thrive.";
const DEFAULT_ABOUT_CONTENT =
  "We provide a balanced education that helps students grow academically, creatively, socially, and emotionally. Our teachers create a supportive space where children are encouraged to ask questions, build confidence, and discover their strengths.";

// Homepage highlights are driven by the CMS; always show the latest gallery,
// event, and notice records.
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function previewText(content: string, maximumLength = 260) {
  const text = content.replace(/\s+/g, " ").trim();
  return text.length > maximumLength ? `${text.slice(0, maximumLength).trimEnd()}…` : text;
}

export default async function HomePage() {
  const supabase = createPublicClient();
  const [{ data: page }, { data: aboutPage }, { data: notices }, { data: galleryImages }, { data: events }] = await Promise.all([
    supabase.from("site_pages").select("title, content, image_path").eq("slug", "home").single(),
    supabase.from("site_pages").select("title, content, image_path").eq("slug", "about").single(),
    supabase
      .from("notices")
      .select("id, title, publish_date")
      .lte("publish_date", new Date().toISOString().slice(0, 10))
      .order("publish_date", { ascending: false })
      .limit(3),
    supabase.from("gallery_images").select("id, image_path, caption").order("created_at", { ascending: false }).limit(4),
    supabase
      .from("events")
      .select("id, title, description, event_date, image_path")
      .order("event_date", { ascending: false })
      .limit(3),
  ]);

  let imageUrl: string | null = null;
  if (page?.image_path) {
    const { data } = supabase.storage.from("site-media").getPublicUrl(page.image_path);
    imageUrl = data.publicUrl;
  }

  const title = page?.title ?? "A place to grow with purpose.";
  const intro = page?.content || "An education shaped by curiosity, character, and a lasting love of learning.";
  const aboutTitle = aboutPage?.title || DEFAULT_ABOUT_TITLE;
  const aboutContent = aboutPage?.content || DEFAULT_ABOUT_CONTENT;
  const aboutImageUrl = aboutPage?.image_path
    ? supabase.storage.from("site-media").getPublicUrl(aboutPage.image_path).data.publicUrl
    : null;

  const slides: HeroSlide[] = [
    {
      eyebrow: "Learning, with intention",
      title,
      description: intro,
      imageUrl,
      videoUrl: HERO_VIDEO_URL,
    },
    ...(galleryImages ?? []).map((image, index) => ({
      eyebrow: index === 0 ? "Life at school" : "Every day, something new",
      title: image.caption || (index === 0 ? "Learning beyond the classroom." : "A community in motion."),
      description:
        index === 0
          ? "Discover the moments, friendships, and experiences that make school memorable."
          : "From first questions to lasting confidence, every day brings an opportunity to grow.",
      imageUrl: image.image_path.startsWith("http")
        ? image.image_path
        : supabase.storage.from("site-media").getPublicUrl(image.image_path).data.publicUrl,
    })),
  ];

  if (slides.length === 1) {
    slides.push(
      {
        eyebrow: "Life at school",
        title: "Learning beyond the classroom.",
        description: "Discover the moments, friendships, and experiences that make school memorable.",
      },
      {
        eyebrow: "A future in view",
        title: "Prepared for what comes next.",
        description: "We nurture the confidence, curiosity, and character students need to take their next steps.",
      }
    );
  }

  const latestEvents = (events ?? []).map((event, index) => ({
    ...event,
    imageUrl: event.image_path
      ? event.image_path.startsWith("http")
        ? event.image_path
        : supabase.storage.from("site-media").getPublicUrl(event.image_path).data.publicUrl
      : PLACEHOLDER_IMAGES[index],
  }));
  const galleryCards = (galleryImages ?? []).map((image) => ({
    id: image.id,
    caption: image.caption || "A moment from school life",
    imageUrl: image.image_path.startsWith("http")
      ? image.image_path
      : supabase.storage.from("site-media").getPublicUrl(image.image_path).data.publicUrl,
  }));
  if (galleryCards.length === 0) {
    galleryCards.push(
      ...PLACEHOLDER_IMAGES.map((imageUrl, index) => ({
        id: `placeholder-${index}`,
        caption: ["Learning together", "Curiosity in action", "Creative expression", "School community"][index],
        imageUrl,
      }))
    );
  }
  const noticeItems =
    (notices ?? []).length > 0
      ? notices!
      : [
          { id: "admissions-notice", title: "Admissions are now open for the 2026–27 academic session", publish_date: "2026-07-24" },
          { id: "parent-meeting", title: "Parent–teacher meeting scheduled for all senior classes", publish_date: "2026-07-20" },
          { id: "independence-day", title: "Independence Day celebration: student participation registrations open", publish_date: "2026-07-16" },
        ];

  return (
    <div className="overflow-hidden">
      <HeroSlider slides={slides} />

      <section className="bg-ink-900 text-paper">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
          <div className="grid divide-y divide-white/15 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {SCHOOL_STATS.map((stat) => (
              <div key={stat.label} className="py-5 text-center first:pt-0 last:pb-0 sm:px-7 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                <div className="font-display text-4xl text-gold sm:text-5xl">{stat.value}</div>
                <p className="mt-2 text-sm font-medium text-paper/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20 sm:py-24">
        <div aria-hidden="true" className="absolute left-0 top-0 h-2 w-full bg-gold" />
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative overflow-hidden rounded-2xl bg-ink-700 shadow-[0_22px_50px_-26px_rgba(34,47,87,0.55)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={aboutImageUrl || imageUrl || PLACEHOLDER_IMAGES[0]} alt={aboutTitle} className="aspect-[4/3] h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent p-6 pt-20">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold">Learning with purpose</p>
            </div>
          </div>
          <div>
            <p className="inline-flex rounded-full bg-gold px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink-900">About our school</p>
            <div className="mt-5 border-l-4 border-gold pl-5">
              <h2 className="font-display text-4xl font-bold leading-tight text-ink-700 sm:text-5xl">{aboutTitle}</h2>
            </div>
            <p className="mt-6 text-lg leading-8 text-slate/75">{previewText(aboutContent)}</p>
            <div className="mt-8 grid grid-cols-2 gap-5 border-t border-ink-100 pt-7 text-sm">
              <div><p className="font-semibold text-ink-700">Student-centred learning</p><p className="mt-1 leading-6 text-slate/65">Every learner is known, supported, and challenged.</p></div>
              <div><p className="font-semibold text-ink-700">Values for life</p><p className="mt-1 leading-6 text-slate/65">Respect, responsibility, and curiosity guide our community.</p></div>
            </div>
            <Link href="/about" className="mt-8 inline-flex rounded-lg bg-ink-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-600">Discover our story <span className="ml-2" aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink-900 py-20 text-white sm:py-24">
        <div aria-hidden="true" className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-48 -left-24 h-96 w-96 rounded-full bg-ink-600 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-3xl border-l-4 border-gold pl-6">
            <p className="inline-flex rounded-full bg-gold px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink-900">School facilities</p>
            <h2 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Spaces designed for learning, discovery, and growth.</h2>
            <p className="mt-5 text-lg leading-8 text-white/70">Our campus gives students the spaces, tools, and support they need to explore their interests and do their best work.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FACILITIES.map((facility) => (
              <article key={facility.title} className="group overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm transition hover:-translate-y-1 hover:border-gold/70 hover:bg-white/15">
                <div className="relative h-40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={facility.image} alt={facility.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 to-transparent" />
                  <span className="absolute bottom-4 left-4 grid h-10 w-10 place-items-center rounded-lg bg-gold text-lg font-bold text-ink-900 shadow">{facility.icon}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold">{facility.title}</h3>
                  <p className="mt-2 leading-7 text-white/70">{facility.text}</p>
                </div>
              </article>
            ))}
          </div>
          <Link href="/facilities" className="mt-10 inline-flex rounded-lg border border-gold bg-gold px-5 py-3 text-sm font-semibold text-ink-900 transition hover:bg-gold-100">Explore our campus <span className="ml-2" aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="bg-[#f7f8fc] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold-600">Celebrating excellence</p>
              <h2 className="mt-4 font-display text-4xl font-bold text-ink-700 sm:text-5xl">Recent achievers</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate/70">We are proud of students who bring curiosity, commitment, and character to every challenge.</p>
            </div>
            <Link href="/gallery" className="rounded-lg border border-ink-100 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition hover:border-gold hover:text-gold-600">Student life <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {ACHIEVERS.map((student) => (
              <article key={student.name} className="group overflow-hidden rounded-2xl bg-white shadow-[0_14px_35px_-22px_rgba(34,47,87,0.35)] transition hover:-translate-y-1 hover:shadow-[0_20px_42px_-22px_rgba(34,47,87,0.42)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-ink-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={student.image} alt={`${student.name} taking part in ${student.activity}`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-ink-900">{student.activity}</span>
                </div>
                <div className="p-6"><h3 className="text-xl font-bold text-ink-700">{student.name}</h3><p className="mt-2 leading-7 text-slate/70">{student.achievement}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gold py-16 sm:py-20">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[48px] border-ink-700/15" />
        <div className="relative mx-auto flex max-w-6xl flex-col justify-between gap-8 px-6 md:flex-row md:items-center">
          <div className="max-w-3xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-700">Admissions open · 2026–27</p><h2 className="mt-4 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">Give your child a confident start.</h2><p className="mt-4 text-lg leading-8 text-ink-900/75">Applications are now open. Speak with our admissions team and discover a school experience built around every child&apos;s potential.</p></div>
          <Link href="/contact" className="w-fit rounded-lg bg-ink-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-ink-600">Enquire for admission <span className="ml-2" aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="bg-paper py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-[.75fr_1.25fr] md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold-600">Our promise</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-ink-700">Growing capable, kind people.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-slate/75">
              We make room for questions, make time for practice, and build the habits that let each learner thrive.
            </p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-ink-100 bg-ink-100 md:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <div key={item.number} className="bg-white p-7 sm:p-8">
                <span className="font-mono text-xs text-gold-600">{item.number}</span>
                <h3 className="mt-8 font-display text-2xl text-ink-700">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate/70">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden bg-cover bg-center py-20 sm:py-24"
        style={{
          backgroundImage: `linear-gradient(120deg, rgb(34 47 87 / 0.96), rgb(34 47 87 / 0.86)), url(${latestEvents[0]?.imageUrl || PLACEHOLDER_IMAGES[2]})`,
        }}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">Campus calendar</p>
              <h2 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">Latest events</h2>
              <p className="mt-4 max-w-xl leading-7 text-white/70">Meaningful moments, shared experiences, and opportunities to learn beyond the classroom.</p>
            </div>
            <Link href="/events" className="rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition hover:border-gold hover:text-gold-600">Explore all events <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {latestEvents.map((event) => (
              <article key={event.id} className="group overflow-hidden rounded-xl border border-ink-100 bg-white shadow-[0_12px_35px_-24px_rgba(30,42,74,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-25px_rgba(30,42,74,0.5)]">
                <div className="relative aspect-[16/10] overflow-hidden bg-ink-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />
                  <p className="absolute bottom-4 left-4 rounded-sm bg-white/95 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wide text-ink-700 shadow-sm">{formatDate(event.event_date)}</p>
                </div>
                <div className="p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold-600">School community</p>
                  <h3 className="mt-3 font-display text-2xl leading-tight text-ink-700">{event.title}</h3>
                  <p className="mt-3 line-clamp-2 leading-6 text-slate/70">{event.description || "More details about this school event will be shared soon."}</p>
                  <Link href="/events" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-700 transition group-hover:text-gold-600">View event <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ))}
          </div>
          {latestEvents.length === 0 && (
            <p className="mt-10 text-sm text-slate/50">No events have been published yet.</p>
          )}
        </div>
      </section>

      <section className="bg-paper py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="inline-flex rounded-full bg-gold px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink-900 shadow-sm">
                From our gallery
              </p>
              <h2 className="mt-4 font-display text-4xl text-ink-700">A glimpse of campus</h2>
            </div>
            <Link href="/gallery" className="text-sm font-semibold text-ink-700 hover:text-gold-600">Visit the gallery <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {galleryCards.slice(0, 4).map((image, index) => (
              <figure key={image.id} className={`group relative overflow-hidden rounded-lg bg-ink-700 ${index === 0 ? "col-span-2 row-span-2" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.imageUrl} alt={image.caption} loading="lazy" decoding="async" className={`w-full object-cover transition duration-500 group-hover:scale-105 ${index === 0 ? "h-[360px]" : "h-[172px]"}`} />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent px-4 pb-4 pt-10 text-sm font-medium text-paper">
                  {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-y border-ink-100 bg-cover bg-center py-20 sm:py-24"
        style={{
          backgroundImage: `linear-gradient(120deg, rgb(34 47 87 / 0.96), rgb(34 47 87 / 0.88)), url(${latestEvents[1]?.imageUrl || PLACEHOLDER_IMAGES[3]})`,
        }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">From the school</p>
              <h2 className="mt-4 font-display text-4xl font-bold text-white">Latest notices</h2>
            </div>
            <Link href="/notices" className="text-sm font-semibold text-white hover:text-gold">
              View all notices <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {noticeItems.map((notice) => (
              <Link key={notice.id} href="/notices" className="group rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-gold/70 hover:bg-white/15">
                <time className="inline-flex rounded-full bg-gold px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-ink-900">{formatDate(notice.publish_date)}</time>
                <span className="mt-6 block font-display text-xl font-bold leading-snug text-white group-hover:text-gold">{notice.title}</span>
                <span className="mt-5 block text-sm font-medium text-white/60">Read notice →</span>
                <span className="hidden text-gold-600 sm:block" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gold-100 py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 px-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold-600">Admissions</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink-700">Let&apos;s begin the conversation.</h2>
            <p className="mt-4 leading-7 text-slate/75">We would be delighted to help you explore whether our school is the right next step for your family.</p>
          </div>
          <Link href="/contact" className="w-fit rounded-md bg-ink-700 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-ink-600">
            Contact the admissions team
          </Link>
        </div>
      </section>
    </div>
  );
}
