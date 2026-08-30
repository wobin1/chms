import { NextRequest, NextResponse } from "next/server";
import { changePasswordSchema } from "@/features/auth/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { changePassword } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = changePasswordSchema.parse(await req.json());
    await changePassword(
      session.userId,
      body.currentPassword,
      body.newPassword,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
