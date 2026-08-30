"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Chip, ListPageHeader, SectionCard } from "@/components/detail/layout";
import { FormDialog } from "@/components/form-dialog";
import { ListToolbar } from "@/components/list-toolbar";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { formatDisplayDate, formatMoney, readApiError } from "@/lib/ui";

type Category = { id: string; name: string };
type ExpenseRow = {
  id: string;
  amount: string;
  description: string;
  expenseDate: string;
  paymentMethod: string;
  category: { name: string };
};

export default function ExpensesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("finance:manage") ?? false;

  const categories = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/expense-categories?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as { items: Category[] };
    },
  });
  const expenses = usePaginatedList<ExpenseRow>({
    queryKey: ["expenses"],
    url: "/api/v1/expenses",
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/expense-categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to add expense category"),
        );
      }
    },
    onSuccess: () => {
      setCategoryName("");
      setCategoryError(null);
      setCategoryDialogOpen(false);
      toast("success", "Expense category added for this church.");
      void queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (err) => {
      setCategoryError(err.message);
      toast("error", err.message);
    },
  });

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => formatDisplayDate(row.original.expenseDate),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => row.original.category.name,
      },
      { accessorKey: "description", header: "Description" },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => formatMoney(row.original.amount),
      },
      { accessorKey: "paymentMethod", header: "Method" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Expenses"
        description="Expense records for this church."
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCategoryDialogOpen(true)}
              >
                Add category
              </Button>
              <Link href="/expenses/new">
                <Button>+ Record expense</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {canManage ? (
        <SectionCard
          title="Expense categories"
          description="Categories belong to this church only."
        >
          <div className="flex flex-wrap gap-2">
            {(categories.data?.items ?? []).length === 0 ? (
              <p className="text-sm text-text-muted">No categories yet.</p>
            ) : (
              (categories.data?.items ?? []).map((category) => (
                <Chip key={category.id}>{category.name}</Chip>
              ))
            )}
          </div>
        </SectionCard>
      ) : null}

      <ListToolbar
        searchValue={expenses.q}
        onSearchChange={expenses.setQ}
        searchPlaceholder="Search category or description"
        searchLabel="Search expenses"
      />
      <QueryState
        isLoading={expenses.isLoading}
        isError={expenses.isError}
        isFetching={expenses.isFetching && !expenses.isLoading}
      >
        <DataTable
          columns={columns}
          data={expenses.items}
          emptyTitle="No expenses recorded"
          emptyDescription="Record expenses for this church only."
          pagination={{
            total: expenses.total,
            page: expenses.page,
            pageSize: expenses.pageSize,
            onPageChange: expenses.setPage,
            onPageSizeChange: expenses.setPageSize,
          }}
        />
      </QueryState>

      {canManage ? (
        <FormDialog
          title="Add expense category"
          description="Choose a label such as Utilities or Maintenance."
          open={categoryDialogOpen}
          pending={createCategory.isPending}
          submitLabel="Add category"
          onCancel={() => {
            if (createCategory.isPending) return;
            setCategoryDialogOpen(false);
            setCategoryName("");
            setCategoryError(null);
          }}
          onSubmit={() => createCategory.mutate()}
        >
          <div>
            <Label htmlFor="categoryName">Category name</Label>
            <Input
              id="categoryName"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Utilities, Maintenance"
              required
              autoFocus
            />
            {categoryError ? (
              <p className="mt-2 text-sm text-danger" role="alert">
                {categoryError}
              </p>
            ) : null}
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
