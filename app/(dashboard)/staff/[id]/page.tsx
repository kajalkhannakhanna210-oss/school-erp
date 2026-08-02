import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ArchiveControl } from "./archive-control";
import { PermissionsEditor } from "./permissions-editor";
import { PhotoUpload } from "./photo-upload";

export default async function StaffDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (viewerProfile?.role !== "super_admin") redirect("/dashboard");

  const { data: member } = await supabase
    .from("staff")
    .select("*, profiles(full_name)")
    .eq("id", params.id)
    .single();

  if (!member) notFound();
  const s = member as any;

  const [{ data: allPermissions }, { data: assigned }] = await Promise.all([
    supabase.from("permissions").select("key, label"),
    supabase.from("staff_permissions").select("permission_key").eq("staff_id", params.id),
  ]);

  let photoUrl: string | null = null;
  if (s.photo_path) {
    const { data: signed } = await supabase.storage.from("staff-photos").createSignedUrl(s.photo_path, 60 * 10);
    photoUrl = signed?.signedUrl ?? null;
  }

  return (
    <div>
      {searchParams.saved && <div className="mb-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">{searchParams.saved === "created" ? "Staff member saved successfully." : "Staff member updated successfully."}</div>}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-700">{s.profiles?.full_name}</h1>
          <p className="mt-1 text-sm text-slate/60">
            <span className="font-mono">{s.employee_id}</span>
            {s.designation && ` · ${s.designation}`}
            {s.department && ` · ${s.department}`}
            {!s.is_active && (
              <>
                {" "}
                · <Badge>Archived</Badge>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/staff/${s.id}/edit`}>
            <Button variant="ghost">Edit</Button>
          </Link>
          <ArchiveControl staffId={s.id} isActive={s.is_active} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="font-display text-lg text-ink-700">Photo</h2>
          <div className="mt-4 flex h-40 w-40 items-center justify-center overflow-hidden rounded-md bg-ink-50">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={s.profiles?.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate/40">No photo</span>
            )}
          </div>
          <div className="mt-4">
            <PhotoUpload staffId={s.id} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="font-display text-lg text-ink-700">Details</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Qualification" value={s.qualification} />
            <Field label="Mobile" value={s.mobile_number} />
            <Field label="Contact email" value={s.contact_email} />
            <Field label="Joining date" value={s.joining_date} />
            <Field label="Salary" value={s.salary != null ? `₹${s.salary}` : null} />
          </dl>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="font-display text-lg text-ink-700">Permissions</h2>
          <p className="mt-1 text-sm text-slate/60">
            Controls what this staff member can access beyond their own profile.
          </p>
          <div className="mt-4">
            <PermissionsEditor
              staffId={s.id}
              allPermissions={allPermissions ?? []}
              assignedKeys={(assigned ?? []).map((a) => a.permission_key)}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate/50">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate">{value || "—"}</dd>
    </div>
  );
}
