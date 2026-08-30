import { describe, expect, it } from "vitest";
import {
  prismaClientIsStale,
  prismaDelegateKey,
  prismaModelFingerprint,
  prismaRequireCacheKeysToDrop,
  shouldReusePrismaClient,
} from "./prisma-runtime";

describe("prisma client reuse after generate", () => {
  it("does not reuse a client when models were added", () => {
    const before = prismaModelFingerprint(["Church", "Member"]);
    const after = prismaModelFingerprint(["Church", "Member", "Giving"]);
    expect(shouldReusePrismaClient(before, after)).toBe(false);
  });

  it("reuses a client when the model list is unchanged", () => {
    const fingerprint = prismaModelFingerprint(["Giving", "Church"]);
    expect(shouldReusePrismaClient(fingerprint, fingerprint)).toBe(true);
  });

  it("treats a client as stale when a generated model has no delegate", () => {
    const client = { church: {} };
    expect(prismaDelegateKey("Sermon")).toBe("sermon");
    expect(prismaClientIsStale(client, ["Church", "Sermon"])).toBe(true);
  });

  it("does not treat a client as stale when every model has a delegate", () => {
    const client = { church: {}, sermon: {} };
    expect(prismaClientIsStale(client, ["Church", "Sermon"])).toBe(false);
  });

  it("selects prisma require cache keys after generate", () => {
    expect(
      prismaRequireCacheKeysToDrop([
        "/app/node_modules/@prisma/client/default.js",
        "/app/node_modules/.prisma/client/index.js",
        "/app/src/lib/db.ts",
      ]),
    ).toEqual([
      "/app/node_modules/@prisma/client/default.js",
      "/app/node_modules/.prisma/client/index.js",
    ]);
  });
});
