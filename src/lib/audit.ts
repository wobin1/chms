import "server-only";
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

type AuditInput = {
  churchId: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

export async function writeAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      churchId: input.churchId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldData: input.oldData,
      newData: input.newData,
      ipAddress: input.ipAddress,
    },
  });
}
