"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  onTokenChange: (token: string) => void;
};

export function TurnstileWidget({ onTokenChange }: TurnstileWidgetProps) {
  const reactId = useId();
  const elementId = `turnstile-${reactId.replace(/:/g, "")}`;
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!ready || !siteKey || widgetId.current || !window.turnstile) return;

    widgetId.current = window.turnstile.render(`#${elementId}`, {
      sitekey: siteKey,
      callback: onTokenChange,
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => onTokenChange(""),
    });
  }, [elementId, onTokenChange, ready, siteKey]);

  if (!siteKey) {
    return <p className="text-sm text-danger">Security check is not configured.</p>;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div id={elementId} className="min-h-[65px]" />
    </>
  );
}
