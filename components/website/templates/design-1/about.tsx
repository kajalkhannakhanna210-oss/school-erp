type Props = { imageUrl: string };

export function Design1AboutPage({ imageUrl }: Props) {
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
      <section className="relative isolate overflow-hidden bg-ink-900 py-20 text-paper sm:py-28"><div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(120deg, rgba(34, 47, 87, .97), rgba(34, 47, 87, .72)), url('/remote-images/photo-1509062522246-3755977927d7.jpg')" }} /><div className="mx-auto max-w-6xl px-6"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">Welcome to our school</p><h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight sm:text-6xl">A place to learn, belong, and grow.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-paper/80">We nurture thoughtful, capable learners through a balanced education shaped by high expectations, genuine care, and rich opportunities beyond the classroom.</p></div></section>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center sm:py-24"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-600">Our story</p><h2 className="mt-4 font-display text-4xl leading-tight text-ink-700 sm:text-5xl">Education with direction and heart.</h2><div className="mt-6 space-y-5 text-lg leading-8 text-slate/75"><p>Our school is a community where every child is known, encouraged, and challenged to do their best. We combine rigorous learning with creativity, sport, collaboration, and a strong sense of responsibility.</p><p>With trusted teachers and engaged families working together, students develop the knowledge, character, and confidence to contribute positively wherever life takes them.</p></div></div><div className="overflow-hidden rounded-2xl shadow-[0_24px_55px_-28px_rgba(34,47,87,.6)]"><img src={imageUrl} alt="Students together on campus" className="aspect-[4/3] w-full object-cover" /></div></section>
      <section className="bg-white py-20 sm:py-24"><div className="mx-auto max-w-6xl px-6"><div className="max-w-2xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-600">What matters here</p><h2 className="mt-4 font-display text-4xl text-ink-700">An education for the whole child.</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{pillars.map(([title, text], index) => <article key={title} className="rounded-xl border border-ink-100 bg-paper p-7 shadow-sm"><span className="font-mono text-sm font-bold text-gold-600">0{index + 1}</span><h3 className="mt-5 font-display text-2xl text-ink-700">{title}</h3><p className="mt-3 leading-7 text-slate/70">{text}</p></article>)}</div></div></section>
      <section className="bg-ink-900 py-20 text-paper sm:py-24"><div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">Our vision</p><h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Young people ready to shape a better future.</h2><p className="mt-6 text-lg leading-8 text-paper/75">We aim to help students become knowledgeable, kind, adaptable, and confident people who can thrive in a changing world while remaining grounded in strong values.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-sm"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">Our mission</p><ul className="mt-6 space-y-5">{mission.map((item) => <li key={item} className="flex gap-3 leading-7 text-paper/85"><span className="mt-1 text-gold">●</span><span>{item}</span></li>)}</ul></div></div></section>
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24"><div className="rounded-2xl bg-gold px-8 py-12 text-ink-900 sm:px-12"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">Our commitment</p><h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">Learning should strengthen both the individual and the community.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-ink-900/75">We foster respect, inclusion, and service—encouraging students to use their learning and talents in ways that make a meaningful difference.</p></div></section>
    </div>
  );
}

export default Design1AboutPage;
