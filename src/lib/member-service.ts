import "server-only";
import type { MemberGender, Prisma } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError, ValidationError } from "./errors";
import { prisma } from "./db";
import { assertZoneBelongsToChurch } from "./member-rules";
import { requirePermission } from "./permissions";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch, tenantWhere } from "./tenant";
import { DEFAULT_PAGE_SIZE } from "./pagination";
import { constrainZoneFilter, getVisibleMemberFilter } from "./zone-scope";
import { listAssignedZoneIds } from "./zone-service";

export type MemberWriteInput = {
  membershipNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: MemberGender;
  dateOfBirth?: Date | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
  dateJoined?: Date | null;
  membershipStatusId: string;
  zoneId?: string | null;
  photoUrl?: string | null;
  photoPublicId?: string | null;
  notes?: string | null;
};

const memberInclude = {
  zone: { select: { id: true, name: true, status: true } },
  membershipStatus: { select: { id: true, name: true } },
  familyMembers: {
    include: { family: { select: { id: true, name: true } } },
  },
  departments: {
    include: { department: { select: { id: true, name: true } } },
  },
  ministries: {
    include: { ministry: { select: { id: true, name: true } } },
  },
} satisfies Prisma.MemberInclude;

async function memberScope(session: AuthContext) {
  const churchId = requireChurch(session);
  const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
  return getVisibleMemberFilter({
    churchId,
    permissions: session.permissions,
    assignedZoneIds,
  });
}

async function assertStatusAndZone(
  churchId: string,
  input: Pick<MemberWriteInput, "membershipStatusId" | "zoneId">,
) {
  const status = await prisma.membershipStatus.findFirst({
    where: tenantWhere(churchId, { id: input.membershipStatusId }),
  });
  if (!status) {
    throw new ValidationError("Membership status is not valid for this church");
  }
  if (input.zoneId) {
    const zone = await prisma.zone.findUnique({
      where: { id: input.zoneId },
      select: { id: true, churchId: true },
    });
    assertZoneBelongsToChurch(zone, churchId);
  }
}

export async function listMembers(
  session: AuthContext,
  filters: {
    q?: string;
    zoneId?: string;
    statusId?: string;
    departmentId?: string;
    ministryId?: string;
    includeDeleted?: boolean;
    page?: number;
    pageSize?: number;
  },
) {
  requirePermission(session, "members:read");
  const churchId = requireChurch(session);
  const scope = constrainZoneFilter(
    await memberScope(session),
    filters.zoneId || undefined,
  );
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const where: Prisma.MemberWhereInput = {
    ...scope,
    ...(filters.includeDeleted && session.permissions.includes("members:manage")
      ? { deletedAt: undefined }
      : {}),
    ...(filters.statusId ? { membershipStatusId: filters.statusId } : {}),
    ...(filters.departmentId
      ? { departments: { some: { departmentId: filters.departmentId } } }
      : {}),
    ...(filters.ministryId
      ? { ministries: { some: { ministryId: filters.ministryId } } }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { firstName: { contains: filters.q, mode: "insensitive" } },
            { lastName: { contains: filters.q, mode: "insensitive" } },
            { membershipNumber: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (filters.includeDeleted && session.permissions.includes("members:manage")) {
    delete (where as { deletedAt?: unknown }).deletedAt;
  }

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: memberInclude,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.member.count({ where }),
  ]);

  return { items, total, page, pageSize, churchId };
}

function csvCell(value: string | null | undefined) {
  const text = value ?? "";
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

export async function exportMembersCsv(session: AuthContext) {
  requirePermission(session, "members:export");
  const scope = await memberScope(session);
  const members = await prisma.member.findMany({
    where: scope,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      membershipNumber: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      zone: { select: { name: true } },
      membershipStatus: { select: { name: true } },
    },
  });
  const header = [
    "Membership number",
    "Last name",
    "First name",
    "Phone",
    "Email",
    "Zone",
    "Status",
  ];
  const rows = members.map((member) =>
    [
      csvCell(member.membershipNumber),
      csvCell(member.lastName),
      csvCell(member.firstName),
      csvCell(member.phone),
      csvCell(member.email),
      csvCell(member.zone?.name ?? "Unassigned"),
      csvCell(member.membershipStatus.name),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export async function getMember(session: AuthContext, memberId: string) {
  requirePermission(session, "members:read");
  const churchId = requireChurch(session);
  const scope = await memberScope(session);
  const where = session.permissions.includes("members:manage")
    ? { churchId, id: memberId }
    : { ...scope, id: memberId };
  const member = await prisma.member.findFirst({
    where,
    include: memberInclude,
  });
  if (!member) {
    throw new NotFoundError();
  }
  return member;
}

export async function createMember(
  session: AuthContext,
  input: MemberWriteInput,
) {
  requirePermission(session, "members:manage");
  const churchId = requireChurch(session);
  await assertStatusAndZone(churchId, input);
  try {
    const member = await prisma.member.create({
      data: {
        churchId,
        membershipNumber: input.membershipNumber.trim(),
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        lastName: input.lastName.trim(),
        gender: input.gender ?? "UNSPECIFIED",
        dateOfBirth: input.dateOfBirth,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        state: input.state,
        occupation: input.occupation,
        maritalStatus: input.maritalStatus,
        dateJoined: input.dateJoined,
        membershipStatusId: input.membershipStatusId,
        zoneId: input.zoneId ?? null,
        photoUrl: input.photoUrl,
        photoPublicId: input.photoPublicId,
        notes: input.notes,
      },
      include: memberInclude,
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "member.create",
      entityType: "member",
      entityId: member.id,
      newData: {
        membershipNumber: member.membershipNumber,
        zoneId: member.zoneId,
      },
    });
    return member;
  } catch (error) {
    throwIfUniqueConflict(
      error,
      "A member with that membership number already exists in this church",
    );
  }
}

export async function updateMember(
  session: AuthContext,
  memberId: string,
  input: Partial<MemberWriteInput>,
) {
  requirePermission(session, "members:manage");
  const churchId = requireChurch(session);
  const existing = await prisma.member.findFirst({
    where: tenantWhere(churchId, { id: memberId }),
  });
  if (!existing) {
    throw new NotFoundError();
  }
  if (input.membershipStatusId || input.zoneId !== undefined) {
    await assertStatusAndZone(churchId, {
      membershipStatusId: input.membershipStatusId ?? existing.membershipStatusId,
      zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId,
    });
  }
  try {
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        membershipNumber: input.membershipNumber?.trim(),
        firstName: input.firstName?.trim(),
        middleName:
          input.middleName === undefined
            ? undefined
            : input.middleName?.trim() || null,
        lastName: input.lastName?.trim(),
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        state: input.state,
        occupation: input.occupation,
        maritalStatus: input.maritalStatus,
        dateJoined: input.dateJoined,
        membershipStatusId: input.membershipStatusId,
        zoneId: input.zoneId,
        photoUrl: input.photoUrl,
        photoPublicId: input.photoPublicId,
        notes: input.notes,
      },
      include: memberInclude,
    });
    if (existing.zoneId !== member.zoneId) {
      await writeAuditLog({
        churchId,
        userId: session.userId,
        action: "member.zone_change",
        entityType: "member",
        entityId: member.id,
        oldData: { zoneId: existing.zoneId },
        newData: { zoneId: member.zoneId },
      });
    }
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "member.update",
      entityType: "member",
      entityId: member.id,
    });
    return member;
  } catch (error) {
    throwIfUniqueConflict(
      error,
      "A member with that membership number already exists in this church",
    );
  }
}

export async function softDeleteMember(session: AuthContext, memberId: string) {
  requirePermission(session, "members:manage");
  const churchId = requireChurch(session);
  const existing = await prisma.member.findFirst({
    where: tenantWhere(churchId, { id: memberId, deletedAt: null }),
  });
  if (!existing) {
    throw new NotFoundError();
  }
  const member = await prisma.member.update({
    where: { id: memberId },
    data: { deletedAt: new Date() },
    include: memberInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "member.deactivate",
    entityType: "member",
    entityId: memberId,
  });
  return member;
}

export async function restoreMember(session: AuthContext, memberId: string) {
  requirePermission(session, "members:manage");
  const churchId = requireChurch(session);
  const existing = await prisma.member.findFirst({
    where: tenantWhere(churchId, { id: memberId }),
  });
  if (!existing) {
    throw new NotFoundError();
  }
  const member = await prisma.member.update({
    where: { id: memberId },
    data: { deletedAt: null },
    include: memberInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "member.restore",
    entityType: "member",
    entityId: memberId,
  });
  return member;
}

export async function listMembershipStatuses(session: AuthContext) {
  const churchId = requireChurch(session);
  return prisma.membershipStatus.findMany({
    where: tenantWhere(churchId),
    orderBy: { sortOrder: "asc" },
  });
}

export async function listZoneMembers(session: AuthContext, zoneId: string) {
  requirePermission(session, "members:read");
  const churchId = requireChurch(session);
  const zone = await prisma.zone.findFirst({
    where: tenantWhere(churchId, { id: zoneId }),
  });
  if (!zone) {
    throw new NotFoundError();
  }
  if (!session.permissions.includes("zones:manage")) {
    const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
    if (!assignedZoneIds.includes(zoneId)) {
      throw new NotFoundError();
    }
  }
  return listMembers(session, { zoneId, pageSize: 50 });
}
