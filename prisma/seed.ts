import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import {
  ACCOUNTANT_PERMISSIONS,
  CHURCH_ADMIN_PERMISSIONS,
  CHURCH_PERMISSIONS,
  ZONE_LEADER_PERMISSIONS,
  DEFAULT_ATTENDANCE_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_GIVING_TYPES,
  DEFAULT_MEMBERSHIP_STATUSES,
  DEFAULT_SERVICE_TYPES,
  PLATFORM_PERMISSIONS,
} from "../src/lib/permission-catalog";
import {
  assertCanSeedDemoAdminInProduction,
  resolveDemoAdminPassword,
  shouldSeedDashboardDemo,
  shouldSeedDemoChurch,
} from "../src/lib/demo-seed";
import {
  assertCanSeedSuperAdminInProduction,
  resolveSuperAdminCredentials,
  superAdminUserMetadata,
  superAdminUserUpsertData,
} from "../src/lib/super-admin-seed";

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

async function seedDemoChurchIfEmpty() {
  const isProduction = process.env.NODE_ENV === "production";
  if (
    !shouldSeedDemoChurch({
      isProduction,
      flagFromEnv: process.env.SEED_DEMO_CHURCH,
    })
  ) {
    return;
  }

  const churchCount = await prisma.church.count();
  if (churchCount > 0) return;

  const adminEmail = (
    process.env.SEED_DEMO_ADMIN_EMAIL ?? "admin@demo.local"
  ).toLowerCase();
  const adminPassword = resolveDemoAdminPassword({
    isProduction,
    passwordFromEnv: process.env.SEED_DEMO_ADMIN_PASSWORD,
    defaultPassword: "ChangeMe!church1",
  });
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });
  if (existingAdmin) return;

  assertCanSeedDemoAdminInProduction({
    isProduction,
    password: adminPassword,
    willCreateDemoChurch: true,
  });
  if (!adminPassword) return;

  const permissions = await prisma.permission.findMany({
    where: {
      name: {
        in: [
          ...CHURCH_ADMIN_PERMISSIONS,
          ...ZONE_LEADER_PERMISSIONS,
          ...ACCOUNTANT_PERMISSIONS,
        ],
      },
    },
  });
  const permissionByName = new Map(
    permissions.map((row) => [row.name, row.id]),
  );

  await prisma.$transaction(async (tx) => {
    const church = await tx.church.create({
      data: {
        name: process.env.SEED_DEMO_CHURCH_NAME ?? "ECWA Demo",
        slug: process.env.SEED_DEMO_CHURCH_SLUG ?? "ecwa-demo",
        shortName: "Demo",
        denomination: "ECWA",
        city: "Kaduna",
        state: "Kaduna",
        notes: "Seeded demo church for local development",
      },
    });

    const adminRole = await tx.role.create({
      data: {
        churchId: church.id,
        name: "Church Administrator",
        description: "Full administration of this church",
      },
    });
    const zoneLeaderRole = await tx.role.create({
      data: {
        churchId: church.id,
        name: "Zone Leader",
        description: "Members in assigned zones",
      },
    });
    const accountantRole = await tx.role.create({
      data: {
        churchId: church.id,
        name: "Accountant",
        description: "Giving, expenses, and financial records for this church",
      },
    });

    await tx.rolePermission.createMany({
      data: [
        ...CHURCH_ADMIN_PERMISSIONS.map((name) => ({
          roleId: adminRole.id,
          permissionId: permissionByName.get(name) ?? "",
        })),
        ...ZONE_LEADER_PERMISSIONS.map((name) => ({
          roleId: zoneLeaderRole.id,
          permissionId: permissionByName.get(name) ?? "",
        })),
        ...ACCOUNTANT_PERMISSIONS.map((name) => ({
          roleId: accountantRole.id,
          permissionId: permissionByName.get(name) ?? "",
        })),
      ].filter((row) => row.permissionId),
    });

    await tx.membershipStatus.createMany({
      data: DEFAULT_MEMBERSHIP_STATUSES.map((name, index) => ({
        churchId: church.id,
        name,
        sortOrder: index,
      })),
    });
    await tx.serviceType.createMany({
      data: DEFAULT_SERVICE_TYPES.map((name) => ({
        churchId: church.id,
        name,
      })),
    });
    await tx.attendanceCategory.createMany({
      data: DEFAULT_ATTENDANCE_CATEGORIES.map((name, index) => ({
        churchId: church.id,
        name,
        sortOrder: index,
      })),
    });
    await tx.givingType.createMany({
      data: DEFAULT_GIVING_TYPES.map((name) => ({
        churchId: church.id,
        name,
      })),
    });
    await tx.expenseCategory.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        churchId: church.id,
        name,
      })),
    });

    const admin = await tx.user.create({
      data: {
        churchId: church.id,
        name: process.env.SEED_DEMO_ADMIN_NAME ?? "Demo Church Admin",
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
      },
    });
    await tx.userRole.create({
      data: { userId: admin.id, roleId: adminRole.id },
    });
  });
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

    const givingTypes = await prisma.givingType.findMany({
      where: { churchId },
      orderBy: { name: "asc" },
    });
    const expenseCategories = await prisma.expenseCategory.findMany({
      where: { churchId },
      orderBy: { name: "asc" },
    });

    const existingGiving = await prisma.giving.count({
      where: {
        churchId,
        transactionReference: { startsWith: "DASH-FIN-GIV-" },
      },
    });
    if (givingTypes.length > 0 && existingGiving === 0) {
      for (let weeksAgo = 11; weeksAgo >= 0; weeksAgo -= 1) {
        const createdAt = weeksAgoSunday(weeksAgo);
        createdAt.setUTCHours(12, 0, 0, 0);
        const type = givingTypes[weeksAgo % givingTypes.length]!;
        const base =
          type.name === "Tithe"
            ? 120000
            : type.name === "Offering"
              ? 85000
              : type.name === "Building Fund"
                ? 45000
                : 25000;
        await prisma.giving.create({
          data: {
            churchId,
            givingTypeId: type.id,
            amount: base + weeksAgo * 3500 + (weeksAgo % 4) * 8000,
            paymentMethod: weeksAgo % 2 === 0 ? "Cash" : "Transfer",
            transactionReference: `DASH-FIN-GIV-${type.name.replace(/\s+/g, "").slice(0, 8)}-${weeksAgo}`,
            recordedById: author.id,
            createdAt,
          },
        });
      }
    }

    const existingExpenses = await prisma.expense.count({
      where: {
        churchId,
        reference: { startsWith: "DASH-FIN-EXP-" },
      },
    });
    if (expenseCategories.length > 0 && existingExpenses === 0) {
      for (let weeksAgo = 11; weeksAgo >= 0; weeksAgo -= 1) {
        if (weeksAgo % 2 === 1) continue;
        const expenseDate = weeksAgoSunday(weeksAgo);
        const category =
          expenseCategories[weeksAgo % expenseCategories.length]!;
        await prisma.expense.create({
          data: {
            churchId,
            categoryId: category.id,
            amount: 18000 + weeksAgo * 2800 + (weeksAgo % 3) * 5000,
            description: `Demo ${category.name.toLowerCase()} expense`,
            expenseDate,
            paymentMethod: "Transfer",
            reference: `DASH-FIN-EXP-${category.name.replace(/\s+/g, "").slice(0, 8)}-${weeksAgo}`,
            recordedById: author.id,
          },
        });
      }
    }
  }
}

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const { email, password } = resolveSuperAdminCredentials({
    isProduction,
    emailFromEnv: process.env.SEED_SUPER_ADMIN_EMAIL,
    passwordFromEnv: process.env.SEED_SUPER_ADMIN_PASSWORD,
    defaultPassword: "ChangeMe!admin1",
  });

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  assertCanSeedSuperAdminInProduction({
    isProduction,
    password,
    superAdminExists: Boolean(existingSuperAdmin),
  });

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

  let user;
  if (password) {
    const passwordHash = await hashPassword(password);
    const userUpsert = superAdminUserUpsertData(email, passwordHash);
    user = await prisma.user.upsert({
      where: { email },
      ...userUpsert,
    });
  } else {
    user = await prisma.user.update({
      where: { email },
      data: superAdminUserMetadata(),
    });
  }

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

  await seedDemoChurchIfEmpty();

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

    if (
      shouldSeedDashboardDemo({
        isProduction,
        flagFromEnv: process.env.SEED_DASHBOARD_DEMO,
      })
    ) {
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
