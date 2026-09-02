import Link from "next/link";

type Props = { schoolName: string; imageUrl: string };

const VALUES = [
  ["Curiosity", "We make space for questions, experimentation, and the joy of discovering something new."],
  ["Belonging", "Every learner is known, respected, and encouraged to bring their full self to school."],
  ["Possibility", "Students build the knowledge, confidence, and character to shape their own next chapter."],
];

export function Design2AboutPage({ schoolName, imageUrl }: Props) {
  return (
    <div className="bg-[#f5f8f6] text-[#173338]">
      <section className="bg-[#123b42] px-5 py-20 text-white sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e7b75f]">About {schoolName}</p><h1 className="mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-7xl">A school built around the person each student can become.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">We bring high expectations and genuine care together, creating a place where learning feels meaningful and every student has room to grow.</p></div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div className="overflow-hidden rounded-[2rem] bg-[#123b42] p-3 shadow-[0_28px_65px_-30px_rgba(18,59,66,.55)]"><img src={imageUrl} alt={`${schoolName} campus`} className="aspect-[4/3] w-full rounded-[1.5rem] object-cover" /></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8a651e]">Our story</p><h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-[#123b42] sm:text-5xl">Education with direction, warmth, and possibility.</h2><p className="mt-6 text-lg leading-8 text-[#52676b]">{schoolName} is a community where students are encouraged to think deeply, work generously with others, and discover what they are capable of. Our classrooms are only one part of the experience: sport, the arts, service, and friendship all help young people grow.</p><p className="mt-5 text-lg leading-8 text-[#52676b]">Teachers and families work together to give every learner the support and challenge they need to take their next step with confidence.</p><Link href="/contact" className="mt-8 inline-flex rounded-full bg-[#123b42] px-6 py-3.5 text-sm font-bold text-white transition hover:opacity-90">Come and meet us <span className="ml-2">→</span></Link></div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 sm:py-24"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8a651e]">What guides us</p><h2 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight text-[#123b42] sm:text-5xl">The values behind every day.</h2><div className="mt-12 grid gap-5 md:grid-cols-3">{VALUES.map(([title, text], index) => <article key={title} className="rounded-2xl border border-[#123b42]/10 bg-[#f5f8f6] p-7"><span className="text-sm font-bold text-[#8a651e]">0{index + 1}</span><h3 className="mt-12 text-2xl font-bold text-[#123b42]">{title}</h3><p className="mt-4 leading-7 text-[#52676b]">{text}</p></article>)}</div></div></section>

      <section className="bg-[#e7b75f] px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#123b42]/65">Your next chapter</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-[#123b42] sm:text-4xl">See how your family could belong here.</h2></div><Link href="/admissions" className="w-fit rounded-full bg-[#123b42] px-6 py-3.5 text-sm font-bold text-white transition hover:opacity-90">Explore admissions <span className="ml-2">→</span></Link></div></section>
    </div>
  );
}

export default Design2AboutPage;
