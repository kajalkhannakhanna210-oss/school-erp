import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { AssignForm } from "./assign-form";

export default async function ClassTeachersPage({
  searchParams,
}: {
  searchParams: { session?: string };
}) {
  try {
    await requirePageAccess("class_teachers");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [
    { data: classes },
    { data: sections },
    { data: sessions },
    { data: staffRows, error: staffError },
    { data: enrollmentRows, error: enrollmentError },
    { data: assignments, error: assignmentsError },
  ] = await Promise.all([
    supabase.from("classes").select("*").order("sort_order"),
    supabase.from("sections").select("*").order("name"),
    supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
    supabase.from("staff").select("id, photo_path, profiles!staff_id_fkey(full_name)").eq("is_active", true),
    supabase.from("staff_enrollments").select("staff_id, session_id").eq("is_active", true),
    supabase
      .from("class_teachers")
      .select("*, classes(name), sections(name), academic_sessions(name), profiles!class_teachers_staff_id_fkey(full_name)"),
  ]);

  if (staffError) {
    console.error("Failed to load class-teacher staff options:", staffError);
  }
  if (enrollmentError) {
    console.error("Failed to load staff session enrollments:", enrollmentError);
  }
  if (assignmentsError) {
    console.error("Failed to load class-teacher assignments:", assignmentsError);
  }

  const sessionIdsByStaff = new Map<string, string[]>();
  for (const enrollment of enrollmentRows ?? []) {
    const sessionIds = sessionIdsByStaff.get(enrollment.staff_id) ?? [];
    sessionIds.push(enrollment.session_id);
    sessionIdsByStaff.set(enrollment.staff_id, sessionIds);
  }
  const staff = (staffRows ?? [])
    .map((s) => {
      const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
      return { id: s.id, name: profile?.full_name?.trim() ?? "", sessionIds: sessionIdsByStaff.get(s.id) ?? [] };
    })
    .filter((s) => s.name && s.sessionIds.length > 0);
  const selectedSessionId =
    searchParams.session ?? sessions?.find((session) => session.is_current)?.id ?? sessions?.[0]?.id ?? "";
  const assignmentsWithPhotos = await Promise.all((assignments ?? []).map(async (assignment) => {
    const staffMember = (staffRows ?? []).find((member) => member.id === assignment.staff_id);
    const { data: signed } = staffMember?.photo_path
      ? await supabase.storage.from("staff-photos").createSignedUrl(staffMember.photo_path, 60 * 10)
      : { data: null };
    return { ...assignment, photo_url: signed?.signedUrl ?? null };
  }));

  // Determine which sections have enrollments in the selected session and only pass those to the form
  const { data: sessionEnrollments } = await supabase
    .from("student_enrollments")
    .select("section_id")
    .eq("session_id", selectedSessionId);
  const sessionSectionIds = new Set((sessionEnrollments ?? []).map((r: any) => r.section_id).filter(Boolean));
  const sessionSections = (sections ?? []).filter((s: any) => sessionSectionIds.has(s.id));
  const totalSectionsCount = sessionSections.length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink-100 bg-white/90 px-4 py-4 shadow-sm sm:px-7 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl text-ink-700 sm:text-3xl">Class teachers</h1>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate/60 sm:text-sm">
              Assign one active, session-enrolled staff member to each class and section.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-ink-50 px-3 py-2 text-right sm:px-4 sm:py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate/50 sm:text-xs">Assignments</p>
            <p className="mt-0.5 text-xl font-bold text-ink-700 sm:mt-1 sm:text-2xl">{assignments?.length ?? 0}</p>
          </div>
        </div>
      </div>
      <AssignForm
        classes={classes ?? []}
        sections={sessionSections}
        sessions={sessions ?? []}
        initialSessionId={selectedSessionId}
        staff={staff}
        assignments={assignmentsWithPhotos}
        totalSections={totalSectionsCount}
      />
    </div>
  );
}
