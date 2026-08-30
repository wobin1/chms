"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/features/services/labels";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";

type Category = { id: string; name: string };

function todayInputValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export type ExpenseFormValues = {
  categoryId: string;
  amount: string;
  description: string;
  expenseDate: string;
  paymentMethod: string;
  reference: string;
};

export function emptyExpenseForm(): ExpenseFormValues {
  return {
    categoryId: "",
    amount: "",
    description: "",
    expenseDate: todayInputValue(),
    paymentMethod: "Cash",
    reference: "",
  };
}

export function ExpenseForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ExpenseFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  const categories = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/expense-categories?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as Category[] };
      return (await response.json()) as { items: Category[] };
    },
  });

  function update<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select
            id="categoryId"
            value={form.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            required
          >
            <option value="">Select a category</option>
            {(categories.data?.items ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="expenseDate">Date</Label>
          <Input
            id="expenseDate"
            type="date"
            value={form.expenseDate}
            onChange={(e) => update("expenseDate", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="paymentMethod">Method</Label>
          <Input
            id="paymentMethod"
            value={form.paymentMethod}
            onChange={(e) => update("paymentMethod", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            value={form.reference}
            onChange={(e) => update("reference", e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={pending} disabled={pending || !form.categoryId}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
