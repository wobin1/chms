import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/features/auth/schema";
import { toErrorResponse } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const body = forgotPasswordSchema.parse(await req.json());
    const result = await requestPasswordReset(body.email);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
