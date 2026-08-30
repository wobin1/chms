import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError } from "./errors";
import { logger } from "./logger";
import { captureException } from "./monitoring";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten() },
      { status: 400 },
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  logger.error("unhandled", {
    error: error instanceof Error ? error.message : "unknown",
  });
  void captureException(error, { event: "unhandled" });
  return NextResponse.json(
    { error: "Something went wrong" },
    { status: 500 },
  );
}
