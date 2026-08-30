import { NextRequest, NextResponse } from "next/server";
import {
  memberWriteSchema,
  parseOptionalDate,
} from "@/features/members/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { createMember, listMembers } from "@/lib/member-service";
import { parseListParams } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const url = req.nextUrl;
    const pagination = parseListParams(url.searchParams);
    const result = await listMembers(session, {
      q: url.searchParams.get("q") ?? undefined,
      zoneId: url.searchParams.get("zoneId") ?? undefined,
      statusId: url.searchParams.get("statusId") ?? undefined,
      departmentId: url.searchParams.get("departmentId") ?? undefined,
      ministryId: url.searchParams.get("ministryId") ?? undefined,
      includeDeleted: url.searchParams.get("includeDeleted") === "true",
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = memberWriteSchema.parse(await req.json());
    const member = await createMember(session, {
      ...body,
      email: body.email || null,
      dateOfBirth: parseOptionalDate(body.dateOfBirth ?? null),
      dateJoined: parseOptionalDate(body.dateJoined ?? null),
    });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
