"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { TablePagination } from "@/components/table-pagination";
import { cn } from "@/lib/cn";
import { computeStaggerDelay } from "@/lib/stagger-delay";

type TablePaginationConfig = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  emptyTitle: string;
  emptyDescription: string;
  pagination?: TablePaginationConfig;
};

export function DataTable<T>({
  columns,
  data,
  emptyTitle,
  emptyDescription,
  pagination,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const isEmpty = pagination ? pagination.total === 0 : data.length === 0;
  // TanStack Table returns unstable function identities; React Compiler skips this on purpose.
  // eslint-disable-next-line react-hooks/incompatible-library -- table API
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const animationKey = useMemo(
    () =>
      [
        pagination?.page ?? 0,
        pagination?.pageSize ?? rows.length,
        sorting.map((entry) => `${entry.id}:${entry.desc}`).join(","),
      ].join("|"),
    [pagination?.page, pagination?.pageSize, rows.length, sorting],
  );

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-sm">
        <p className="text-lg font-semibold text-text">{emptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="motion-content-in overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-canvas/60">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-semibold text-text">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1",
                        header.column.getCanSort() && "cursor-pointer",
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody key={animationKey}>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className="table-row-enter border-b border-border transition-colors duration-150 last:border-0 hover:bg-canvas/50"
              style={{
                animationDelay: `${computeStaggerDelay(index, rows.length)}ms`,
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-text">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination ? (
        <TablePagination
          total={pagination.total}
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
