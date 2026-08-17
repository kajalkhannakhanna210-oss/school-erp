import { cn } from "@/lib/utils";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
} from "react";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline"; size?: "sm" | "default" }
>(({ className, variant = "primary", size = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg font-semibold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-ink-100 disabled:pointer-events-none disabled:opacity-50",
      size === "default" && "min-h-10 px-4 py-2 text-sm",
      size === "sm" && "min-h-8 px-2.5 py-1.5 text-xs",
      variant === "primary" && "bg-ink-700 text-white hover:-translate-y-px hover:bg-ink-600 hover:shadow",
      variant === "ghost" && "bg-transparent text-ink-700 hover:bg-ink-50",
      variant === "outline" && "border border-ink-100 bg-white text-ink-700 hover:bg-ink-50",
      variant === "danger" && "bg-danger text-paper hover:bg-danger/90",
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm text-slate shadow-sm transition placeholder:text-slate/40 focus:border-ink-600 focus:outline-none focus:ring-4 focus:ring-ink-50 disabled:cursor-not-allowed disabled:bg-ink-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-semibold uppercase tracking-wider text-slate/70", className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-ink-100/80 bg-white p-4 shadow-[0_2px_10px_rgba(30,42,74,0.05)] sm:p-6", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "outline" | "destructive" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variant === "default" && "bg-gold-100 text-gold-700",
        variant === "secondary" && "bg-ink-100 text-ink-700",
        variant === "outline" && "border border-ink-200 text-ink-600 bg-white",
        variant === "destructive" && "bg-rose-100 text-rose-700",
        className
      )}
      {...props}
    />
  );
}
