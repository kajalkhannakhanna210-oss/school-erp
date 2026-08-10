import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { FeesTabs } from "./fees-tabs";

export default async function FeesPage() {
  try {
    await requirePageAccess("fees");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: feeHeads }, { data: classes }, { data: sessions }] = await Promise.all([
    supabase.from("fee_heads").select("id, name, is_active").order("name"),
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Fee Structure</h1>
      <p className="mt-1 text-sm text-slate/60">
        Fee heads, class-wise structure, and late fee rules. No payments are collected here — that&apos;s Phase 6.
      </p>
      <FeesTabs feeHeads={feeHeads ?? []} classes={classes ?? []} sessions={sessions ?? []} />
    </div>
  );
}
