import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sign in | Registrar School ERP",
  description: "Secure login portal for Registrar School Management System.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-12 bg-white font-sans selection:bg-amber-400/30 selection:text-amber-200">
      {/* Left Column: Vibrant Student Showcase Panel (Desktop) */}
      <div className="hidden lg:col-span-7 lg:flex flex-col justify-between p-10 lg:p-12 relative overflow-hidden bg-slate-950 text-white">
        {/* Crisp & Vibrant Student Background Photo Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/students-hero.jpg"
            alt="School Students Learning Together"
            fill
            className="object-cover object-center opacity-65 scale-100 transition-transform duration-1000 hover:scale-105"
            priority
          />
          {/* Subtle Top & Bottom Gradient Overlay for High Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/80" />
        </div>

        {/* Soft Glowing Light Accents */}
        <div className="absolute top-12 left-12 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-12 right-12 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none z-0" />

        {/* Curved Organic Wave Divider SVG on the Right Edge */}
        <div className="absolute right-0 top-0 bottom-0 w-24 h-full pointer-events-none z-20 hidden lg:block text-white translate-x-px">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d="M 100,0 C 30,180 0,350 0,500 C 0,650 30,820 100,1000 L 100,1000 L 100,0 Z" />
          </svg>
        </div>

        {/* Top Header Tag */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full bg-slate-900/90 backdrop-blur-md px-4 py-1.5 border border-slate-700/80 shadow-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              Registrar Student & Staff Portal
            </span>
          </div>
        </div>

        {/* Middle: Clean Headline Content */}
        <div className="relative z-10 my-auto max-w-xl mx-auto w-full pr-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <span>Student & Faculty System</span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            The record of every student, kept in one ledger.
          </h1>
          <p className="text-base text-slate-300 leading-relaxed max-w-lg font-light">
            Admissions, attendance, fees, and results — unified in one cloud-native system of record for the whole school.
          </p>
        </div>

        {/* Bottom Tagline & Accreditation */}
        <div className="relative z-10 max-w-xl mx-auto w-full pt-4 pr-6">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-light">
            &ldquo;Every student&apos;s academic journey, attendance, and achievements stored securely in one unified school ledger.&rdquo;
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-amber-500" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Registrar Portal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Form Area & Mobile Top Image Header */}
      <div className="lg:col-span-5 flex h-[100dvh] min-h-[100dvh] flex-col justify-between overflow-hidden bg-[linear-gradient(180deg,#f3f6fb_0%,#ffffff_48%,#f6f8fb_100%)] p-4 sm:p-8 lg:h-auto lg:min-h-screen lg:max-h-[100dvh] lg:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_28rem),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] lg:p-12 z-10">
        {/* Mobile Top Hero Header with Organic Bottom Curve */}
        <div className="lg:hidden -mx-4 -mt-4 sm:-mx-8 sm:-mt-8 relative shrink-0 overflow-hidden rounded-b-[1.75rem] bg-slate-950 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
          <div className="relative h-[148px] w-full sm:h-[220px]">
            <Image
              src="/students-hero.jpg"
              alt="School Students"
              fill
              className="object-cover object-center opacity-85"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/25 to-slate-950/82" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/35 via-transparent to-slate-950/15" />

            {/* Header Branding overlaid on top mobile banner */}
            <div className="absolute left-5 right-5 top-4 z-10 flex items-center justify-between">
              <Link href="/login" className="inline-flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-slate-950/85 shadow-lg shadow-slate-950/30 backdrop-blur">
                  <span className="font-display text-base font-black text-amber-400">R</span>
                </div>
                <div>
                  <span className="font-display text-lg font-black tracking-tight text-white drop-shadow-sm">Registrar</span>
                  <span className="ml-2 inline-flex items-center rounded-full border border-amber-300/35 bg-amber-300/18 px-2 py-0.5 text-[9px] font-black text-amber-100 backdrop-blur">
                    ERP 2.0
                  </span>
                </div>
              </Link>
            </div>

            {/* Mobile Banner Bottom Text & Student Portrait */}
            <div className="absolute bottom-5 left-5 right-5 z-10 flex items-end justify-between gap-4">
              <div>
                <p className="text-[15px] font-black leading-tight text-white drop-shadow-sm">School Management System</p>
                <p className="mt-1 text-[11px] font-semibold text-amber-100">2,450+ Students & Staff</p>
              </div>
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/40 shadow-lg shadow-slate-950/30">
                <Image src="/student-avatar.jpg" alt="Student" fill className="object-cover" />
              </div>
            </div>

            {/* Organic Bottom Curve Wave Divider SVG */}
            <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-20 text-white">
              <svg
                className="h-full w-full"
                viewBox="0 0 1440 120"
                preserveAspectRatio="none"
                fill="currentColor"
              >
                <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,58.7C840,43,960,21,1080,21.3C1200,21,1320,43,1380,53.3L1440,64L1440,120L0,120Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Desktop Header Branding */}
        <div className="hidden lg:block">
          <Link href="/login" className="inline-flex items-center gap-3 group focus:outline-none">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-800 to-indigo-950 p-0.5 shadow-lg shadow-slate-900/15 group-hover:shadow-indigo-500/20 transition-all duration-300">
              <div className="h-full w-full rounded-[10px] bg-slate-900 flex items-center justify-center border border-amber-500/30">
                <span className="font-display font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
                  R
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-tight text-slate-950">Registrar</span>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  ERP 2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">School Management System</p>
            </div>
          </Link>
        </div>

        {/* Form Body */}
        <div className="relative z-20 -mt-2 flex w-full max-w-[350px] flex-1 flex-col justify-start overflow-hidden rounded-[1.5rem] border border-slate-200/70 bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur sm:-mt-8 sm:max-w-[440px] sm:p-6 lg:my-auto lg:mt-0 lg:grow lg:justify-center lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:py-6 lg:shadow-none mx-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="pt-2 sm:pt-4 border-t border-slate-200/70 flex flex-row items-center justify-between gap-2 text-[10px] sm:text-xs text-slate-400 shrink-0">
          <p>© {new Date().getFullYear()} Registrar ERP.</p>
          <div className="flex items-center gap-1.5 text-slate-400">
            <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-medium text-slate-500">256-bit Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}





