import { createRequire } from "node:module";
import { statSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import "server-only";
import {
  prismaClientIsStale,
  prismaModelFingerprint,
  prismaRequireCacheKeysToDrop,
  shouldReusePrismaClient,
} from "./prisma-runtime";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaModelFingerprint?: string;
  prismaGeneratedStamp?: string;
  getPrismaClient?: () => PrismaClient;
  prismaProxy?: PrismaClient;
};

const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));

function generatedClientStamp() {
  try {
    const generated = path.join(
      process.cwd(),
      "node_modules/.prisma/client/index.js",
    );
    return String(statSync(generated).mtimeMs);
  } catch {
    return prismaModelFingerprint(Object.values(Prisma.ModelName));
  }
}

function loadPrismaClientConstructor(): typeof PrismaClient {
  try {
    const cache = requireFromApp.cache;
    if (cache) {
      for (const key of prismaRequireCacheKeysToDrop(Object.keys(cache))) {
        delete cache[key];
      }
    }
    const loaded = requireFromApp("@prisma/client") as {
      PrismaClient: typeof PrismaClient;
    };
    return loaded.PrismaClient;
  } catch {
    return PrismaClient;
  }
}

function createPrismaClient() {
  const Client =
    process.env.NODE_ENV === "production"
      ? PrismaClient
      : loadPrismaClientConstructor();
  return new Client({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaClient() {
  const currentFingerprint = prismaModelFingerprint(
    Object.values(Prisma.ModelName),
  );
  const diskStamp = generatedClientStamp();
  const cached = globalForPrisma.prisma;
  const canReuse =
    cached &&
    shouldReusePrismaClient(
      globalForPrisma.prismaModelFingerprint,
      currentFingerprint,
    ) &&
    shouldReusePrismaClient(globalForPrisma.prismaGeneratedStamp, diskStamp) &&
    !prismaClientIsStale(cached, Object.values(Prisma.ModelName));

  if (canReuse) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect();
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaModelFingerprint = currentFingerprint;
  globalForPrisma.prismaGeneratedStamp = diskStamp;
  return client;
}

globalForPrisma.getPrismaClient = getPrismaClient;

function bindClientProperty(client: PrismaClient, prop: string | symbol) {
  const value = Reflect.get(client, prop, client);
  if (typeof value === "function") {
    return value.bind(client);
  }
  return value;
}

const prismaProxy =
  globalForPrisma.prismaProxy ??
  new Proxy({} as PrismaClient, {
    get(_target, prop) {
      const client = (globalForPrisma.getPrismaClient ?? getPrismaClient)();
      return bindClientProperty(client, prop);
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaProxy = prismaProxy;
}

export const prisma = prismaProxy;
