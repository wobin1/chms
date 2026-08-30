import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const COST = process.env.VITEST ? 4 : 12;

/** Used only to keep missing-user login timing closer to a real compare. */
const DUMMY_HASH =
  "$2b$12$KixqQq0nQq0nQq0nQq0nQeQq0nQq0nQq0nQq0nQq0nQq0nQq0nQq";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

export async function verifyPasswordAgainstUnknownUser(
  plain: string,
): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}

export function createResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}
