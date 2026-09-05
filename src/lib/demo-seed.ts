export function shouldSeedDemoChurch(options: {
  isProduction: boolean;
  flagFromEnv?: string;
}) {
  if (options.flagFromEnv === "false") return false;
  return true;
}

export function shouldSeedDashboardDemo(options: {
  isProduction: boolean;
  flagFromEnv?: string;
}) {
  if (options.flagFromEnv === "false") return false;
  return true;
}

export function resolveDemoAdminPassword(options: {
  isProduction: boolean;
  passwordFromEnv?: string;
  defaultPassword: string;
}) {
  if (options.passwordFromEnv) return options.passwordFromEnv;
  if (options.isProduction) return null;
  return options.defaultPassword;
}

export function assertCanSeedDemoAdminInProduction(options: {
  isProduction: boolean;
  password: string | null;
  willCreateDemoChurch: boolean;
}) {
  if (
    options.isProduction &&
    options.willCreateDemoChurch &&
    !options.password
  ) {
    throw new Error(
      "SEED_DEMO_ADMIN_PASSWORD is required in production when seeding the demo church",
    );
  }
}
