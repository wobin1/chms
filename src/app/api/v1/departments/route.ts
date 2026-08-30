import { NextRequest, NextResponse } from "next/server";
import { departmentSchema } from "@/features/departments/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createDepartment, listDepartments } from "@/lib/department-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listDepartments(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = departmentSchema.parse(await req.json());
    const department = await createDepartment(session, body);
    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
