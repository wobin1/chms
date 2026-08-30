import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150 disabled:opacity-60",
  secondary:
    "rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-accent-soft active:scale-[0.98] motion-safe:transition-[transform,background-color] motion-safe:duration-150 disabled:opacity-60",
  ghost:
    "rounded-full px-3 py-2 text-sm font-medium text-text-muted hover:bg-accent-soft hover:text-text active:scale-[0.98] motion-safe:transition-[transform,background-color,color] motion-safe:duration-150 disabled:opacity-60",
  danger:
    "rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-[0.98] motion-safe:transition-[transform,opacity] motion-safe:duration-150 disabled:opacity-60",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    loading?: boolean;
  }
>(function Button(
  {
    className,
    variant = "primary",
    type = "button",
    loading = false,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        variants[variant],
        "inline-flex items-center justify-center gap-2",
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" className="shrink-0" /> : null}
      {children}
    </button>
  );
});
