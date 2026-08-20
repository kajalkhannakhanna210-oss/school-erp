import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const type = request.nextUrl.searchParams.get("type") || "card";

  if (type === "info") {
    // Info sheet generation requires students page access
    try {
      await requirePageAccess("students");
    } catch (e) {
      return error("Not authorized.", 403);
    }

    const studentId = params.id;
    if (!studentId) return error("Missing student id.", 400);

    const supabase = await createClient();
    const admin = createAdminClient();

    try {
      // Fetch student basic details
      const { data: student, error: studentErr } = await supabase
        .from("students")
        .select(`*, profiles(full_name, address, contact_email), classes(name), sections(name), academic_sessions(name)`)
        .eq("id", studentId)
        .maybeSingle();

      if (studentErr) return error(`Failed to fetch student: ${studentErr.message}`, 500);
      if (!student) return error("Student not found.", 404);

      // Enrollment history
      const { data: enrollments } = await supabase.from("student_enrollments").select("session_id, class_id, section_id, created_at, academic_sessions(name), classes(name), sections(name)").eq("student_id", studentId).order("created_at", { ascending: true });

      // Documents summary
      const { data: documents } = await supabase.from("student_documents").select("id, file_name, file_path, uploaded_at, file_type, file_size_bytes, document_categories(name)").eq("student_id", studentId).order("uploaded_at", { ascending: false });

      // Latest leaving / TC info
      const { data: leaving } = await supabase.from("student_leaving_requests").select("*, academic_sessions(name)").eq("student_id", studentId).order("created_at", { ascending: false }).limit(1);
      const leavingReq = (leaving ?? [])[0] || null;

      // Student photo signed URL if present
      let studentPhotoUrl: string | null = null;
      if (student.photo_path) {
        try {
          const { data: photoData } = await admin.storage.from("student-photos").createSignedUrl(String(student.photo_path), 60);
          studentPhotoUrl = photoData?.signedUrl ?? null;
        } catch (e) {
          studentPhotoUrl = null;
        }
      }

      // Documents summary formatted
      const docRows = (documents ?? []).map((d: any) => ({ name: d.file_name, type: d.file_type, uploadedAt: d.uploaded_at, size: d.file_size_bytes }));

      // Build HTML for A4
      const escapeHtml = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");

      const schoolHeader = `
        <div style="text-align:center;margin-bottom:8px">
          <h2 style="margin:0;font-size:20px">${escapeHtml(process.env.SCHOOL_NAME ?? "School")}</h2>
          <div style="font-size:12px;color:#444">${escapeHtml(process.env.SCHOOL_ADDRESS ?? "")}</div>
          <div style="font-size:12px;color:#444">${escapeHtml(process.env.SCHOOL_CONTACT ?? "")}</div>
        </div>
      `;

      const studentInfoHtml = `
        <table style="width:100%;border-collapse:collapse;margin-top:6px">
          <tr>
            <td style="width:110px;vertical-align:top">
              ${studentPhotoUrl ? `<img src="${studentPhotoUrl}" alt="photo" style="width:100px;height:120px;object-fit:cover;border:1px solid #ddd"/>` : `<div style="width:100px;height:120px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;color:#999">No Photo</div>`}
            </td>
            <td style="padding-left:12px;vertical-align:top">
              <h3 style="margin:0 0 6px 0">${escapeHtml(student.profiles?.full_name ?? "-")}</h3>
              <div style="font-size:13px;color:#222">Student ID: <b>${escapeHtml(student.id)}</b></div>
              <div style="font-size:13px;color:#222">Admission No: <b>${escapeHtml(student.admission_number ?? "-")}</b></div>
              <div style="font-size:13px;color:#222">Registration No: <b>${escapeHtml(student.roll_number ?? "-")}</b></div>
              <div style="font-size:13px;color:#222">DOB: <b>${escapeHtml(student.date_of_birth ?? "-")}</b></div>
              <div style="font-size:13px;color:#222">Gender: <b>${escapeHtml(student.gender ?? "-")}</b></div>
              <div style="font-size:13px;color:#222">Admission Date: <b>${escapeHtml(student.admission_date ?? "-")}</b></div>
            </td>
            <td style="width:220px;vertical-align:top;padding-left:12px">
              <div style="font-size:13px;color:#222">Class: <b>${escapeHtml(student.classes?.name ?? "-")}</b></div>
              <div style="font-size:13px;color:#222">Section: <b>${escapeHtml(student.sections?.name ?? "-")}</b></div>
              <div style="font-size:13px;color:#222">Academic Session: <b>${escapeHtml(student.academic_sessions?.name ?? "-")}</b></div>
              <div style="font-size:13px;color:#222">Status: <b>${student.is_active ? 'Active' : 'Archived'}</b></div>
            </td>
          </tr>
        </table>
      `;

      const parentHtml = `
        <div style="margin-top:12px">
          <h4 style="margin:0 0 6px 0;font-size:14px">Parent / Guardian</h4>
          <div style="font-size:13px;color:#222">Father: <b>${escapeHtml(student.father_name ?? "-")}</b></div>
          <div style="font-size:13px;color:#222">Mother: <b>${escapeHtml(student.mother_name ?? "-")}</b></div>
          <div style="font-size:13px;color:#222">Guardian: <b>-</b></div>
          <div style="font-size:13px;color:#222">Mobile: <b>${escapeHtml(student.mobile_number ?? "-")}</b></div>
          <div style="font-size:13px;color:#222">Email: <b>${escapeHtml(student.contact_email ?? "-")}</b></div>
        </div>
      `;

      const addressHtml = `
        <div style="margin-top:12px">
          <h4 style="margin:0 0 6px 0;font-size:14px">Address</h4>
          <div style="font-size:13px;color:#222">${escapeHtml(student.address ?? (student.profiles?.address ?? "-"))}</div>
        </div>
      `;

      const prevSchoolHtml = `
        <div style="margin-top:12px">
          <h4 style="margin:0 0 6px 0;font-size:14px">Previous School</h4>
          <div style="font-size:13px;color:#222">Previous School: <b>-</b></div>
          <div style="font-size:13px;color:#222">Previous Class: <b>-</b></div>
          <div style="font-size:13px;color:#222">Previous Board: <b>-</b></div>
        </div>
      `;

      // History from enrollments and leaving
      const historyRows = (enrollments ?? []).map((e: any) => `<tr><td style="padding:6px;border:1px solid #eee">${escapeHtml(e.academic_sessions?.name ?? '')}</td><td style="padding:6px;border:1px solid #eee">${escapeHtml(e.classes?.name ?? '')}</td><td style="padding:6px;border:1px solid #eee">${escapeHtml(e.sections?.name ?? '')}</td><td style="padding:6px;border:1px solid #eee">${escapeHtml(e.created_at ?? '')}</td></tr>`).join("");
      const historyHtml = `
        <div style="margin-top:12px">
          <h4 style="margin:0 0 6px 0;font-size:14px">Student History</h4>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr><th style="text-align:left;padding:6px;border:1px solid #eee;background:#fafafa">Session</th><th style="text-align:left;padding:6px;border:1px solid #eee;background:#fafafa">Class</th><th style="text-align:left;padding:6px;border:1px solid #eee;background:#fafafa">Section</th><th style="text-align:left;padding:6px;border:1px solid #eee;background:#fafafa">Enrolled At</th></tr>
            </thead>
            <tbody>
              ${historyRows || `<tr><td colspan="4" style="padding:10px;text-align:center;color:#888">No enrollment history available</td></tr>`}
            </tbody>
          </table>
        </div>
      `;

      const docsHtmlRows = docRows.map((d: any) => `<tr><td style="padding:6px;border:1px solid #eee">${escapeHtml(d.name)}</td><td style="padding:6px;border:1px solid #eee">${escapeHtml(d.type)}</td><td style="padding:6px;border:1px solid #eee">${escapeHtml(d.uploadedAt)}</td><td style="padding:6px;border:1px solid #eee">${Math.round((d.size||0)/1024)} KB</td></tr>`).join("");
      const docsHtml = `
        <div style="margin-top:12px">
          <h4 style="margin:0 0 6px 0;font-size:14px">Documents</h4>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr><th style="text-align:left;padding:6px;border:1px solid #eee;background:#fafafa">Name</th><th style="text-align:left;padding:6px;border:1px solid #eee;background:#fafafa">Type</th><th style="text-align:left;padding:6px;border:1px solid #eee;background:#fafafa">Uploaded</th><th style="text-align:left;padding:6px;border:1px solid #eee;background:#fafafa">Size</th></tr>
            </thead>
            <tbody>
              ${docsHtmlRows || `<tr><td colspan="4" style="padding:10px;text-align:center;color:#888">No documents available</td></tr>`}
            </tbody>
          </table>
        </div>
      `;

      const tcHtml = leavingReq
        ? `<div style="margin-top:12px"><h4 style="margin:0 0 6px 0;font-size:14px">Transfer Certificate</h4><div style="font-size:13px;color:#222">TC Number: <b>${escapeHtml(leavingReq.certificate_number ?? 'Not issued')}</b></div><div style="font-size:13px;color:#222">Issued At: <b>${escapeHtml(leavingReq.certificate_generated_at ?? '-')}</b></div></div>`
        : `<div style="margin-top:12px"><h4 style="margin:0 0 6px 0;font-size:14px">Transfer Certificate</h4><div style="font-size:13px;color:#888">No leaving/TC record found</div></div>`;

      const generatedBy = request.headers.get('x-user-name') || 'System';
      const footer = `<div style="margin-top:18px;font-size:11px;color:#666">Generated: ${new Date().toLocaleString()} by ${escapeHtml(generatedBy)} · School ERP</div>`;

      const html = `<!doctype html><html><head><meta charset='utf-8'><title>Student Information Sheet</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:20px}h3,h4{margin:0 0 6px 0}table{font-size:13px}th{font-weight:700}</style></head><body>${schoolHeader}${studentInfoHtml}${parentHtml}${addressHtml}${prevSchoolHtml}${historyHtml}${docsHtml}${tcHtml}${footer}</body></html>`;

      // Puppeteer PDF generation (A4)
      let puppeteer: any;
      try {
        puppeteer = await import('puppeteer-core');
      } catch (e) {
        return error('Server PDF renderer not available. Install puppeteer or set PUPPETEER_EXECUTABLE_PATH.', 500);
      }

      const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
      if (!execPath) {
        return error('PUPPETEER_EXECUTABLE_PATH not set. Please install Chrome/Chromium and set PUPPETEER_EXECUTABLE_PATH environment variable.', 500);
      }

      const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'], executablePath: execPath, headless: true });
      const pageP = await browser.newPage();
      await pageP.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await pageP.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } });
      await browser.close();

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Student_Info_${student.admission_number || studentId}.pdf"`,
        },
      });
    } catch (e: any) {
      return error(`PDF generation failed: ${String(e?.message || e)}`, 500);
    }
  }

  // existing card logic follows...

  try {
    await requirePageAccess("student_id_cards");
  } catch (e) {
    return error("Not authorized.", 403);
  }

  const studentId = params.id;
  if (!studentId) return error("Missing student id.", 400);

  const supabase = await createClient();
  const admin = createAdminClient();

  try {
    const { data, error: qErr } = await supabase
      .from("student_id_cards")
      .select("*, template:student_id_card_templates(width_mm, height_mm, orientation, options)")
      .eq("student_id", studentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) return error(`Failed to fetch card: ${qErr.message}`, 500);
    if (!data) return error("No card found.", 404);

    const card = data as any;
    const tpl = card.template || {};
    const widthMm = Number(tpl.width_mm || 85.6);
    const heightMm = Number(tpl.height_mm || 53.98);

    // Determine design path from template options
    const frontPath = tpl?.options?.front_file_path || null;
    let designUrl: string | null = null;

    if (frontPath) {
      try {
        const paths = Array.from(new Set([
          String(frontPath),
          String(frontPath).replace(/^id-card-designs\//, ""),
        ]));
        for (const path of paths) {
          const { data: sdata, error: storageError } = await admin.storage.from("id-card-designs").createSignedUrl(path, 60);
          if (!storageError && sdata?.signedUrl) {
            designUrl = sdata.signedUrl;
            break;
          }
        }
      } catch (e: any) {
        designUrl = null;
      }
    }

    // Build HTML sized to template
    const widthIn = (widthMm / 25.4).toFixed(3);
    const heightIn = (heightMm / 25.4).toFixed(3);

    const snap = card.snapshot || {};
    const escapeHtml = (value: unknown) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const fields = Array.isArray(tpl?.options?.fields) ? tpl.options.fields : [];
    let studentPhotoUrl: string | null = null;
    if (snap.photo_path) {
      const { data: photoData } = await admin.storage.from("student-photos").createSignedUrl(String(snap.photo_path), 60);
      studentPhotoUrl = photoData?.signedUrl || null;
    }
    const fieldValue = (key: string) => {
      if (key === "student_name") return snap.student_name || "Student Name";
      if (key === "class_section") return `${snap.class_name || ""} - ${snap.section_name || ""}`;
      if (key === "admission_number") return snap.admission_number || "Admission No.";
      return "";
    };
    const fieldHtml = fields.map((field: any) => {
      const style = `left:${Number(field.x) || 0}%;top:${Number(field.y) || 0}%;width:${Number(field.width) || 20}%;height:${Number(field.height) || 8}%;`;
      if (field.key === "photo") {
        return studentPhotoUrl
          ? `<img src="${studentPhotoUrl}" alt="Student photo" style="position:absolute;${style}object-fit:cover;border:1px solid #cbd5e1"/>`
          : `<div style="position:absolute;${style}display:flex;align-items:center;justify-content:center;border:1px solid #cbd5e1;background:#f1f5f9;color:#64748b;font-size:8px">PHOTO</div>`;
      }
      return `<div style="position:absolute;${style}overflow:hidden;font-size:9px;font-weight:700;color:#0f172a;display:flex;align-items:center">${escapeHtml(fieldValue(field.key))}</div>`;
    }).join("");
    const designHtml = designUrl
      ? `<div style="position:absolute;inset:0;overflow:hidden">${String(designUrl).toLowerCase().endsWith('.pdf') ? `<iframe src="${designUrl}" style="width:100%;height:100%;border:none"></iframe>` : `<img src="${designUrl}" style="width:100%;height:100%;object-fit:contain;display:block"/>`}${fieldHtml}</div>`
      : '';

    const html = `<!doctype html><html><head><meta charset='utf-8'><title>ID Card</title><style>
      @page { size: ${widthIn}in ${heightIn}in; margin: 0; }
      body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}
      .card{width:${widthIn}in;height:${heightIn}in;box-sizing:border-box;padding:8px;border:0;background:white;position:relative}
      .header{background:#eff6ff;padding:6px;font-weight:700;font-size:12px;color:#1e3a8a}
      .title{font-size:14px;font-weight:700;margin-top:6px}
      .field{font-size:11px;color:#334155;margin-bottom:4px}
      .design-wrapper{position:absolute;inset:8px;display:flex;align-items:center;justify-content:center}
      img{object-fit:contain;max-width:100%;max-height:100%}
    </style></head><body><div class="card">
      <div class="header">ACADEMIC PUBLIC SCHOOL</div>
      <div class="title">${snap.student_name || 'Student'}</div>
      <div class="field"><b>Admission No:</b> ${snap.admission_number || 'N/A'}</div>
      <div class="field"><b>Class / Sec:</b> ${snap.class_name || ''} - ${snap.section_name || ''}</div>
      <div class="field"><b>Roll:</b> ${snap.roll_number || 'N/A'}</div>
      <div class="field"><b>Mobile:</b> ${snap.mobile_number || 'N/A'}</div>
      <div class="design-wrapper">${designHtml}</div>
    </div></body></html>`;

    // Use puppeteer-core to render PDF. Requires PUPPETEER_EXECUTABLE_PATH env to point to Chrome/Chromium, or use a system chrome in PATH.
    let puppeteer: any;
    try {
      puppeteer = await import('puppeteer-core');
    } catch (e) {
      return error('Server PDF renderer not available. Install puppeteer or set PUPPETEER_EXECUTABLE_PATH.', 500);
    }

    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    if (!execPath) {
      return error('PUPPETEER_EXECUTABLE_PATH not set. Please install Chrome/Chromium and set PUPPETEER_EXECUTABLE_PATH environment variable.', 500);
    }

    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'], executablePath: execPath, headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ width: `${widthMm}mm`, height: `${heightMm}mm`, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ID_Card_${snap.admission_number || studentId}.pdf"`,
      },
    });
  } catch (e: any) {
    return error(`PDF generation failed: ${String(e?.message || e)}`, 500);
  }
}
