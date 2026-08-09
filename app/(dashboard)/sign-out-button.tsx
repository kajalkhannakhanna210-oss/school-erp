"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleSignOut} title="Sign out" className={`mt-0 h-10 justify-center rounded-lg border border-gold/60 bg-transparent text-white shadow-none hover:bg-gold/10 hover:text-white ${collapsed ? "w-10 p-0" : "w-auto px-3"}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-gold" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 5h6v14h-6" /><path d="M3 12h10" /><path d="m9 8 4 4-4 4" /></svg>
      {!collapsed && <span className="ml-2">Logout</span>}
    </Button>
  );
}
