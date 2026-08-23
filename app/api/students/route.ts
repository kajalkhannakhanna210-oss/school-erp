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
      .select('id, admission_number, mobile_number, is_active, photo_path, profiles!students_id_fkey(full_name), classes(name), sections(name), academic_sessions(name)', { count: 'exact' })
      .order('admission_number');

    const sessionId = params.get('session');
    if (sessionId) query = query.eq('session_id', sessionId);
    const classId = params.get('class');
    if (classId) query = query.eq('class_id', classId);
    const sectionId = params.get('section');
    if (sectionId) query = query.eq('section_id', sectionId);
    const q = params.get('q');
    if (q) {
      const qSafe = q.replace(/[,()]/g, '');
      query = query.or(`admission_number.ilike.%${qSafe}%,mobile_number.ilike.%${qSafe}%`);
    }

    const { data: students, count, error } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const noSign = url.searchParams.get('no_sign');

    // Generate signed URLs for photo_path where possible unless prefetch asked to skip signing
    const rows = await Promise.all((students ?? []).map(async (s: any) => {
      let photo_url = null;
      if (s.photo_path && !noSign) {
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
