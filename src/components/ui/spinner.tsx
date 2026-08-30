import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type SpinnerProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const sizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function Spinner({ className, size = "md", label = "Loading" }: SpinnerProps) {
  return (
    <LoaderCircle
      className={cn("animate-spin", sizes[size], className)}
      aria-label={label}
      role="status"
    />
  );
}
