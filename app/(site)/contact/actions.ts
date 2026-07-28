"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitContactMessage(input: { name: string; email: string; phone: string; message: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    message: input.message,
  });
  return { error: error?.message ?? null };
}
