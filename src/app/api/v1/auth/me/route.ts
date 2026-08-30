import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession, toPublicUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();
    return NextResponse.json({ user: toPublicUser(session) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
