import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function daysUntilBirthday(dob: string | null): number | null {
  if (!dob) return null;
  const [, month, day] = dob.split("-").map(Number);
  if (!month || !day) return null;

  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(todayParts.find((part) => part.type === "year")?.value);
  const todayMonth = Number(todayParts.find((part) => part.type === "month")?.value);
  const todayDay = Number(todayParts.find((part) => part.type === "day")?.value);
  const today = Date.UTC(year, todayMonth - 1, todayDay);
  const thisBirthday = Date.UTC(year, month - 1, day);
  const nextBirthday = Date.UTC(year + 1, month - 1, day);
  const next = thisBirthday >= today ? thisBirthday : nextBirthday;
  return Math.round((next - today) / 86_400_000);
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("students")
      .select("id, photo_path, date_of_birth, profiles!students_id_fkey(full_name), classes(name), sections(name)")
      .eq("is_active", true)
      .not("date_of_birth", "is", null);

    if (error) {
      console.error("[students/birthdays-public] DB error:", error.message);
      return NextResponse.json({ error: "Unable to load birthdays." }, { status: 500 });
    }

    const matched = (data ?? [])
      .map((student: any) => ({ ...student, days_until_birthday: daysUntilBirthday(student.date_of_birth) }))
      .filter((student: any) => student.days_until_birthday !== null && student.days_until_birthday <= 7)
      .sort((left: any, right: any) => left.days_until_birthday - right.days_until_birthday);

    const students = await Promise.all(matched.map(async (student: any) => {
      let photo_url: string | null = null;
      if (student.photo_path) {
        const signed = await supabase.storage.from("student-photos").createSignedUrl(student.photo_path, 600);
        photo_url = signed.data?.signedUrl ?? null;
      }
      const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
      const classRow = Array.isArray(student.classes) ? student.classes[0] : student.classes;
      const sectionRow = Array.isArray(student.sections) ? student.sections[0] : student.sections;
      return {
        id: student.id,
        name: profile?.full_name ?? null,
        photo_url,
        date_of_birth: student.date_of_birth,
        class: classRow?.name ?? null,
        section: sectionRow?.name ?? null,
      };
    }));

    return NextResponse.json({ students: students.filter((student) => student.name), count: students.length }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error: any) {
    console.error("[students/birthdays-public] Unexpected error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
