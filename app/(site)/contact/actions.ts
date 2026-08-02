"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitContactMessage(input: { name: string; email: string; phone: string; message: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim();
  if (name.length < 2) return { error: "Please enter your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (message.length < 10) return { error: "Your message should be at least 10 characters." };
  const phone = input.phone.replace(/\D/g, "");
  if (input.phone && phone.length !== 10) return { error: "Please enter a valid 10-digit phone number." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("contact_messages").insert({
      name,
      email,
      phone: phone || null,
      message,
    });
    return { error: error?.message ?? null };
  } catch {
    return { error: "We could not connect to the school server. Please try again in a moment." };
  }
}
