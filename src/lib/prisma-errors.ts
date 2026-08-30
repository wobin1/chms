import { Prisma } from "@prisma/client";
import { ConflictError } from "./errors";

export function throwIfUniqueConflict(
  error: unknown,
  message: string,
): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ConflictError(message);
  }
  throw error;
}
