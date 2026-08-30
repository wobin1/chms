import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { expenseWriteSchema } from "@/features/finance/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createExpense, listExpenses } from "@/lib/expense-service";
import { ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listExpenses(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = expenseWriteSchema.parse(await req.json());
    const expenseDate = parseOptionalDate(body.expenseDate);
    if (!expenseDate) {
      throw new ValidationError("Expense date is required");
    }
    const expense = await createExpense(session, {
      ...body,
      expenseDate,
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
