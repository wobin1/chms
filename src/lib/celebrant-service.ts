import "server-only";
import type { AuthContext } from "./auth-types";
import { NotFoundError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { requireChurch } from "./tenant";
import { getVisibleMemberFilter } from "./zone-scope";
import { listAssignedZoneIds } from "./zone-service";
import {
  ageOnBirthday,
  birthdayFallsInPeriod,
  birthdayListSocialCaption,
  birthdaySocialCaption,
  periodRangeUtc,
  toIsoDate,
  todayUtcIso,
  type CelebrantPeriod,
} from "./celebrant-rules";

export async function listCelebrants(
  session: AuthContext,
  filters: { period?: CelebrantPeriod; on?: string } = {},
) {
  requirePermission(session, "members:read");
  const churchId = requireChurch(session);
  const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
  const scope = getVisibleMemberFilter({
    churchId,
    permissions: session.permissions,
    assignedZoneIds,
  });
  const period = filters.period ?? "month";
  const on = filters.on ?? todayUtcIso();
  const reference = new Date(`${on}T00:00:00.000Z`);
  const range = periodRangeUtc(period, reference);

  const [church, members] = await Promise.all([
    prisma.church.findUnique({
      where: { id: churchId },
      select: { name: true },
    }),
    prisma.member.findMany({
      where: {
        ...scope,
        dateOfBirth: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        photoUrl: true,
        zone: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (!church) {
    throw new NotFoundError();
  }

  const items = members
    .filter((member) => member.dateOfBirth)
    .filter((member) =>
      birthdayFallsInPeriod(member.dateOfBirth!, period, reference),
    )
    .map((member) => {
      const dateOfBirth = member.dateOfBirth!;
      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: toIsoDate(dateOfBirth),
        age: ageOnBirthday(dateOfBirth, reference),
        photoUrl: member.photoUrl,
        zone: member.zone,
        socialCaption: birthdaySocialCaption({
          firstName: member.firstName,
          lastName: member.lastName,
          zoneName: member.zone?.name,
          churchName: church.name,
        }),
      };
    })
    .sort((a, b) => {
      const byDate = a.dateOfBirth.slice(5).localeCompare(b.dateOfBirth.slice(5));
      if (byDate !== 0) return byDate;
      return `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
      );
    });

  return {
    period,
    on,
    from: toIsoDate(range.from),
    to: toIsoDate(range.to),
    churchName: church.name,
    listCaption: birthdayListSocialCaption({
      churchName: church.name,
      period,
      reference,
      names: items.map((row) => `${row.firstName} ${row.lastName}`),
    }),
    items,
  };
}
