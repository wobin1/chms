"use client";

import type { ReactNode } from "react";
import { SearchInput } from "@/components/search-input";

export function ListToolbar({
  search,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  filters,
  actions,
}: {
  search?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  const searchNode =
    search ??
    (searchValue !== undefined && onSearchChange ? (
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        aria-label={searchLabel ?? searchPlaceholder ?? "Search"}
      />
    ) : null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {searchNode}
        {filters}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
