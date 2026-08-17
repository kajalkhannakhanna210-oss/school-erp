"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export function SubmitExitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="primary"
      disabled={pending}
      className="px-6 gap-2 bg-ink-900 hover:bg-ink-800 text-gold-400 disabled:opacity-75 disabled:cursor-not-allowed transition-all"
    >
      {pending ? (
        <>
          <svg
            className="animate-spin h-4 w-4 text-gold-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        <span>Submit Exit Request &rarr;</span>
      )}
    </Button>
  );
}
