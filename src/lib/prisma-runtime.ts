export function prismaModelFingerprint(modelNames: string[]) {
  return [...modelNames].sort().join(",");
}

export function shouldReusePrismaClient(
  cachedFingerprint: string | undefined,
  currentFingerprint: string,
) {
  return cachedFingerprint === currentFingerprint;
}

export function prismaDelegateKey(modelName: string) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

export function prismaClientIsStale(client: object, modelNames: string[]) {
  return modelNames.some((name) => {
    const key = prismaDelegateKey(name);
    return typeof (client as Record<string, unknown>)[key] === "undefined";
  });
}

export function prismaRequireCacheKeysToDrop(cacheKeys: string[]) {
  return cacheKeys.filter(
    (key) => key.includes("@prisma/client") || key.includes(".prisma/client"),
  );
}
