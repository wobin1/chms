import { NextRequest, NextResponse } from "next/server";
import { expenseCategorySchema } from "@/features/finance/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import {
  createExpenseCategory,
  listExpenseCategories,
} from "@/lib/expense-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listExpenseCategories(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = expenseCategorySchema.parse(await req.json());
    const category = await createExpenseCategory(session, body);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
