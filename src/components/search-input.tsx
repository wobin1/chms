"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  variant?: "list" | "header";
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  "aria-label": ariaLabel = "Search",
  className,
  variant = "list",
}: SearchInputProps) {
  return (
    <label
      className={cn(
        "relative block w-full max-w-xs sm:max-w-sm",
        variant === "header" && "max-w-md",
        className,
      )}
    >
      <span className="sr-only">{ariaLabel}</span>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "w-full border border-border bg-canvas pr-3 pl-9 text-sm text-text placeholder:text-text-muted",
          variant === "header"
            ? "h-11 rounded-full"
            : "h-10 rounded-xl",
        )}
      />
    </label>
  );
}
