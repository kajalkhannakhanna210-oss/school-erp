"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[activeIndex];

  return (
    <section className="relative isolate min-h-[590px] overflow-hidden bg-ink-700 text-paper md:min-h-[660px]">
      <div className="hero-image-in absolute inset-0 -z-20" key={`${activeSlide.title}-${activeIndex}`}>
        {activeSlide.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeSlide.imageUrl} alt="" fetchPriority="high" decoding="async" className="h-full w-full object-cover brightness-110" />
        )}
        {activeSlide.videoUrl && (
          <video
            className="absolute inset-0 h-full w-full object-cover brightness-110"
            autoPlay
            muted
            loop
            playsInline
            poster={activeSlide.imageUrl ?? undefined}
            aria-hidden="true"
          >
            <source src={activeSlide.videoUrl} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_15%,rgba(247,194,0,0.48),transparent_30%),linear-gradient(120deg,rgba(34,47,87,0.76),rgba(34,47,87,0.34))]" />
      </div>

      <div className="mx-auto grid min-h-[590px] max-w-6xl items-end gap-12 px-6 py-16 md:min-h-[660px] md:py-20 lg:grid-cols-[1.2fr_.8fr]">
        <div key={`${activeSlide.title}-content-${activeIndex}`} className="hero-content-in max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">{activeSlide.eyebrow}</p>
          <h1 className="mt-6 font-display text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">{activeSlide.title}</h1>
          <p className="mt-7 max-w-xl whitespace-pre-line text-base leading-7 text-paper/80 sm:text-lg">{activeSlide.description}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/admissions" className="rounded-md bg-gold px-5 py-3 text-sm font-semibold text-ink-700 transition hover:bg-gold-100">
              Begin your journey
            </Link>
            <Link href="/about" className="rounded-md border border-paper/30 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-white/10">
              Discover our school
            </Link>
          </div>
        </div>
        <div className="hero-float hidden justify-self-end lg:block">
          <div className="mb-8 ml-auto h-14 w-14 rounded-full border border-gold/70 bg-gold/10" aria-hidden="true" />
          <div className="max-w-[250px] border-l border-gold pl-5 text-sm leading-6 text-paper/80">
            A school is more than a timetable. It is the daily practice of becoming.
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 md:left-auto md:right-6 md:translate-x-0">
          {slides.map((slide, index) => (
            <button
              key={`${slide.title}-control-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show slide ${index + 1}: ${slide.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={`h-2 rounded-full transition-all ${index === activeIndex ? "w-8 bg-gold" : "w-2 bg-paper/50 hover:bg-paper"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
