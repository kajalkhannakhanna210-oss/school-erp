import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const page = Math.max(1, Number(params.get('page') ?? '1'));
    const pageSize = Math.max(1, Math.min(100, Number(params.get('pageSize') ?? '10')));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = await createClient();

    let query = supabase
      .from('students')
      .select('id, admission_number, roll_number, mobile_number, is_active, photo_path, profiles!students_id_fkey(full_name), classes(name), sections(name), academic_sessions(name)', { count: 'exact' })
      .order('admission_number');

    const selectedSessionId = params.get('session');
    let enrollmentStudentIds: string[] | null = null;
    if (selectedSessionId) {
      const { data: enrollments } = await supabase.from("student_enrollments").select("student_id").eq("session_id", selectedSessionId);
      enrollmentStudentIds = (enrollments ?? []).map((row) => row.student_id);
    }

    if (selectedSessionId) {
      if (enrollmentStudentIds?.length) {
        const quotedIds = enrollmentStudentIds.map((id) => `'${id}'`).join(",");
        query = query.or(`session_id.eq.${selectedSessionId},id.in.(${quotedIds})`);
      } else {
        query = query.eq("session_id", selectedSessionId);
      }
    }

    const classId = params.get('class');
    if (classId) query = query.eq('class_id', classId);

    const sectionId = params.get('section');
    if (sectionId) query = query.eq('section_id', sectionId);

    const admission = params.get('admission');
    if (admission === "assigned") query = query.not("admission_number", "is", null).neq("admission_number", "");
    if (admission === "unassigned") query = query.or("admission_number.is.null,admission_number.eq.");

    const tab = params.get('tab');
    if (tab === "new") {
      query = query.or("admission_number.is.null,admission_number.eq.");
    }
    if (tab === "admission-assigned") {
      query = query.not("admission_number", "is", null).neq("admission_number", "");
    }
    if (tab === "old") {
      if (selectedSessionId) {
        const { data: selectedSession } = await supabase.from("academic_sessions").select("start_date").eq("id", selectedSessionId).maybeSingle();
        if (selectedSession?.start_date) {
          const { data: earlierSessions } = await supabase.from("academic_sessions").select("id").lt("start_date", selectedSession.start_date);
          const earlierSessionIds = (earlierSessions ?? []).map((s) => s.id);
          if (earlierSessionIds.length) {
            const { data: oldEnrollments } = await supabase.from("student_enrollments").select("student_id").in("session_id", earlierSessionIds);
            const oldStudentIds = (oldEnrollments ?? []).map((e) => e.student_id);
            if (oldStudentIds.length) {
              query = query.in("id", oldStudentIds);
            } else {
              query = query.eq("id", "00000000-0000-0000-0000-000000000000");
            }
          } else {
            query = query.eq("id", "00000000-0000-0000-0000-000000000000");
          }
        }
      } else {
        const { data: allEnrollments } = await supabase.from("student_enrollments").select("student_id");
        const counts = new Map<string, number>();
        (allEnrollments ?? []).forEach((e) => counts.set(e.student_id, (counts.get(e.student_id) ?? 0) + 1));
        const repeatingIds = Array.from(counts.entries()).filter(([, cnt]) => cnt > 1).map(([id]) => id);
        if (repeatingIds.length) {
          query = query.in("id", repeatingIds);
        } else {
          query = query.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      }
    }
    if (tab === "archived") {
      query = query.eq("is_active", false);
    }
    if (tab === "left") {
      const { data: leaving } = selectedSessionId
        ? await supabase.from("student_leaving_requests").select("student_id").eq("status", "student_left").eq("session_id", selectedSessionId)
        : await supabase.from("student_leaving_requests").select("student_id").eq("status", "student_left");
      const leftIds = (leaving ?? []).map((r: any) => r.student_id);
      if (leftIds.length === 0) query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      else query = query.in("id", leftIds);
    }

    const q = params.get('q');
    if (q) {
      const qSafe = q.replace(/[,()]/g, '');
      query = query.or(`admission_number.ilike.%${qSafe}%,mobile_number.ilike.%${qSafe}%`);
    }

    const { data: students, count, error } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Generate signed URLs for photo_path where possible
    const rows = await Promise.all((students ?? []).map(async (s: any) => {
      let photo_url = null;
      if (s.photo_path) {
        try {
          const { data: signed, error: signErr } = await supabase.storage.from('student-photos').createSignedUrl(s.photo_path, 60 * 10);
          if (!signErr && signed?.signedUrl) photo_url = signed.signedUrl;
        } catch {
          photo_url = null;
        }
      }
      return { ...s, photo_url };
    }));

    return NextResponse.json({ rows, count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
