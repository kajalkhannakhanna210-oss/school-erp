import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card } from "@/components/ui";

export default async function SchoolDetailsPage({ params }: { params: { id: string } }) {
  await requirePageAccess("school_master");
  const supabase = await createClient();
  const { data: school } = await supabase
    .from("schools")
    .select("*, organizations(id, code, name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!school) notFound();

  const organization = Array.isArray(school.organizations) ? school.organizations[0] : school.organizations;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">School / Branch Master</p>
          <h1 className="text-2xl font-semibold">{school.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ink-100 bg-white px-4 py-2 text-sm font-semibold text-ink-700 shadow-sm hover:bg-ink-50" href="/school-master">Back</Link>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-lg bg-ink-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-600" href={`/school-master/${school.id}/edit`}>Edit School</Link>
        </div>
      </div>

      <Card>
        <h2 className="mb-5 text-lg font-semibold">School details</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><p className="text-sm text-muted-foreground">School name</p><p className="font-medium">{school.name}</p></div>
          <div><p className="text-sm text-muted-foreground">School code</p><p className="font-medium">{school.code}</p></div>
          <div><p className="text-sm text-muted-foreground">Organization</p><p className="font-medium">{organization?.name ?? "—"}</p><p className="text-sm text-muted-foreground">{organization?.code ?? ""}</p></div>
          <div><p className="text-sm text-muted-foreground">Status</p><Badge variant={school.is_active ? "default" : "secondary"}>{school.is_active ? "Active" : "Inactive"}</Badge></div>
          <div><p className="text-sm text-muted-foreground">Website slug</p><p className="font-medium">{school.slug}</p></div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-4 text-lg font-semibold">Contact information</h2><div className="grid gap-4 sm:grid-cols-2 text-sm"><div><p className="text-muted-foreground">Contact person</p><p className="font-medium">{school.contact_person ?? "—"}</p></div><div><p className="text-muted-foreground">Designation</p><p className="font-medium">{school.contact_designation ?? "—"}</p></div><div><p className="text-muted-foreground">Mobile</p><p className="font-medium">{school.phone ?? "—"}</p></div><div><p className="text-muted-foreground">Email</p><p className="break-words font-medium">{school.email ?? "—"}</p></div></div></Card>
        <Card><h2 className="mb-4 text-lg font-semibold">Address</h2><p className="text-sm leading-6 text-ink-700">{[school.address_line1, school.address_line2, school.city, school.state, school.country, school.postal_code].filter(Boolean).join(", ") || "No address provided."}</p></Card>
      </div>
    </div>
  );
}
