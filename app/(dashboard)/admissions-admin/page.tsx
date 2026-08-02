import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdmissionsAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") redirect("/dashboard");
  const [{ data: applications = [] }, { data: alumni = [] }, { data: fees = [] }] = await Promise.all([
    supabase.from("admission_applications").select("*").order("created_at", { ascending: false }),
    supabase.from("alumni_registrations").select("*").order("created_at", { ascending: false }),
    supabase.from("fee_structures").select("*").order("class_name"),
  ]);
  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Admissions &amp; alumni</h1>
      <p className="mt-1 text-sm text-slate/60">Review public registrations and applications.</p>
      <section className="mt-8"><h2 className="font-display text-xl text-ink-700">Admission applications</h2><div className="mt-3 overflow-auto rounded-xl border border-ink-100 bg-white"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-3">Student</th><th>Class</th><th>Parent</th><th>Phone</th><th>Status</th></tr></thead><tbody>{(applications ?? []).map((a) => <tr key={a.id} className="border-t"><td className="p-3">{a.student_name}</td><td>{a.applying_for}</td><td>{a.parent_name}<br /><span className="text-slate/60">{a.parent_email}</span></td><td>{a.phone}</td><td>{a.status}</td></tr>)}</tbody></table></div></section>
      <section className="mt-8"><h2 className="font-display text-xl text-ink-700">Alumni registrations</h2><ul className="mt-3 space-y-2">{(alumni ?? []).map((a) => <li key={a.id} className="rounded-lg border border-ink-100 bg-white p-4"><b>{a.full_name}</b> — {a.graduation_year} · {a.email}</li>)}</ul></section>
      <section className="mt-8"><h2 className="font-display text-xl text-ink-700">Fee structure</h2><p className="mt-2 text-sm text-slate/60">{(fees ?? []).length} fee records published.</p></section>
    </div>
  );
}
