"use client";

import Link from "next/link";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui";

type ProcessingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "default";
};

export function ProcessingLink({
  href,
  children,
  processingLabel = "Processing...",
  ...buttonProps
}: {
  href: string;
  children: ReactNode;
  processingLabel?: string;
} & ProcessingButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <Link href={href} onClick={() => setPending(true)} aria-busy={pending}>
      <Button {...buttonProps} disabled={pending || buttonProps.disabled}>
        {pending ? processingLabel : children}
      </Button>
    </Link>
  );
}
