import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { writeAuditLog } from "./audit";
import {
  UnauthorizedError,
  ValidationError,
} from "./errors";
import { logger } from "./logger";
import { appBaseUrl, sendPasswordResetEmail } from "./mail";
import {
  createResetToken,
  hashPassword,
  hashResetToken,
  verifyPassword,
  verifyPasswordAgainstUnknownUser,
} from "./password";
import type { PublicUser, SessionClaims } from "./auth-types";

const MIN_PASSWORD_LENGTH = 10;
const RESET_TTL_MS = 60 * 60 * 1000;

type UserWithAccess = {
  id: string;
  name: string;
  churchId: string | null;
  passwordHash: string;
  status: "ACTIVE" | "DISABLED";
  church: { id: string; name: string; status: "ACTIVE" | "SUSPENDED" } | null;
  userRoles: {
    role: {
      name: string;
      rolePermissions: { permission: { name: string } }[];
    };
  }[];
};

function toPublicUser(user: UserWithAccess): PublicUser {
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((row) =>
        row.role.rolePermissions.map((item) => item.permission.name),
      ),
    ),
  ];
  const roleLabel = user.userRoles[0]?.role.name ?? "User";
  const isPlatformAdmin = user.churchId === null;

  return {
    id: user.id,
    name: user.name,
    churchId: user.churchId,
    churchName: user.church?.name ?? null,
    roleLabel,
    permissions,
    isPlatformAdmin,
  };
}

function assertCanSignIn(user: UserWithAccess) {
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedError("Invalid email or password");
  }
  if (user.church?.status === "SUSPENDED") {
    throw new UnauthorizedError("Invalid email or password");
  }
}

const userAccessInclude = {
  church: { select: { id: true, name: true, status: true } },
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} as const;

export async function authenticate(email: string, password: string) {
  const user = (await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: userAccessInclude,
  })) as UserWithAccess | null;

  if (!user) {
    await verifyPasswordAgainstUnknownUser(password);
    throw new UnauthorizedError("Invalid email or password");
  }

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  assertCanSignIn(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const publicUser = toPublicUser(user);
  const session: SessionClaims = {
    userId: user.id,
    churchId: user.churchId,
  };

  logger.info("auth.login", { userId: user.id, churchId: user.churchId });

  return { session, user: publicUser };
}

export async function loadUserAccess(userId: string): Promise<UserWithAccess | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    include: userAccessInclude,
  }) as Promise<UserWithAccess | null>;
}

export function publicUserFromAccess(user: UserWithAccess): PublicUser {
  return toPublicUser(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError("Password must be at least 10 characters");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError();
  }

  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await writeAuditLog({
    churchId: user.churchId,
    userId: user.id,
    action: "password.change",
    entityType: "user",
    entityId: user.id,
  });
}

export type PasswordResetRequestResult = {
  ok: true;
  emailSent?: boolean;
  delivery?: "sandbox" | "sending";
  token?: string;
};

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetRequestResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || user.status !== "ACTIVE") {
    return { ok: true };
  }

  const token = createResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  logger.info("auth.password_reset_requested", { userId: user.id });

  const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
  let mailSent = false;
  let delivery: "sandbox" | "sending" | undefined;
  try {
    const mail = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });
    mailSent = mail.sent;
    if (mail.sent) {
      delivery = mail.delivery;
    }
  } catch {
    logger.error("auth.password_reset_email_failed", { userId: user.id });
  }

  // Production sending: never return the raw token.
  // Sandbox / local: return token so QA can reset without opening Mailtrap.
  const hideToken =
    process.env.NODE_ENV === "production" && delivery !== "sandbox";

  return {
    ok: true,
    emailSent: mailSent,
    delivery,
    ...(hideToken ? {} : { token }),
  };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError("Password must be at least 10 characters");
  }

  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    throw new ValidationError("This reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  await writeAuditLog({
    churchId: null,
    userId: record.userId,
    action: "password.reset",
    entityType: "user",
    entityId: record.userId,
  });
}

export function newRequestId() {
  return randomBytes(8).toString("hex");
}
