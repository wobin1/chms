"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  emptyExpenseForm,
  ExpenseForm,
} from "@/features/expenses/components/expense-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewExpensePage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptyExpenseForm>) => {
      const response = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId: values.categoryId,
          amount: values.amount,
          description: values.description,
          expenseDate: values.expenseDate,
          paymentMethod: values.paymentMethod,
          reference: values.reference || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to record expense"));
      }
    },
    onSuccess: () => {
      toast("success", "Expense recorded.");
      router.push("/expenses");
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/expenses">Back to expenses</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Record expense</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Record expenses for this church only.
        </p>
      </div>
      <ExpenseForm
        initial={emptyExpenseForm()}
        pending={create.isPending}
        submitLabel="Record expense"
        onCancel={() => router.push("/expenses")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
