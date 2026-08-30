import { NextRequest, NextResponse } from "next/server";
import { patchUserSchema } from "@/features/users/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getChurchUser, updateChurchUser } from "@/lib/user-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const user = await getChurchUser(session, id);
    return NextResponse.json(user);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = patchUserSchema.parse(await req.json());
    const user = await updateChurchUser(session, id, body);
    return NextResponse.json(user);
  } catch (error) {
    return toErrorResponse(error);
  }
}
