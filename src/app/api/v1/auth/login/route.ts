import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginSchema } from "@/features/auth/schema";
import { toErrorResponse } from "@/lib/api";
import { authenticate } from "@/lib/auth-service";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const result = await authenticate(body.email, body.password);
    const token = await createSessionToken(result.session);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());
    return NextResponse.json({ user: result.user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
