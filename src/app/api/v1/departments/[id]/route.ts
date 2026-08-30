import { NextRequest, NextResponse } from "next/server";
import { updateDepartmentSchema } from "@/features/departments/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getDepartment, updateDepartment } from "@/lib/department-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const department = await getDepartment(session, id);
    return NextResponse.json(department);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = updateDepartmentSchema.parse(await req.json());
    const department = await updateDepartment(session, id, body);
    return NextResponse.json(department);
  } catch (error) {
    return toErrorResponse(error);
  }
}
