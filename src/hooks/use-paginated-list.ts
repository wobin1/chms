"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "@/lib/pagination";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function usePaginatedList<T>({
  queryKey,
  url,
  initialPageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
  extraParams,
}: {
  queryKey: string[];
  url: string;
  initialPageSize?: number;
  enabled?: boolean;
  extraParams?: Record<string, string | boolean | undefined>;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const debouncedQ = useDebouncedValue(q, 300);
  const extraKey = JSON.stringify(extraParams ?? {});

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, pageSize, extraKey]);

  const query = useQuery({
    queryKey: [...queryKey, debouncedQ, page, pageSize, extraKey],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (extraParams) {
        for (const [key, value] of Object.entries(extraParams)) {
          if (value === undefined || value === "" || value === false) continue;
          params.set(key, String(value));
        }
      }
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as PaginatedResult<T>;
    },
  });

  return {
    q,
    setQ,
    page,
    setPage,
    pageSize,
    setPageSize,
    debouncedQ,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    ...query,
  };
}
