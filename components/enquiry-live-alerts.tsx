"use client";

import { useEffect, useRef, useState } from "react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const ALERT_SOUND = "/sounds/new-enquiry-alert.mp3";

export function EnquiryLiveAlerts() {
  const [notice, setNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processingIds = useRef(new Set<string>());
  const handledIds = useRef(new Set<string>());

  useEffect(() => {
    const unlockAlerts = () => {
      if ("Notification" in window && window.Notification.permission === "default") {
        void window.Notification.requestPermission();
      }

      // A user gesture is required before most browsers allow a later
      // realtime callback to play audible audio.
      const audio = audioRef.current ?? new Audio(ALERT_SOUND);
      audioRef.current = audio;
      audio.volume = 0;
      void audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0.8;
      }).catch(() => undefined);
    };

    window.addEventListener("pointerdown", unlockAlerts, { once: true });

    const showAlert = async (id: string) => {
      if (!id || handledIds.current.has(id) || processingIds.current.has(id)) return;
      processingIds.current.add(id);

      try {
        // The id filter is an exact UUID lookup. Searching with q would not
        // match because q only searches the human-readable fields.
        const response = await fetch("/api/enquiries/list", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filters: { id } }),
        });
        if (!response.ok) return;
        const result = await response.json();
        const enquiry = result.rows?.[0];
        if (!enquiry) return;

        handledIds.current.add(id);
        const message = `New enquiry received: ${enquiry.student_name}`;
        setNotice(message);

        const audio = audioRef.current ?? new Audio(ALERT_SOUND);
        audioRef.current = audio;
        audio.volume = 0.8;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);

        if ("Notification" in window) {
          const showBrowserNotification = () => new window.Notification("New Enquiry", {
            body: message,
            tag: `enquiry-${id}`,
          });
          if (window.Notification.permission === "granted") {
            showBrowserNotification();
          } else if (window.Notification.permission === "default") {
            void window.Notification.requestPermission().then((permission) => {
              if (permission === "granted") showBrowserNotification();
            });
          }
        }

        window.setTimeout(() => setNotice(null), 6000);
      } catch {
        // The directory refresh remains the source of truth if the alert
        // lookup temporarily fails.
      } finally {
        processingIds.current.delete(id);
      }
    };

    const supabase = createSupabaseClient();
    const channel = supabase
      .channel("enquiries-live-broadcast")
      .on("broadcast", { event: "NEW_ENQUIRY" }, ({ payload }) => {
        window.dispatchEvent(new Event("enquiry-live-refresh"));
        void showAlert((payload as { id?: string } | null)?.id ?? "");
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "enquiries" },
        (payload) => {
          void showAlert((payload.new as { id?: string } | null)?.id ?? "");
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("pointerdown", unlockAlerts);
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg sm:inset-x-auto sm:right-5 sm:left-auto" role="alert">
      <span>{notice}</span>
      <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="text-lg leading-none text-emerald-700 hover:text-emerald-950">×</button>
    </div>
  );
}
