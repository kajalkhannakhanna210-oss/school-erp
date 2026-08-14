import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import type { DocumentStatus, DocumentSubjectType } from "@/lib/security/documents";

export type DocumentActor = {
  userId: string;
  role: UserRole;
  permissions: Set<string>;
};

export type DocumentCategory = {
  id: string;
  subject_type: DocumentSubjectType;
  name: string;
  code: string;
  is_active: boolean;
  is_sensitive: boolean;
  subject_visible: boolean;
  is_required: boolean;
};

export type ManagedDocument = {
  id: string;
  subjectId: string;
  categoryId: string;
  title: string;
  description: string | null;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  fileType: string;
  fileSizeBytes: number;
  fileSha256: string | null;
  status: DocumentStatus;
  expiryDate: string | null;
  version: number;
  supersedesDocumentId: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
  category: DocumentCategory | null;
};

export type DocumentPanelRow = ManagedDocument & {
  uploadedByName: string | null;
  effectiveStatus: DocumentStatus;
};

export type DocumentActivityRow = {
  id: string;
  action: string;
  performedByName: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type RecentDocumentActivityRow = DocumentActivityRow & {
  subjectId: string;
  categoryName: string | null;
};

export type DocumentDashboardFilters = {
  query?: string;
  categoryId?: string;
  status?: string;
  fileType?: string;
  uploadedFrom?: string;
  uploadedTo?: string;
  expiry?: "all" | "expired" | "soon";
  sort?: "newest" | "oldest" | "name" | "expiry";
  page?: number;
  perPage?: number;
};

export type DocumentDashboardRow = DocumentPanelRow & {
  subjectName: string;
  subjectReference: string | null;
};

export async function getDocumentActor(): Promise<DocumentActor | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile?.role) return null;
  const { data: permissions } = profile.role === "staff"
    ? await supabase.from("staff_permissions").select("permission_key").eq("staff_id", user.id)
    : { data: [] as { permission_key: string }[] };
  return { userId: user.id, role: profile.role as UserRole, permissions: new Set((permissions ?? []).map((item) => item.permission_key)) };
}

function hasAny(actor: DocumentActor, permissions: string[]) {
  return permissions.some((permission) => actor.permissions.has(permission));
}

function canUseSensitiveCategory(actor: DocumentActor, manage: boolean) {
  return actor.role === "super_admin" || actor.permissions.has(manage ? "manage_sensitive_documents" : "view_sensitive_documents") || actor.permissions.has("manage_sensitive_documents");
}

export function canManageDocument(actor: DocumentActor, subjectType: DocumentSubjectType, category: Pick<DocumentCategory, "is_sensitive">) {
  if (actor.role === "super_admin") return true;
  const permission = subjectType === "student" ? "manage_student_documents" : "manage_staff_documents";
  return actor.role === "staff" && actor.permissions.has(permission) && (!category.is_sensitive || canUseSensitiveCategory(actor, true));
}

export function canViewDocument(
  actor: DocumentActor,
  subjectType: DocumentSubjectType,
  subjectId: string,
  category: Pick<DocumentCategory, "is_sensitive" | "subject_visible">,
  status: DocumentStatus
) {
  if (actor.role === "super_admin") return true;
  if (actor.userId === subjectId && status === "approved" && category.subject_visible) return true;
  const permissions = subjectType === "student"
    ? ["view_student_documents", "manage_student_documents"]
    : ["view_staff_documents", "manage_staff_documents"];
  return actor.role === "staff" && hasAny(actor, permissions) && (!category.is_sensitive || canUseSensitiveCategory(actor, false));
}

export function canViewDocumentAudit(actor: DocumentActor) {
  return actor.role === "super_admin" || (actor.role === "staff" && actor.permissions.has("view_document_audit"));
}

export async function getDocumentSettings() {
  const { data } = await createAdminClient()
    .from("document_settings")
    .select("max_file_size_bytes, allowed_file_types, expiry_reminder_days")
    .eq("id", true)
    .maybeSingle();
  return {
    maxFileSizeBytes: Number(data?.max_file_size_bytes ?? 10 * 1024 * 1024),
    allowedFileTypes: Array.isArray(data?.allowed_file_types) ? data.allowed_file_types.filter((value): value is string => typeof value === "string") : ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"],
    expiryReminderDays: Number(data?.expiry_reminder_days ?? 30),
  };
}

export async function getDocumentCategory(id: string, subjectType: DocumentSubjectType): Promise<DocumentCategory | null> {
  const { data } = await createAdminClient()
    .from("document_categories")
    .select("id, subject_type, name, code, is_active, is_sensitive, subject_visible, is_required")
    .eq("id", id)
    .eq("subject_type", subjectType)
    .maybeSingle();
  return data ? data as DocumentCategory : null;
}

export async function subjectExists(subjectType: DocumentSubjectType, subjectId: string) {
  const table = subjectType === "student" ? "students" : "staff";
  const { data } = await createAdminClient().from(table).select("id").eq("id", subjectId).maybeSingle();
  return Boolean(data);
}

function documentSelect(subjectType: DocumentSubjectType) {
  const subjectColumn = subjectType === "student" ? "student_id" : "staff_id";
  return `${subjectColumn}, id, category_id, title, description, original_file_name, stored_file_name, file_path, file_type, file_size_bytes, file_sha256, status, expiry_date, version, supersedes_document_id, uploaded_by, uploaded_at, created_at, updated_at, document_categories(id, subject_type, name, code, is_active, is_sensitive, subject_visible, is_required)`;
}

export async function getManagedDocument(subjectType: DocumentSubjectType, documentId: string): Promise<ManagedDocument | null> {
  const table = subjectType === "student" ? "student_documents" : "staff_documents";
  const { data } = await createAdminClient().from(table).select(documentSelect(subjectType)).eq("id", documentId).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, any>;
  return {
    id: row.id,
    subjectId: row[subjectType === "student" ? "student_id" : "staff_id"],
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    originalFileName: row.original_file_name,
    storedFileName: row.stored_file_name,
    filePath: row.file_path,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes,
    fileSha256: row.file_sha256,
    status: row.status as DocumentStatus,
    expiryDate: row.expiry_date,
    version: row.version,
    supersedesDocumentId: row.supersedes_document_id,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.document_categories as DocumentCategory | null,
  };
}

export async function appendDocumentActivity(input: {
  subjectType: DocumentSubjectType;
  documentId: string;
  subjectId: string;
  categoryId: string;
  action: "viewed" | "downloaded";
  actor: DocumentActor;
}) {
  await createAdminClient().from("document_activity_logs").insert({
    document_subject_type: input.subjectType,
    document_id: input.documentId,
    student_id: input.subjectType === "student" ? input.subjectId : null,
    staff_id: input.subjectType === "staff" ? input.subjectId : null,
    category_id: input.categoryId,
    action: input.action,
    performed_by: input.actor.userId,
    performed_by_role: input.actor.role,
    metadata: {},
  });
}

export async function listDocumentCategories(subjectType: DocumentSubjectType) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_categories")
    .select("id, subject_type, name, code, is_active, is_sensitive, subject_visible, is_required")
    .eq("subject_type", subjectType)
    .order("name");
  return (data ?? []) as DocumentCategory[];
}

export async function listDocumentsForSubject(subjectType: DocumentSubjectType, subjectId: string): Promise<DocumentPanelRow[]> {
  const supabase = await createClient();
  const table = subjectType === "student" ? "student_documents" : "staff_documents";
  const subjectColumn = subjectType === "student" ? "student_id" : "staff_id";
  const { data } = await supabase
    .from(table)
    .select(documentSelect(subjectType))
    .eq(subjectColumn, subjectId)
    .order("created_at", { ascending: false });
  const rawRows = (data ?? []) as Record<string, any>[];
  const uploaderIds = [...new Set(rawRows.map((row) => row.uploaded_by).filter((value): value is string => typeof value === "string"))];
  const { data: uploaders } = uploaderIds.length
    ? await createAdminClient().from("profiles").select("id, full_name").in("id", uploaderIds)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((uploaders ?? []).map((profile) => [profile.id, profile.full_name]));
  return rawRows.map((row) => {
    const document: ManagedDocument = {
      id: row.id,
      subjectId: row[subjectColumn],
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      originalFileName: row.original_file_name,
      storedFileName: row.stored_file_name,
      filePath: row.file_path,
      fileType: row.file_type,
      fileSizeBytes: row.file_size_bytes,
      fileSha256: row.file_sha256,
      status: row.status as DocumentStatus,
      expiryDate: row.expiry_date,
      version: row.version,
      supersedesDocumentId: row.supersedes_document_id,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      category: row.document_categories as DocumentCategory | null,
    };
    return { ...document, uploadedByName: document.uploadedBy ? names.get(document.uploadedBy) ?? null : null, effectiveStatus: documentEffectiveStatus(document.status, document.expiryDate) };
  });
}

export async function listDocumentActivity(subjectType: DocumentSubjectType, documentId: string): Promise<DocumentActivityRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_activity_logs")
    .select("id, action, performed_by, created_at, metadata")
    .eq("document_subject_type", subjectType)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(30);
  const rows = (data ?? []) as { id: string; action: string; performed_by: string | null; created_at: string; metadata: Record<string, unknown> }[];
  const ids = [...new Set(rows.map((row) => row.performed_by).filter((value): value is string => Boolean(value)))];
  const { data: actors } = ids.length
    ? await createAdminClient().from("profiles").select("id, full_name").in("id", ids)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((actors ?? []).map((profile) => [profile.id, profile.full_name]));
  return rows.map((row) => ({ id: row.id, action: row.action, performedByName: row.performed_by ? names.get(row.performed_by) ?? null : null, createdAt: row.created_at, metadata: row.metadata ?? {} }));
}

export async function listRecentDocumentActivity(subjectType: DocumentSubjectType, limit = 25): Promise<RecentDocumentActivityRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_activity_logs")
    .select("id, action, performed_by, created_at, metadata, student_id, staff_id, document_categories(name)")
    .eq("document_subject_type", subjectType)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  const rows = (data ?? []) as Array<Record<string, any>>;
  const actorIds = [...new Set(rows.map((row) => row.performed_by).filter((value): value is string => typeof value === "string"))];
  const { data: actors } = actorIds.length
    ? await createAdminClient().from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((actors ?? []).map((profile) => [profile.id, profile.full_name]));
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    subjectId: subjectType === "student" ? row.student_id : row.staff_id,
    categoryName: row.document_categories?.name ?? null,
    performedByName: row.performed_by ? names.get(row.performed_by) ?? null : null,
    createdAt: row.created_at,
    metadata: row.metadata ?? {},
  }));
}

export async function listDocumentDashboard(subjectType: DocumentSubjectType, filters: DocumentDashboardFilters) {
  const supabase = await createClient();
  const subjectColumn = subjectType === "student" ? "student_id" : "staff_id";
  const table = subjectType === "student" ? "student_documents" : "staff_documents";
  const perPage = Math.min(Math.max(filters.perPage ?? 10, 10), 50);
  const page = Math.max(filters.page ?? 1, 1);
  const search = (filters.query ?? "").replace(/[,().%]/g, " ").trim().slice(0, 80);
  let query = supabase.from(table).select(documentSelect(subjectType), { count: "exact" });

  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.status && ["active", "pending_review", "approved", "rejected", "expired", "archived"].includes(filters.status)) {
    query = query.eq("status", filters.status);
  }
  if (filters.fileType) query = query.eq("file_type", filters.fileType);
  if (filters.uploadedFrom) query = query.gte("created_at", `${filters.uploadedFrom}T00:00:00.000Z`);
  if (filters.uploadedTo) query = query.lte("created_at", `${filters.uploadedTo}T23:59:59.999Z`);
  const today = new Date().toISOString().slice(0, 10);
  if (filters.expiry === "expired") query = query.lt("expiry_date", today).not("status", "in", "(archived,rejected)");
  if (filters.expiry === "soon") {
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    query = query.gte("expiry_date", today).lte("expiry_date", soon).not("status", "in", "(archived,rejected)");
  }
  if (search) {
    const { data: subjectMatches } = await supabase.rpc("search_document_subjects", {
      p_subject_type: subjectType,
      p_query: search,
      p_limit: 50,
    });
    const ids = (subjectMatches ?? []).map((row: { id: string }) => row.id).filter(Boolean);
    const titleFilters = `title.ilike.%${search}%,original_file_name.ilike.%${search}%`;
    query = ids.length ? query.or(`${titleFilters},${subjectColumn}.in.(${ids.join(",")})`) : query.or(titleFilters);
  }
  if (filters.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (filters.sort === "name") query = query.order("title", { ascending: true });
  else if (filters.sort === "expiry") query = query.order("expiry_date", { ascending: true, nullsFirst: false });
  else query = query.order("created_at", { ascending: false });

  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rawRows = (data ?? []) as Record<string, any>[];
  const subjectIds = [...new Set(rawRows.map((row) => row[subjectColumn]))];
  const uploaderIds = [...new Set(rawRows.map((row) => row.uploaded_by).filter((value): value is string => typeof value === "string"))];
  const admin = createAdminClient();
  const [{ data: subjects }, { data: uploaders }] = await Promise.all([
    subjectIds.length
      ? subjectType === "student"
        ? admin.from("students").select("id, admission_number, profiles(full_name)").in("id", subjectIds)
        : admin.from("staff").select("id, employee_id, profiles(full_name)").in("id", subjectIds)
      : Promise.resolve({ data: [] }),
    uploaderIds.length ? admin.from("profiles").select("id, full_name").in("id", uploaderIds) : Promise.resolve({ data: [] }),
  ]);
  const subjectsById = new Map((subjects ?? []).map((subject: any) => [subject.id, { name: subject.profiles?.full_name ?? "Unknown", reference: subjectType === "student" ? subject.admission_number : subject.employee_id }]));
  const uploadersById = new Map((uploaders ?? []).map((profile: any) => [profile.id, profile.full_name]));
  const rows: DocumentDashboardRow[] = rawRows.map((row) => {
    const managed: ManagedDocument = {
      id: row.id, subjectId: row[subjectColumn], categoryId: row.category_id, title: row.title, description: row.description,
      originalFileName: row.original_file_name, storedFileName: row.stored_file_name, filePath: row.file_path, fileType: row.file_type,
      fileSizeBytes: row.file_size_bytes, fileSha256: row.file_sha256, status: row.status as DocumentStatus, expiryDate: row.expiry_date,
      version: row.version, supersedesDocumentId: row.supersedes_document_id, uploadedBy: row.uploaded_by, uploadedAt: row.uploaded_at,
      createdAt: row.created_at, updatedAt: row.updated_at, category: row.document_categories as DocumentCategory | null,
    };
    const subject = subjectsById.get(managed.subjectId);
    return {
      ...managed,
      uploadedByName: managed.uploadedBy ? uploadersById.get(managed.uploadedBy) ?? null : null,
      effectiveStatus: documentEffectiveStatus(managed.status, managed.expiryDate),
      subjectName: subject?.name ?? "Unknown",
      subjectReference: subject?.reference ?? null,
    };
  });
  return { rows, count: count ?? 0, page, perPage };
}

export async function getDocumentOverviewCounts(subjectType: DocumentSubjectType) {
  const supabase = await createClient();
  const table = subjectType === "student" ? "student_documents" : "staff_documents";
  const settings = await getDocumentSettings();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + settings.expiryReminderDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [expired, expiringSoon] = await Promise.all([
    supabase.from(table).select("id", { count: "exact", head: true }).lt("expiry_date", today).not("status", "in", "(archived,rejected)"),
    supabase.from(table).select("id", { count: "exact", head: true }).gte("expiry_date", today).lte("expiry_date", soon).not("status", "in", "(archived,rejected)"),
  ]);
  return { expired: expired.count ?? 0, expiringSoon: expiringSoon.count ?? 0, reminderDays: settings.expiryReminderDays };
}

export async function getMissingRequiredDocumentCount(subjectType: DocumentSubjectType) {
  const admin = createAdminClient();
  const table = subjectType === "student" ? "student_documents" : "staff_documents";
  const subjectColumn = subjectType === "student" ? "student_id" : "staff_id";
  const subjectTable = subjectType === "student" ? "students" : "staff";
  const [{ data: categories }, { data: subjects }, { data: documents }] = await Promise.all([
    admin.from("document_categories").select("id").eq("subject_type", subjectType).eq("is_required", true).eq("is_active", true),
    admin.from(subjectTable).select("id").eq("is_active", true),
    admin.from(table).select(`${subjectColumn}, category_id, status, expiry_date`).not("status", "in", "(archived,rejected)"),
  ]);
  const requiredCategories = (categories ?? []).map((category) => category.id);
  if (!requiredCategories.length || !(subjects ?? []).length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const available = new Set(
    (documents ?? [])
      .filter((document: any) => !document.expiry_date || document.expiry_date >= today)
      .map((document: any) => `${document[subjectColumn]}:${document.category_id}`)
  );
  return (subjects ?? []).reduce(
    (missing, subject) => missing + requiredCategories.filter((categoryId) => !available.has(`${subject.id}:${categoryId}`)).length,
    0,
  );
}

export function documentEffectiveStatus(status: DocumentStatus, expiryDate: string | null): DocumentStatus {
  if (status !== "archived" && status !== "rejected" && expiryDate && expiryDate < new Date().toISOString().slice(0, 10)) return "expired";
  return status;
}
