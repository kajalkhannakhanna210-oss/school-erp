type Props = { title: string; content: string; imageUrl: string | null };

export function Design2ContentPage({ title, content, imageUrl }: Props) {
  return (
    <div className="bg-[#f7f8fb] text-[#17284f]">
      <section className="bg-[#17284f] px-5 py-16 text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f3c85b]">{title}</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">{title}</h1>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        {imageUrl && <img src={imageUrl} alt={title} className="aspect-[4/3] w-full object-cover shadow-lg" />}
        <div className={imageUrl ? "" : "lg:col-span-2"}>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#bd8b08]">School information</p>
          <div className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">{content || "Content coming soon."}</div>
        </div>
      </section>
    </div>
  );
}

export default Design2ContentPage;
