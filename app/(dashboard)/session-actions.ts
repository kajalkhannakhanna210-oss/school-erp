"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setSelectedSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set("selected_session_id", sessionId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function getSelectedSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("selected_session_id")?.value;
}
