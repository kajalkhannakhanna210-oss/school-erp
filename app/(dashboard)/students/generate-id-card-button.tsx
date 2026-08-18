"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { generateStudentIdCards } from "./id-cards/actions";

interface GenerateIdCardButtonProps {
  studentId: string;
  sessionId: string;
  admissionNumber?: string | null;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
}

export function GenerateIdCardButton({
  studentId,
  sessionId,
  admissionNumber,
  variant = "outline",
  size = "sm",
  className = "",
}: GenerateIdCardButtonProps) {
  const { push } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!admissionNumber) {
    return null;
  }

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateStudentIdCards({
        student_ids: [studentId],
        session_id: sessionId,
      });

      if (res.error) {
        push(res.error, "error");
      } else {
        push("ID Card generated! Redirecting to ID Cards module...");
        router.push(`/students/id-cards?search=${encodeURIComponent(admissionNumber!)}`);
      }
    });
  }

  return (
    <Button
      variant={variant}
      onClick={handleGenerate}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span>🖤</span> {isPending ? "Generating..." : "Generate ID Card"}
    </Button>
  );
}
