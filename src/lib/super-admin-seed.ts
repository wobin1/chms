const DEFAULT_SUPER_ADMIN_EMAIL = "admin@chms.local";

export function resolveSuperAdminCredentials(options: {
  isProduction: boolean;
  emailFromEnv?: string;
  passwordFromEnv?: string;
  defaultPassword: string;
}) {
  const email = (
    options.emailFromEnv ?? DEFAULT_SUPER_ADMIN_EMAIL
  ).toLowerCase();
  const password =
    options.passwordFromEnv ??
    (options.isProduction ? null : options.defaultPassword);

  return { email, password };
}

export function assertCanSeedSuperAdminInProduction(options: {
  isProduction: boolean;
  password: string | null;
  superAdminExists: boolean;
}) {
  if (
    options.isProduction &&
    !options.password &&
    !options.superAdminExists
  ) {
    throw new Error(
      "SEED_SUPER_ADMIN_PASSWORD is required in production when no Super Administrator exists",
    );
  }
}

export function superAdminUserMetadata() {
  return {
    name: "Platform Owner",
    status: "ACTIVE" as const,
    churchId: null,
  };
}

export function superAdminUserUpsertData(email: string, passwordHash: string) {
  return {
    create: {
      ...superAdminUserMetadata(),
      email,
      passwordHash,
    },
    update: superAdminUserMetadata(),
  };
}
