"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const auditId = window.localStorage.getItem("school_erp_login_audit_id");
      if (auditId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from("login_audit").update({ logout_at: new Date().toISOString() }).eq("id", auditId).eq("user_id", user.id);
        window.localStorage.removeItem("school_erp_login_audit_id");
      }
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setShowConfirm(true)} title="Sign out" className={`h-auto w-auto justify-center rounded-full border-0 bg-transparent p-1.5 text-white shadow-none hover:bg-transparent transition`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3m7-5l5-5m0 0l-5-5m5 5H9" />
        </svg>
      </Button>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm Logout"
        description="Are you sure you want to log out from the admin panel? You will need to log in again to access your account."
        confirmLabel="Logout"
        isLoading={isLoading}
        onConfirm={() => {
          if (!isLoading) {
            handleSignOut();
          }
        }}
        onCancel={() => {
          if (!isLoading) {
            setShowConfirm(false);
          }
        }}
      />
    </>
  );
}
