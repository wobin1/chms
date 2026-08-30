import { NextRequest, NextResponse } from "next/server";
import { rolePermissionsSchema } from "@/features/users/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getChurchRole, updateChurchRolePermissions } from "@/lib/user-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const role = await getChurchRole(session, id);
    return NextResponse.json(role);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = rolePermissionsSchema.parse(await req.json());
    const role = await updateChurchRolePermissions(
      session,
      id,
      body.permissions,
    );
    return NextResponse.json(role);
  } catch (error) {
    return toErrorResponse(error);
  }
}
