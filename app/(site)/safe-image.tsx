"use client";

import { useState } from "react";

export function SafeImage({ src, fallback = "/about-school.jpg", alt, className, loading, decoding }: { src: string; fallback?: string; alt: string; className?: string; loading?: "eager" | "lazy"; decoding?: "async" | "sync" | "auto" }) {
  const [imageSrc, setImageSrc] = useState(src);
  return <img src={imageSrc} alt={alt} loading={loading} decoding={decoding} onError={() => setImageSrc(fallback)} className={className} />;
}
