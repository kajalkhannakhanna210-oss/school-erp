import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// GET /api/students/directory
//
// Public-facing endpoint that returns a minimal, safe view of active students
// for display on the school home page.
//
// Returned fields (only):
//   name         – full name from the profiles table
//   photo_url    – short-lived signed URL (10 min TTL), null if no photo
//   date_of_birth – date string (YYYY-MM-DD), null if unset
//   class        – class name string, null if unassigned
//   section      – section name string, null if unassigned
//
// Security notes:
//   • Only is_active = true students are included.
//   • The admin client is used *server-side only* — never exposed to the
//     browser — solely to generate signed photo URLs for the private bucket
//     and to read data that RLS restricts from anonymous clients.
//   • No sensitive fields (mobile, email, address, father/mother name, roll
//     number, admission number, blood group, etc.) are selected or returned.
//   • The response is cached for 60 seconds at the edge (Cache-Control) to
//     avoid hammering the database on every page load.
// ---------------------------------------------------------------------------

// How long (seconds) each signed photo URL stays valid.
const PHOTO_URL_TTL = 600; // 10 minutes

// How many students to return on the home page (keep the payload small).
const MAX_STUDENTS = 50;

export async function GET() {
  try {
    // Server-only admin client — bypasses RLS for this specific read.
    // We explicitly select only the non-sensitive columns we need.
    const supabase = createAdminClient();

    const { data: students, error } = await supabase
      .from("students")
      .select(
        `
        id,
        photo_path,
        date_of_birth,
        profiles!students_id_fkey ( full_name ),
        classes ( name ),
        sections ( name )
        `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(MAX_STUDENTS);

    if (error) {
      console.error("[students/directory] DB error:", error.message);
      return NextResponse.json(
        { error: "Unable to fetch student directory." },
        { status: 500 }
      );
    }

    // Resolve signed photo URLs in parallel. Any individual failure falls back
    // gracefully to null rather than rejecting the whole response.
    const rows = await Promise.all(
      (students ?? []).map(async (s: any) => {
        let photo_url: string | null = null;

        if (s.photo_path) {
          try {
            const { data: signed, error: signErr } = await supabase.storage
              .from("student-photos")
              .createSignedUrl(s.photo_path, PHOTO_URL_TTL);
            if (!signErr && signed?.signedUrl) {
              photo_url = signed.signedUrl;
            }
          } catch {
            // Signed URL generation failed — return null, not an error.
          }
        }

        return {
          name: s.profiles?.full_name ?? null,
          photo_url,
          date_of_birth: s.date_of_birth ?? null,
          class: s.classes?.name ?? null,
          section: s.sections?.name ?? null,
        };
      })
    );

    // Filter out any row where we couldn't resolve a name (data integrity gap).
    const payload = rows.filter((r) => r.name !== null);

    return NextResponse.json(
      { students: payload, count: payload.length },
      {
        status: 200,
        headers: {
          // Cache at the edge for 60 s, stale-while-revalidate for 300 s.
          // Keeps the home page fast without hammering Supabase.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e: any) {
    console.error("[students/directory] Unexpected error:", e?.message ?? e);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
