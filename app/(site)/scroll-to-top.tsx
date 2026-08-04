"use client";

import { useEffect, useState } from "react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 360);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return <button type="button" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-5 right-5 z-50 grid h-11 w-11 place-items-center rounded-full bg-ink-700 text-xl font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:bg-gold-600 focus:outline-none focus:ring-4 focus:ring-gold-100 sm:bottom-7 sm:right-7">↑</button>;
}
