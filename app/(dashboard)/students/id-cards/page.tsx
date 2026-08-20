import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { StudentIdCardView } from "./student-id-card-view";

export const metadata: Metadata = {
  title: "Student ID Cards | School ERP",
  description: "Generate, issue, print, and manage student identity cards.",
};

interface PageProps {
  searchParams: Promise<{
    session_id?: string;
    class_id?: string;
    section_id?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function StudentIdCardsPage({ searchParams }: PageProps) {
  await requirePageAccess("student_id_cards");
  const params = await searchParams;

  const supabase = await createClient();

  // Fetch reference metadata
  const [{ data: sessions }, { data: classes }, { data: sections }, templatesRes] =
    await Promise.all([
      supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("sections").select("id, name").order("name"),
      supabase.from("student_id_card_templates").select("*").eq("is_active", true).order("is_default", { ascending: false }).order("created_at", { ascending: false }).then(
        (res) => res,
        () => ({ data: [] })
      ),
    ]);

  const templates = templatesRes?.data ?? [];

  const currentSession = sessions?.find((s) => s.is_current) || sessions?.[0];
  const selectedSessionId = params.session_id || currentSession?.id || "";

  // Query existing ID cards
  let cardQuery = supabase
    .from("student_id_cards")
    .select(`
      id,
      student_id,
      template_id,
      session_id,
      version,
      status,
      secure_token,
      generated_at,
      printed_at,
      remarks,
      snapshot
    `)
    .order("generated_at", { ascending: false });

  if (selectedSessionId) {
    cardQuery = cardQuery.eq("session_id", selectedSessionId);
  }

  if (params.status) {
    cardQuery = cardQuery.eq("status", params.status);
  }

  const { data: rawCards } = await cardQuery;

  // Filter cards in memory by search / class / section snapshot properties
  const filteredCards = (rawCards ?? []).filter((card) => {
    const snap = card.snapshot || {};
    if (params.class_id) {
      const targetClass = classes?.find((c) => c.id === params.class_id);
      if (targetClass && snap.class_name !== targetClass.name) return false;
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      const matchName = snap.student_name?.toLowerCase().includes(q);
      const matchAdm = snap.admission_number?.toLowerCase().includes(q);
      if (!matchName && !matchAdm) return false;
    }
    return true;
  });

  // Deduplicate cards so each student has a single latest record
  const latestCardsByStudent = new Map<string, any>();
  for (const card of filteredCards) {
    if (!latestCardsByStudent.has(card.student_id)) {
      latestCardsByStudent.set(card.student_id, card);
    }
  }
  const cards = Array.from(latestCardsByStudent.values());

  // Query active students who don't have a card for this session
  const activeCardsStudentIds = new Set((rawCards ?? []).map((c) => c.student_id));

  let studentQuery = supabase
    .from("students")
    .select("id, roll_number, admission_number, profiles(full_name), classes(id, name), sections(id, name)")
    .eq("is_active", true)
    .not("admission_number", "is", null)
    .neq("admission_number", "");

  if (params.class_id) {
    studentQuery = studentQuery.eq("class_id", params.class_id);
  }
  if (params.section_id) {
    studentQuery = studentQuery.eq("section_id", params.section_id);
  }

  const { data: rawStudents } = await studentQuery;

  const studentsWithoutCards = (rawStudents ?? []).filter((s) => {
    if (activeCardsStudentIds.has(s.id)) return false;
    if (params.search) {
      const q = params.search.toLowerCase();
      const name = (s.profiles as any)?.full_name?.toLowerCase() || "";
      const adm = s.admission_number?.toLowerCase() || "";
      if (!name.includes(q) && !adm.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-w-0 w-full space-y-6">
      <StudentIdCardView
        cards={cards}
        studentsWithoutCards={studentsWithoutCards}
        academicSessions={sessions ?? []}
        classes={classes ?? []}
        sections={sections ?? []}
        templates={templates ?? []}
        currentSessionId={currentSession?.id || ""}
        filters={{
          sessionId: selectedSessionId,
          classId: params.class_id || "",
          sectionId: params.section_id || "",
          status: params.status || "",
          search: params.search || "",
        }}
      />
    </div>
  );
}
