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
      const normalizePath = (p: string) => p.startsWith("id-card-designs/") ? p.replace(/^id-card-designs\//, "") : p;
      try {
        const { data: sdata, error: serr } = await admin.storage.from("id-card-designs").createSignedUrl(normalizePath(String(frontPath)), 60);
        if (serr || !sdata?.signedUrl) {
          // proceed without design
          designUrl = null;
        } else {
          designUrl = sdata.signedUrl;
        }
      } catch (e: any) {
        designUrl = null;
      }
    }

    // Build HTML sized to template
    const widthIn = (widthMm / 25.4).toFixed(3);
    const heightIn = (heightMm / 25.4).toFixed(3);

    const snap = card.snapshot || {};
    const designHtml = designUrl ? (String(designUrl).toLowerCase().endsWith('.pdf') ? `<iframe src="${designUrl}" style="width:100%;height:100%;border:none"></iframe>` : `<img src="${designUrl}" style="max-width:100%;height:auto;display:block"/>`) : '';

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
