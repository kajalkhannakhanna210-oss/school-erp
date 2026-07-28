"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { updatePassword } from "./actions";

export function ChangePasswordForm() {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await updatePassword(password);
      if (error) {
        push(error, "error");
        return;
      }
      push("Password updated");
      setPassword("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Update password
      </Button>
    </form>
  );
}
