type Props = { title: string; content: string; imageUrl: string | null };

export function Design1ContentPage({ title, content, imageUrl }: Props) {
  return <div className="mx-auto max-w-3xl px-6 py-16"><h1 className="font-display text-3xl text-ink-700">{title}</h1>{imageUrl && <img src={imageUrl} alt={title} className="mt-8 max-h-96 w-full rounded-lg object-cover" />}{/* eslint-disable-next-line @next/next/no-img-element */}<div className="mt-8 whitespace-pre-line text-slate/80">{content || "Content coming soon."}</div></div>;
}

export default Design1ContentPage;
