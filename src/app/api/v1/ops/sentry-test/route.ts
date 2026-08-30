import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { captureException } from "@/lib/monitoring";
import { requirePermission } from "@/lib/permissions";

/** Super Admin only: fires a test exception into optional Sentry. */
export async function POST() {
  try {
    const session = await requireSession();
    requirePermission(session, "churches:manage");
    const error = new Error("CHMS Sentry test error");
    await captureException(error, {
      event: "ops.sentry_test",
      userId: session.userId,
    });
    return NextResponse.json({
      ok: true,
      sentryConfigured: Boolean(process.env.SENTRY_DSN?.trim()),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
