import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import {
  ACCOUNTANT_PERMISSIONS,
  CHURCH_PERMISSIONS,
  ZONE_LEADER_PERMISSIONS,
  DEFAULT_ATTENDANCE_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_GIVING_TYPES,
  DEFAULT_SERVICE_TYPES,
  PLATFORM_PERMISSIONS,
} from "../src/lib/permission-catalog";

const prisma = new PrismaClient();

const DEMO_FIRST_NAMES = [
  "Ada",
  "Bello",
  "Chidi",
  "Deborah",
  "Emeka",
  "Fatima",
  "Grace",
  "Hassan",
  "Ifeoma",
  "James",
  "Kemi",
  "Ladi",
  "Musa",
  "Ngozi",
  "Olu",
  "Patience",
  "Queen",
  "Ruth",
  "Samuel",
  "Tunde",
  "Uche",
  "Vera",
  "Wale",
  "Yetunde",
] as const;

const DEMO_LAST_NAMES = [
  "Adebayo",
  "Bello",
  "Chukwu",
  "Danladi",
  "Eze",
  "Farouk",
  "Garba",
  "Hassan",
  "Ibrahim",
  "Jibril",
  "Kwame",
  "Lawal",
] as const;

const DEMO_ANNOUNCEMENTS = [
  "Choir rehearsal this Friday",
  "Youth fellowship on Saturday",
  "Zone leaders meeting after service",
  "Thanksgiving service next Sunday",
] as const;

function weeksAgoSunday(weeksAgo: number, from = new Date()): Date {
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  const day = d.getUTCDay();
  const toSunday = day === 0 ? 0 : -day;
  d.setUTCDate(d.getUTCDate() + toSunday - weeksAgo * 7);
  return d;
}

function shouldSeedDashboardDemo() {
  if (process.env.SEED_DASHBOARD_DEMO === "false") return false;
  if (process.env.NODE_ENV === "production") {
    return process.env.SEED_DASHBOARD_DEMO === "true";
  }
  return true;
}

async function seedChurchDashboardDemo(churchId: string) {
  let zones = await prisma.zone.findMany({
    where: { churchId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  if (zones.length === 0) {
    await prisma.zone.createMany({
      data: [
        { churchId, name: "Hope", description: "Demo zone" },
        { churchId, name: "Love", description: "Demo zone" },
        { churchId, name: "Peace", description: "Demo zone" },
      ],
      skipDuplicates: true,
    });
    zones = await prisma.zone.findMany({
      where: { churchId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  const activeStatus = await prisma.membershipStatus.findFirst({
    where: { churchId, name: "Active" },
  });
  if (!activeStatus || zones.length === 0) return;

  for (let i = 0; i < DEMO_FIRST_NAMES.length; i += 1) {
    const membershipNumber = `DASH-${String(i + 1).padStart(3, "0")}`;
    const existing = await prisma.member.findUnique({
      where: {
        churchId_membershipNumber: { churchId, membershipNumber },
      },
    });
    if (existing) continue;
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - (DEMO_FIRST_NAMES.length - i) * 3);
    await prisma.member.create({
      data: {
        churchId,
        zoneId: zones[i % zones.length]!.id,
        membershipStatusId: activeStatus.id,
        membershipNumber,
        firstName: DEMO_FIRST_NAMES[i]!,
        lastName: DEMO_LAST_NAMES[i % DEMO_LAST_NAMES.length]!,
        gender: i % 2 === 0 ? "FEMALE" : "MALE",
        dateJoined: createdAt,
        createdAt,
      },
    });
  }

  const sundayType =
    (await prisma.serviceType.findFirst({
      where: { churchId, name: "Sunday Service" },
    })) ??
    (await prisma.serviceType.findFirst({ where: { churchId } }));
  const categories = await prisma.attendanceCategory.findMany({
    where: { churchId },
    orderBy: { sortOrder: "asc" },
  });
  if (sundayType && categories.length > 0) {
    for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo -= 1) {
      const serviceDate = weeksAgoSunday(weeksAgo);
      const existing = await prisma.service.findFirst({
        where: { churchId, serviceDate },
        include: { attendance: true },
      });
      if (existing?.attendance.length) continue;

      const service =
        existing ??
        (await prisma.service.create({
          data: {
            churchId,
            serviceTypeId: sundayType.id,
            serviceDate,
            name: "Sunday Service",
            status: "COMPLETED",
            theme: "Dashboard demo service",
          },
        }));

      const adults = 140 + weeksAgo * 5 + (weeksAgo % 3) * 4;
      const children = 35 + weeksAgo * 2;
      const visitors = 2 + ((weeksAgo * 3) % 7);
      const workers = 6 + (weeksAgo % 4);
      const counts: Record<string, number> = {
        Adults: adults,
        Children: children,
        Visitors: visitors,
        Workers: workers,
      };
      for (const category of categories) {
        await prisma.serviceAttendance.upsert({
          where: {
            serviceId_attendanceCategoryId: {
              serviceId: service.id,
              attendanceCategoryId: category.id,
            },
          },
          update: {},
          create: {
            serviceId: service.id,
            attendanceCategoryId: category.id,
            count: counts[category.name] ?? 10 + weeksAgo,
          },
        });
      }
    }
  }

  const visitorCount = await prisma.visitor.count({ where: { churchId } });
  if (visitorCount < 8) {
    for (let i = visitorCount; i < 8; i += 1) {
      await prisma.visitor.create({
        data: {
          churchId,
          firstName: DEMO_FIRST_NAMES[i % DEMO_FIRST_NAMES.length]!,
          lastName: `Guest${i + 1}`,
          status: "NEW",
          firstVisitDate: weeksAgoSunday(i % 6),
        },
      });
    }
  }

  const author = await prisma.user.findFirst({
    where: { churchId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (author) {
    for (let i = 0; i < DEMO_ANNOUNCEMENTS.length; i += 1) {
      const title = DEMO_ANNOUNCEMENTS[i]!;
      const existing = await prisma.announcement.findFirst({
        where: { churchId, title },
      });
      if (existing) continue;
      const startDate = weeksAgoSunday(i);
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 7);
      await prisma.announcement.create({
        data: {
          churchId,
          title,
          content: `${title}. Seeded for the church dashboard demo.`,
          startDate,
          endDate,
          status: "PUBLISHED",
          createdById: author.id,
        },
      });
    }

    const givingType =
      (await prisma.givingType.findFirst({
        where: { churchId, name: "Offering" },
      })) ??
      (await prisma.givingType.findFirst({ where: { churchId } }));
    const expenseCategory =
      (await prisma.expenseCategory.findFirst({
        where: { churchId, name: "Utilities" },
      })) ??
      (await prisma.expenseCategory.findFirst({ where: { churchId } }));

    const existingGiving = await prisma.giving.count({
      where: {
        churchId,
        transactionReference: { startsWith: "DASH-GIV-" },
      },
    });
    if (givingType && existingGiving === 0) {
      for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo -= 1) {
        const createdAt = weeksAgoSunday(weeksAgo);
        createdAt.setUTCHours(12, 0, 0, 0);
        await prisma.giving.create({
          data: {
            churchId,
            givingTypeId: givingType.id,
            amount: 85000 + weeksAgo * 4500 + (weeksAgo % 3) * 12000,
            paymentMethod: "Cash",
            transactionReference: `DASH-GIV-${weeksAgo}`,
            recordedById: author.id,
            createdAt,
          },
        });
      }
    }

    const existingExpenses = await prisma.expense.count({
      where: {
        churchId,
        reference: { startsWith: "DASH-EXP-" },
      },
    });
    if (expenseCategory && existingExpenses === 0) {
      for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo -= 1) {
        if (weeksAgo % 2 === 1) continue;
        const expenseDate = weeksAgoSunday(weeksAgo);
        await prisma.expense.create({
          data: {
            churchId,
            categoryId: expenseCategory.id,
            amount: 22000 + weeksAgo * 3500,
            description: "Dashboard demo expense",
            expenseDate,
            paymentMethod: "Transfer",
            reference: `DASH-EXP-${weeksAgo}`,
            recordedById: author.id,
          },
        });
      }
    }
  }
}

async function main() {
  const email = (
    process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@chms.local"
  ).toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe!admin1";

  if (process.env.NODE_ENV === "production" && !process.env.SEED_SUPER_ADMIN_PASSWORD) {
    throw new Error("SEED_SUPER_ADMIN_PASSWORD is required in production");
  }

  const permissionNames = [
    ...PLATFORM_PERMISSIONS.map((name) => ({
      name,
      description: "Create, edit, suspend, and reactivate churches",
    })),
    ...CHURCH_PERMISSIONS.map((name) => ({
      name,
      description: name,
    })),
  ];

  for (const permission of permissionNames) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  const churchesManage = await prisma.permission.findUniqueOrThrow({
    where: { name: "churches:manage" },
  });

  let role = await prisma.role.findFirst({
    where: { churchId: null, name: "Super Administrator" },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        churchId: null,
        name: "Super Administrator",
        description: "Platform owner",
      },
    });
  }

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: role.id,
        permissionId: churchesManage.id,
      },
    },
    update: {},
    create: {
      roleId: role.id,
      permissionId: churchesManage.id,
    },
  });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Platform Owner",
      passwordHash,
      status: "ACTIVE",
      churchId: null,
    },
    create: {
      name: "Platform Owner",
      email,
      passwordHash,
      status: "ACTIVE",
      churchId: null,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: user.id, roleId: role.id },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  const churchPermissions = await prisma.permission.findMany({
    where: { name: { in: [...CHURCH_PERMISSIONS] } },
  });
  const churchAdminRoles = await prisma.role.findMany({
    where: { name: "Church Administrator", churchId: { not: null } },
  });
  for (const adminRole of churchAdminRoles) {
    for (const permission of churchPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const churches = await prisma.church.findMany({ select: { id: true } });
  for (const church of churches) {
    const typeCount = await prisma.serviceType.count({
      where: { churchId: church.id },
    });
    if (typeCount === 0) {
      await prisma.serviceType.createMany({
        data: DEFAULT_SERVICE_TYPES.map((name) => ({
          churchId: church.id,
          name,
        })),
        skipDuplicates: true,
      });
    }
    const categoryCount = await prisma.attendanceCategory.count({
      where: { churchId: church.id },
    });
    if (categoryCount === 0) {
      await prisma.attendanceCategory.createMany({
        data: DEFAULT_ATTENDANCE_CATEGORIES.map((name, index) => ({
          churchId: church.id,
          name,
          sortOrder: index,
        })),
        skipDuplicates: true,
      });
    }
    const givingTypeCount = await prisma.givingType.count({
      where: { churchId: church.id },
    });
    if (givingTypeCount === 0) {
      await prisma.givingType.createMany({
        data: DEFAULT_GIVING_TYPES.map((name) => ({
          churchId: church.id,
          name,
        })),
        skipDuplicates: true,
      });
    }
    const expenseCategoryCount = await prisma.expenseCategory.count({
      where: { churchId: church.id },
    });
    if (expenseCategoryCount === 0) {
      await prisma.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
          churchId: church.id,
          name,
        })),
        skipDuplicates: true,
      });
    }

    const zoneLeader = await prisma.role.findFirst({
      where: { churchId: church.id, name: "Zone Leader" },
    });
    if (zoneLeader) {
      const zoneLeaderPermissions = await prisma.permission.findMany({
        where: { name: { in: [...ZONE_LEADER_PERMISSIONS] } },
      });
      for (const permission of zoneLeaderPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: zoneLeader.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: zoneLeader.id,
            permissionId: permission.id,
          },
        });
      }
    }

    let accountant = await prisma.role.findFirst({
      where: { churchId: church.id, name: "Accountant" },
    });
    if (!accountant) {
      accountant = await prisma.role.create({
        data: {
          churchId: church.id,
          name: "Accountant",
          description: "Giving, expenses, and financial records for this church",
        },
      });
    }
    const financePermissions = await prisma.permission.findMany({
      where: { name: { in: [...ACCOUNTANT_PERMISSIONS] } },
    });
    for (const permission of financePermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: accountant.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: accountant.id,
          permissionId: permission.id,
        },
      });
    }

    if (shouldSeedDashboardDemo()) {
      await seedChurchDashboardDemo(church.id);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
