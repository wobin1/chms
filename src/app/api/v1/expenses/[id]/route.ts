import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getExpense } from "@/lib/expense-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const expense = await getExpense(session, id);
    return NextResponse.json(expense);
  } catch (error) {
    return toErrorResponse(error);
  }
}
