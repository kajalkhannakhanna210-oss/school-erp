"use client";

import { useEffect, useState } from "react";
import { SafeImage } from "./safe-image";

export type StudentCard = {
  id: string;
  name: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  class: string | null;
  section: string | null;
};

function formatStudentName(name: string | null): string {
  if (!name?.trim()) return "Student";
  return name.trim().toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

// ---------------------------------------------------------------------------
// Birthday helpers
// ---------------------------------------------------------------------------

function isBirthdayToday(dob: string | null): boolean {
  if (!dob) return false;
  try {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const month = Number(today.find((part) => part.type === "month")?.value);
    const day = Number(today.find((part) => part.type === "day")?.value);
    const [, mm, dd] = dob.split("-").map(Number);
    return month === mm && day === dd;
  } catch {
    return false;
  }
}

function isBirthdaySoon(dob: string | null, withinDays = 7): boolean {
  if (!dob) return false;
  try {
    const todayParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const todayYear = Number(todayParts.find((part) => part.type === "year")?.value);
    const todayMonth = Number(todayParts.find((part) => part.type === "month")?.value);
    const todayDay = Number(todayParts.find((part) => part.type === "day")?.value);
    const [, mm, dd] = dob.split("-").map(Number);
    const today = Date.UTC(todayYear, todayMonth - 1, todayDay);
    const bdayThis = Date.UTC(todayYear, mm - 1, dd);
    const bdayNext = Date.UTC(todayYear + 1, mm - 1, dd);
    const diff = [bdayThis - today, bdayNext - today]
      .filter((value) => value > 0)
      .sort((left, right) => left - right)[0];
    return diff !== undefined && diff <= withinDays * 86_400_000;
  } catch {
    return false;
  }
}

function formatDobShort(dob: string | null): string | null {
  if (!dob) return null;
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(
      new Date(`${dob}T00:00:00`)
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Confetti + festive floating items layer (CSS-animated, aria-hidden)
// ---------------------------------------------------------------------------

const CONFETTI = [
  { shape: "●", color: "#FFD700" }, { shape: "■", color: "#ffffff" },
  { shape: "▲", color: "#FFEA00" }, { shape: "◆", color: "#D97EFF" },
  { shape: "★", color: "#60CFFF" }, { shape: "●", color: "#FF6B6B" },
  { shape: "■", color: "#FFD700" }, { shape: "▲", color: "#ffffff" },
  { shape: "◆", color: "#FFD700" }, { shape: "★", color: "#D97EFF" },
  { shape: "●", color: "#60CFFF" }, { shape: "■", color: "#FF6B6B" },
  { shape: "▲", color: "#FFEA00" }, { shape: "◆", color: "#ffffff" },
  { shape: "★", color: "#FFD700" }, { shape: "●", color: "#D97EFF" },
  { shape: "■", color: "#60CFFF" }, { shape: "▲", color: "#FF6B6B" },
  { shape: "◆", color: "#FFEA00" }, { shape: "★", color: "#ffffff" },
];



function ConfettiLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) translateX(0px)   rotate(0deg);   }
          25%  { transform: translateY(25vh) translateX(6px)  rotate(90deg);  }
          50%  { transform: translateY(50vh) translateX(-6px) rotate(180deg); }
          75%  { transform: translateY(75vh) translateX(6px)  rotate(270deg); }
          100% { transform: translateY(120vh) translateX(0px)  rotate(360deg); }
        }
      `}</style>

      {CONFETTI.map((p, i) => {
        const duration = 7 + (i % 6);
        const delay = -((i * 1.7) % duration); // negative delay = start mid-animation for instant fill
        const drift = (i % 2 === 0 ? 1 : -1) * (4 + (i % 5)) ;
        return (
          <span
            key={i}
            className="absolute"
            style={{
              left: `${(i * 4.9 + 2) % 100}%`,
              top: `-5%`,
              fontSize: 10 + (i % 5) * 3,
              color: p.color,
              opacity: 0.55 + (i % 4) * 0.08,
              animation: `confettiFall ${duration}s ${delay}s infinite linear`,
              willChange: "transform",
              userSelect: "none",
              // subtle horizontal drift per piece via CSS var trick
              "--drift": `${drift}px`,
            } as React.CSSProperties}
          >
            {p.shape}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual student card
// ---------------------------------------------------------------------------

function StudentCardItem({ student }: { student: StudentCard }) {
  const isToday = isBirthdayToday(student.date_of_birth);
  const isSoon = !isToday && isBirthdaySoon(student.date_of_birth, 7);
  const dobShort = formatDobShort(student.date_of_birth);
  const classSection = [student.class, student.section].filter(Boolean).join(" · ");
  const initial = student.name ? student.name.charAt(0).toUpperCase() : "?";

  return (
    <article
      className={[
        "students-card group relative flex-shrink-0 w-44 sm:w-56 flex flex-col items-center rounded-2xl p-5 sm:p-6 text-center transition-all duration-300",
        isToday ? "birthday-today-card" : isSoon ? "birthday-soon-card" : "normal-student-card",
      ].join(" ")}
    >
      {/* Birthday badge */}
      {(isToday || isSoon) && (
        <div
          className={["absolute -top-2 -right-2 z-20 flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-base shadow-lg select-none",
            isToday ? "birthday-badge-today" : "birthday-badge-soon",
          ].join(" ")}
          title={isToday ? "Birthday today! 🎉" : "Birthday this week"}
        >
          🎂
        </div>
      )}

      {/* Photo / avatar */}
      <div
        className={[
          "relative mb-4 sm:mb-5 h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-full",
          isToday ? "birthday-ring-today" : isSoon ? "birthday-ring-soon" : "normal-ring",
        ].join(" ")}
      >
        {student.photo_url ? (
          <SafeImage
            src={student.photo_url}
            alt={student.name ?? "Student photo"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-3xl sm:text-4xl font-bold"
            style={{ background: "rgba(247,194,0,0.40)", color: "#FFD700", textShadow: "0 0 12px rgba(255,215,0,0.8)" }}
          >
            {initial}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm sm:text-base font-semibold leading-snug text-white line-clamp-2">
        {formatStudentName(student.name)}
      </h3>

      {/* Class · Section */}
      {classSection && (
        <p className="mt-1.5 sm:mt-2 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wide"
           style={{ background: "rgba(247,194,0,0.15)", color: "#F7C200" }}>
          {classSection}
        </p>
      )}

      {/* DOB */}
      {dobShort && (
        <p className="mt-1.5 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-xs"
           style={{ color: isToday ? "#F7C200" : "rgba(255,255,255,0.45)" }}>
          {isToday && <span aria-hidden="true">🎉</span>}
          {dobShort}
        </p>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Infinite horizontal marquee (CSS-driven, two rows)
// ---------------------------------------------------------------------------

function MarqueeRow({ students, reverse = false }: { students: StudentCard[]; reverse?: boolean }) {
  if (students.length === 1) {
    return (
      <div className="flex justify-center py-3 pr-2 sm:pr-6">
        <StudentCardItem student={students[0]} />
      </div>
    );
  }

  const repeated = [...students, ...students, ...students];
  return (
    <div className="students-marquee-wrapper overflow-hidden">
      <div
        className={["students-marquee-track flex gap-3 sm:gap-5 py-3", reverse ? "marquee-reverse" : ""].join(" ")}
      >
        {repeated.map((s, i) => (
          <StudentCardItem key={`${s.id}-${i}`} student={s} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported section root
// ---------------------------------------------------------------------------

export function StudentsSection({ students }: { students: StudentCard[] }) {
  const [birthdayStudentsFromApi, setBirthdayStudentsFromApi] = useState<StudentCard[]>(students);

  useEffect(() => {
    fetch("/api/students/birthdays-public?days=7", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload?.students) setBirthdayStudentsFromApi(payload.students);
      })
      .catch(() => undefined);
  }, []);

  const todayBirthdays = birthdayStudentsFromApi.filter((s) => isBirthdayToday(s.date_of_birth));
  const soonBirthdays = birthdayStudentsFromApi.filter(
    (s) => !isBirthdayToday(s.date_of_birth) && isBirthdaySoon(s.date_of_birth, 7)
  );
  const birthdayStudents = [...todayBirthdays, ...soonBirthdays];

  return (
    <section className="students-section relative overflow-hidden pt-8 pb-8 sm:pt-10 sm:pb-10">
      {/* Background blobs */}
      <div aria-hidden="true" className="students-blob students-blob-1" />
      <div aria-hidden="true" className="students-blob students-blob-2" />
      <div aria-hidden="true" className="students-blob students-blob-3" />

      {/* Confetti */}
      <ConfettiLayer />

      {/* Header */}
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* 🎉 Birthday Celebration Banner — always visible */}
        <div className="mb-5 sm:mb-8 flex flex-col items-center justify-center gap-2 text-center px-2">
          <div
            className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-full px-4 sm:px-6 py-2 sm:py-3"
            style={{
              background: "linear-gradient(135deg, rgba(247,194,0,0.18) 0%, rgba(255,180,0,0.10) 100%)",
              border: "1.5px solid rgba(247,194,0,0.45)",
              boxShadow: "0 0 24px 4px rgba(247,194,0,0.18), 0 2px 12px rgba(0,0,0,0.25)",
            }}
          >
            <span className="text-xl sm:text-2xl animate-bounce" style={{ animationDuration: "1.4s" }}>🎉</span>
            <span className="text-xl sm:text-2xl">🎊</span>
            <span
              className="font-display text-base sm:text-xl font-bold tracking-wide md:text-2xl"
              style={{
                background: "linear-gradient(90deg, #F7C200 0%, #FFE066 50%, #F7C200 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Birthday Celebration
            </span>
            <span className="text-xl sm:text-2xl">🎊</span>
            <span className="text-xl sm:text-2xl animate-bounce" style={{ animationDuration: "1.4s", animationDelay: "0.2s" }}>🎂</span>
          </div>
          <p className="text-xs sm:text-sm md:text-base font-medium tracking-wide px-2" style={{ color: "rgba(255,224,102,0.90)" }}>
            🌟 Wishing our shining stars a day full of joy, laughter &amp; smiles! 🌟
          </p>
        </div>

      </div>



      {/* Single marquee row */}
      <div className="relative z-10 mt-6 sm:mt-10 pl-2 sm:pl-6">
        <MarqueeRow students={birthdayStudents} />
        {birthdayStudents.length === 0 && (
          <p className="mx-auto mt-5 max-w-6xl px-6 text-center text-sm font-medium text-white/65">
            Birthday wishes will appear here when a student celebrates this week.
          </p>
        )}
      </div>

      {/* Fade vignette at bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{ background: "linear-gradient(to top, #17213F 0%, transparent 100%)" }}
      />
    </section>
  );
}
