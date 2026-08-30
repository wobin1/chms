import { NextRequest, NextResponse } from "next/server";
import { createUserSchema } from "@/features/users/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createChurchUser, listChurchUsers } from "@/lib/user-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listChurchUsers(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = createUserSchema.parse(await req.json());
    const user = await createChurchUser(session, {
      ...body,
      memberId: body.memberId ?? null,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
