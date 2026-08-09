import { AdmissionForm } from "./admission-form";
import type { Metadata } from "next";
import { getPageMetadata } from "@/lib/seo";
const admissionsMetadata: Metadata = { title: "School Admissions", description: "Apply online and find important information about school admissions and enrollment.", alternates: { canonical: "/admissions" } };
export async function generateMetadata() { return getPageMetadata("/admissions", admissionsMetadata); }
export default function AdmissionsPage(){return <div className="bg-paper py-16"><div className="mx-auto max-w-3xl px-6"><p className="font-mono text-xs uppercase tracking-[.2em] text-gold-600">Admissions</p><h1 className="mt-4 font-display text-4xl text-ink-700">Start your application</h1><p className="mt-4 text-slate/70">Verify your phone number first, then complete the application in two simple steps.</p><AdmissionForm/></div></div>}
