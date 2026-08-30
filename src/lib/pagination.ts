export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
export const LOOKUP_PAGE_SIZE = 100;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListFilters = {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: string;
};

export function resolvePagination(filters: ListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const raw = Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE);
  const pageSize =
    raw <= MAX_PAGE_SIZE
      ? Math.min(MAX_PAGE_SIZE, raw)
      : Math.min(LOOKUP_PAGE_SIZE, raw);
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function parseListParams(searchParams: URLSearchParams) {
  const q = searchParams.get("q")?.trim();
  return {
    q: q || undefined,
    ...resolvePagination({
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)),
    }),
  };
}

export function buildListSearchParams(filters: ListFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? DEFAULT_PAGE_SIZE));
  return params.toString();
}
