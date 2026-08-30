import { SignJWT, jwtVerify } from "jose";
import type { SessionClaims } from "./auth-types";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secretKey() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(
  claims: SessionClaims,
): Promise<string> {
  return new SignJWT({
    userId: claims.userId,
    churchId: claims.churchId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "string") {
      return null;
    }
    const churchId =
      payload.churchId === null || payload.churchId === undefined
        ? null
        : String(payload.churchId);
    return { userId: payload.userId, churchId };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "chms_session";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}
