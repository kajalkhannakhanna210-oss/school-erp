import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: page }, { data: notices }, { data: galleryImages }, { data: events }] = await Promise.all([
    supabase.from("site_pages").select("title, content, image_path").eq("slug", "home").single(),
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

  const slides: HeroSlide[] = [
    {
      eyebrow: "Learning, with intention",
      title,
      description: intro,
      imageUrl,
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
      ? supabase.storage.from("site-media").getPublicUrl(event.image_path).data.publicUrl
      : PLACEHOLDER_IMAGES[index],
  }));
  const eventCards = latestEvents.length
    ? latestEvents
    : [
        { id: "open-house", title: "School Open House", description: "Meet our teachers and explore learning spaces across campus.", event_date: "2026-08-12", imageUrl: PLACEHOLDER_IMAGES[0] },
        { id: "sports-day", title: "Annual Sports Day", description: "A joyful day of teamwork, perseverance, and school spirit.", event_date: "2026-08-21", imageUrl: PLACEHOLDER_IMAGES[1] },
        { id: "arts-showcase", title: "Young Makers Showcase", description: "Celebrating student ideas, art, and imagination.", event_date: "2026-09-05", imageUrl: PLACEHOLDER_IMAGES[2] },
      ];
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

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold-600">Coming together</p>
              <h2 className="mt-4 font-display text-4xl text-ink-700">Latest events</h2>
            </div>
            <Link href="/events" className="text-sm font-semibold text-ink-700 hover:text-gold-600">Explore all events <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {eventCards.map((event) => (
              <article key={event.id} className="group overflow-hidden rounded-lg border border-ink-100 bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.imageUrl} alt="" className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="p-6">
                  <p className="font-mono text-xs uppercase tracking-wide text-gold-600">{formatDate(event.event_date)}</p>
                  <h3 className="mt-3 font-display text-2xl text-ink-700">{event.title}</h3>
                  <p className="mt-3 line-clamp-2 leading-6 text-slate/70">{event.description || "More details about this school event will be shared soon."}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold-600">A glimpse of campus</p>
              <h2 className="mt-4 font-display text-4xl text-ink-700">Gallery highlights</h2>
            </div>
            <Link href="/gallery" className="text-sm font-semibold text-ink-700 hover:text-gold-600">Visit the gallery <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {galleryCards.slice(0, 4).map((image, index) => (
              <figure key={image.id} className={`group relative overflow-hidden rounded-lg bg-ink-700 ${index === 0 ? "col-span-2 row-span-2" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.imageUrl} alt={image.caption} className={`w-full object-cover transition duration-500 group-hover:scale-105 ${index === 0 ? "h-[360px]" : "h-[172px]"}`} />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent px-4 pb-4 pt-10 text-sm font-medium text-paper">
                  {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-ink-100 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold-600">From the school</p>
              <h2 className="mt-4 font-display text-4xl text-ink-700">Latest notices</h2>
            </div>
            <Link href="/notices" className="text-sm font-semibold text-ink-700 hover:text-gold-600">
              View all notices <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-10 divide-y divide-ink-100 border-y border-ink-100">
            {noticeItems.map((notice) => (
              <Link key={notice.id} href="/notices" className="group grid gap-2 py-5 sm:grid-cols-[140px_1fr_auto] sm:items-center">
                <time className="font-mono text-xs uppercase tracking-wide text-slate/55">{formatDate(notice.publish_date)}</time>
                <span className="font-display text-xl text-ink-700 group-hover:text-gold-600">{notice.title}</span>
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
