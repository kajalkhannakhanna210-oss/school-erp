import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/students/birthdays
//
// Returns students whose birthday falls today or within the next N days.
//
// Query params:
//   days    – look-ahead window (default: 7, max: 365)
//   class   – filter by class_id
//   section – filter by section_id
//   session – filter by academic session_id (via student_enrollments)
//
// Response: { students: BirthdayStudent[], count: number }
// ---------------------------------------------------------------------------

/** Returns days from today (IST midnight) until next birthday. 0 = today. */
function daysUntilBirthday(dob: string | null): number | null {
  if (!dob) return null;
  try {
    const [, mm, dd] = dob.split("-").map(Number);
    if (!mm || !dd) return null;

    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    nowIST.setHours(0, 0, 0, 0);

    const yr = nowIST.getFullYear();
    let bday = new Date(yr, mm - 1, dd);
    bday.setHours(0, 0, 0, 0);

    let diff = Math.round((bday.getTime() - nowIST.getTime()) / 86_400_000);
    if (diff < 0) {
      bday = new Date(yr + 1, mm - 1, dd);
      bday.setHours(0, 0, 0, 0);
      diff = Math.round((bday.getTime() - nowIST.getTime()) / 86_400_000);
    }
    return diff;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // Auth guard – only authenticated users can call this endpoint
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const params = url.searchParams;

    const days = Math.min(365, Math.max(0, Number(params.get("days") ?? "7")));
    const classId = params.get("class");
    const sectionId = params.get("section");
    const sessionId = params.get("session");

    let query = supabase
      .from("students")
      .select(
        `id, admission_number, roll_number, date_of_birth, photo_path,
         profiles!students_id_fkey(full_name),
         classes(id, name),
         sections(id, name)`
      )
      .eq("is_active", true)
      .not("date_of_birth", "is", null);

    // Session filter via enrollments join
    if (sessionId) {
      const { data: enrollments } = await supabase
        .from("student_enrollments")
        .select("student_id")
        .eq("session_id", sessionId);
      const ids = (enrollments ?? []).map((e: any) => e.student_id);
      if (ids.length === 0) {
        return NextResponse.json({ students: [], count: 0 });
      }
      query = query.in("id", ids);
    }

    if (classId) query = query.eq("class_id", classId);
    if (sectionId) query = query.eq("section_id", sectionId);

    const { data: students, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to upcoming birthdays, then sort by proximity
    const matched = (students ?? [])
      .map((s: any) => ({
        ...s,
        days_until_birthday: daysUntilBirthday(s.date_of_birth),
      }))
      .filter(
        (s) =>
          s.days_until_birthday !== null && s.days_until_birthday <= days
      )
      .sort(
        (a, b) =>
          (a.days_until_birthday ?? 999) - (b.days_until_birthday ?? 999)
      );

    // Resolve signed photo URLs in parallel (10-min TTL)
    const rows = await Promise.all(
      matched.map(async (s: any) => {
        let photo_url: string | null = null;
        if (s.photo_path) {
          try {
            const { data: signed, error: signErr } = await supabase.storage
              .from("student-photos")
              .createSignedUrl(s.photo_path, 600);
            if (!signErr && signed?.signedUrl) photo_url = signed.signedUrl;
          } catch {
            /* ignore – return null */
          }
        }
        return {
          id: s.id,
          full_name: (s.profiles as any)?.full_name ?? null,
          date_of_birth: s.date_of_birth,
          class: (s.classes as any)?.name ?? null,
          section: (s.sections as any)?.name ?? null,
          admission_number: s.admission_number ?? null,
          roll_number: s.roll_number ?? null,
          photo_url,
          days_until_birthday: s.days_until_birthday,
        };
      })
    );

    return NextResponse.json({ students: rows, count: rows.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
