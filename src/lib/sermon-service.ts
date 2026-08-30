import "server-only";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const sermonInclude = {
  service: { select: { id: true, name: true, serviceDate: true } },
} as const;

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listSermons(session: AuthContext, filters: ListFilters = {}) {
  requirePermission(session, "sermons:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { preacher: { contains: filters.q, mode: "insensitive" as const } },
            { scripture: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.sermon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: sermonInclude,
      skip,
      take,
    }),
    prisma.sermon.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getSermon(session: AuthContext, sermonId: string) {
  requirePermission(session, "sermons:read");
  const churchId = requireChurch(session);
  const sermon = await prisma.sermon.findFirst({
    where: tenantWhere(churchId, { id: sermonId }),
    include: sermonInclude,
  });
  if (!sermon) {
    throw new NotFoundError();
  }
  return sermon;
}

async function requireServiceInChurch(churchId: string, serviceId: string) {
  const service = await prisma.service.findFirst({
    where: tenantWhere(churchId, { id: serviceId }),
  });
  if (!service) {
    throw new NotFoundError();
  }
  return service;
}

export async function createSermon(
  session: AuthContext,
  input: {
    serviceId: string;
    title: string;
    preacher: string;
    scripture?: string | null;
    summary?: string | null;
    audioUrl?: string | null;
    videoUrl?: string | null;
    documentUrl?: string | null;
  },
) {
  requirePermission(session, "sermons:manage");
  const churchId = requireChurch(session);
  const service = await requireServiceInChurch(churchId, input.serviceId);
  const sermon = await prisma.sermon.create({
    data: {
      churchId,
      serviceId: service.id,
      title: input.title.trim(),
      preacher: input.preacher.trim(),
      scripture: emptyToNull(input.scripture),
      summary: emptyToNull(input.summary),
      audioUrl: emptyToNull(input.audioUrl),
      videoUrl: emptyToNull(input.videoUrl),
      documentUrl: emptyToNull(input.documentUrl),
    },
    include: sermonInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "sermon.create",
    entityType: "sermon",
    entityId: sermon.id,
    newData: { title: sermon.title },
  });
  return sermon;
}

export async function updateSermon(
  session: AuthContext,
  sermonId: string,
  input: {
    serviceId?: string;
    title?: string;
    preacher?: string;
    scripture?: string | null;
    summary?: string | null;
    audioUrl?: string | null;
    videoUrl?: string | null;
    documentUrl?: string | null;
  },
) {
  requirePermission(session, "sermons:manage");
  const existing = await getSermon(session, sermonId);
  let serviceId = existing.serviceId;
  if (input.serviceId) {
    const service = await requireServiceInChurch(existing.churchId, input.serviceId);
    serviceId = service.id;
  }
  const sermon = await prisma.sermon.update({
    where: { id: existing.id },
    data: {
      serviceId,
      title: input.title?.trim(),
      preacher: input.preacher?.trim(),
      scripture:
        input.scripture === undefined ? undefined : emptyToNull(input.scripture),
      summary:
        input.summary === undefined ? undefined : emptyToNull(input.summary),
      audioUrl:
        input.audioUrl === undefined ? undefined : emptyToNull(input.audioUrl),
      videoUrl:
        input.videoUrl === undefined ? undefined : emptyToNull(input.videoUrl),
      documentUrl:
        input.documentUrl === undefined
          ? undefined
          : emptyToNull(input.documentUrl),
    },
    include: sermonInclude,
  });
  await writeAuditLog({
    churchId: existing.churchId,
    userId: session.userId,
    action: "sermon.update",
    entityType: "sermon",
    entityId: sermon.id,
  });
  return sermon;
}
