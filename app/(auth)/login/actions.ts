"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(_state: { error: string }, formData: FormData): Promise<{ error: string }> {
  const email = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) return { error: error?.message ?? "Your session has expired. Please sign in again." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (!profile) { await supabase.auth.signOut(); return { error: "No matching profile was found for this account." }; }
  redirect("/dashboard");
}
