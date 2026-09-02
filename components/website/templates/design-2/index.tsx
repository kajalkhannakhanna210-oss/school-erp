import Link from "next/link";

type Props = { schoolName: string; title: string; description: string; logoUrl: string | null };

const FACILITIES = [
  ["01", "Digital classrooms", "Technology-enabled learning spaces for curious, confident learners.", "/remote-images/photo-1509062522246-3755977927d7.jpg"],
  ["02", "Library", "A bright, welcoming home for reading, research, and imagination.", "/remote-images/photo-1524995997946-a1c2e315a42f.jpg"],
  ["03", "Science laboratory", "Practical discovery that turns questions into understanding.", "/remote-images/photo-1532094349884-543bc11b234d.jpg"],
  ["04", "Sports & fitness", "Spaces and coaching that build teamwork, discipline, and joy.", "/remote-images/photo-1526232761682-d26e03ac148e.jpg"],
];

const NEWS = [
  ["04 Aug 2025", "Inauguration ceremony", "A memorable beginning to another year of learning and achievement."],
  ["11 Jul 2025", "Investiture ceremony", "Celebrating student leadership, service, and responsibility."],
  ["21 Jun 2025", "International Day of Yoga", "A day of balance, wellbeing, and mindful movement."],
];

const LEADERS = [
  ["01", "Society Chairman", "Leading with vision, values, and a commitment to excellence.", "/remote-images/photo-1508214751196-bcfd4ca60f91.jpg"],
  ["02", "Society Vice Chairman", "Supporting a culture of opportunity, service, and achievement.", "/remote-images/photo-1544005313-94ddf0286df2.jpg"],
  ["03", "School Chairperson", "Working with our community to help every learner thrive.", "/remote-images/photo-1544717305-2782549b5136.jpg"],
  ["04", "Principal's desk", "Inspiring hope, imagination, and joy in creative expression and knowledge.", "/remote-images/photo-1498243691581-b145c3f54a5a.jpg"],
];

export function Design2HomePage({ schoolName, title, description }: Props) {
  return (
    <div className="bg-[#f7f8fb] text-[#17284f]">
      <section className="relative overflow-hidden bg-[#17284f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,30,69,.96),rgba(13,30,69,.66),rgba(13,30,69,.2)),url('/remote-images/photo-1509062522246-3755977927d7.jpg')] bg-cover bg-center" />
        <div className="relative mx-auto flex min-h-[500px] max-w-7xl items-end px-5 pb-16 pt-24 sm:px-8 sm:pb-20 lg:min-h-[590px]">
          <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.3em] text-[#f3c85b]">Welcome to {schoolName}</p><h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">{title || "Shaping minds. Inspiring futures."}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">{description || "A leading school community where academic excellence, character, creativity, and service grow together."}</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/admissions" className="rounded-md bg-[#e7b83f] px-6 py-3.5 text-sm font-bold text-[#17284f] transition hover:bg-[#f3c85b]">Apply for admission <span className="ml-2">→</span></Link><Link href="/about" className="rounded-md border border-white/50 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/20">Discover our school</Link></div></div>
        </div>
        <div className="relative border-t border-white/15 bg-[#0e214b]/80"><div className="mx-auto grid max-w-7xl gap-3 px-5 py-4 text-sm sm:grid-cols-3 sm:px-8"><Link href="/admissions" className="font-semibold text-[#f3c85b] hover:text-white">Admissions open for 2026–27 <span className="ml-2">→</span></Link><Link href="/events" className="font-semibold text-white/85 hover:text-white">Latest circulars & notices <span className="ml-2">→</span></Link><Link href="/contact" className="font-semibold text-white/85 hover:text-white">Plan a visit to our campus <span className="ml-2">→</span></Link></div></div>
      </section>

      <section className="bg-white py-14 sm:py-20"><div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#bd8b08]">Experience and leadership in school education</p><h2 className="mt-5 max-w-2xl text-4xl font-bold leading-tight text-[#17284f] sm:text-5xl">A learning community built for the whole child.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{schoolName} brings together strong teaching, modern facilities, rich co-curricular experiences, and a caring culture so every student can find their strengths and prepare for the future.</p><Link href="/about" className="mt-7 inline-flex items-center rounded-md bg-[#17284f] px-5 py-3 text-sm font-bold text-white hover:bg-[#243b70]">Learn more <span className="ml-2">→</span></Link></div><div className="grid grid-cols-2 gap-3 sm:gap-4">{[["No. 1", "School for excellence"], ["200+", "Teachers & staff"], ["100+", "Achievements"], ["3800+", "Students"]].map(([value, label]) => <div key={label} className="border-t-4 border-[#e7b83f] bg-[#f7f8fb] p-5 sm:p-7"><p className="text-3xl font-bold text-[#17284f] sm:text-4xl">{value}</p><p className="mt-2 text-sm leading-5 text-slate-600">{label}</p></div>)}</div></div></section>

      <section className="bg-[#eef2f8] py-16 sm:py-20"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#bd8b08]">Explore programs and experiences</p><h2 className="mt-4 text-4xl font-bold text-[#17284f] sm:text-5xl">The best of school life</h2></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{FACILITIES.map(([number, name, text, image]) => <article key={name} className="group overflow-hidden bg-white shadow-sm"><div className="relative h-44 overflow-hidden"><img src={image} alt={name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-4 top-4 bg-[#e7b83f] px-3 py-1.5 text-xs font-bold text-[#17284f]">{number}</span></div><div className="p-5"><h3 className="text-xl font-bold text-[#17284f]">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p><Link href="/facilities" className="mt-4 inline-flex text-sm font-bold text-[#bd8b08]">Explore more <span className="ml-2">→</span></Link></div></article>)}</div></div></section>

      <section className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#bd8b08]">From our campus</p><h2 className="mt-4 text-4xl font-bold text-[#17284f] sm:text-5xl">News and events</h2></div><Link href="/events" className="rounded-md border border-[#17284f]/15 px-4 py-2.5 text-sm font-bold text-[#17284f] hover:border-[#bd8b08]">View all updates</Link></div><div className="mt-10 grid gap-5 md:grid-cols-3">{NEWS.map(([date, name, text]) => <article key={name} className="border border-[#17284f]/10 bg-[#f7f8fb] p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#bd8b08]">{date}</p><h3 className="mt-5 text-2xl font-bold text-[#17284f]">{name}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p><Link href="/events" className="mt-5 inline-flex text-sm font-bold text-[#17284f]">Explore more <span className="ml-2">→</span></Link></article>)}</div></div></section>

      <section className="bg-[#17284f] py-16 text-white sm:py-20"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f3c85b]">Our leaders</p><h2 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">Guided by purpose, experience, and care.</h2><p className="mt-5 max-w-2xl leading-8 text-white/70">The people who lead, support, and inspire our school community every day.</p></div><Link href="/principal-message" className="text-sm font-bold text-[#f3c85b] hover:text-white">Meet our leaders <span className="ml-2">→</span></Link></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{LEADERS.map(([number, role, text, image]) => <article key={role} className="overflow-hidden border border-white/15 bg-white/10"><div className="relative h-52 overflow-hidden bg-[#243b70]"><img src={image} alt={role} className="h-full w-full object-cover grayscale-[15%] transition duration-500 hover:scale-105" /><span className="absolute left-4 top-4 bg-[#e7b83f] px-3 py-1.5 text-xs font-bold text-[#17284f]">{number}</span></div><div className="p-5"><h3 className="text-xl font-bold">{role}</h3><p className="mt-3 text-sm leading-6 text-white/70">{text}</p><Link href="/principal-message" className="mt-4 inline-flex text-sm font-bold text-[#f3c85b]">Read message <span className="ml-2">→</span></Link></div></article>)}</div></div></section>

      <section className="relative overflow-hidden bg-[#e7b83f] px-5 py-14 sm:px-8 sm:py-20"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[42px] border-[#17284f]/10" /><div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-7 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#17284f]/65">Admissions open · 2026–27</p><h2 className="mt-3 text-3xl font-bold text-[#17284f] sm:text-4xl">Your child’s future starts here.</h2><p className="mt-3 max-w-2xl leading-7 text-[#17284f]/75">Join a school where every learner is encouraged to discover, achieve, and lead.</p></div><Link href="/admissions" className="w-fit rounded-md bg-[#17284f] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#243b70]">Register now <span className="ml-2">→</span></Link></div></section>
    </div>
  );
}

export default Design2HomePage;
