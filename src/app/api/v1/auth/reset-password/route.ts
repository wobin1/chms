import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/features/auth/schema";
import { toErrorResponse } from "@/lib/api";
import { resetPassword } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const body = resetPasswordSchema.parse(await req.json());
    await resetPassword(body.token, body.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
