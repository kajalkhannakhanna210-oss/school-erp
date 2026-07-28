"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
