import { logger } from "./logger";

type SentryDsnParts = {
  publicKey: string;
  host: string;
  projectId: string;
};

export function parseSentryDsn(dsn: string): SentryDsnParts | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    if (!publicKey || !projectId || !url.host) {
      return null;
    }
    return { publicKey, host: url.host, projectId };
  } catch {
    return null;
  }
}

export async function captureException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  const message =
    error instanceof Error ? error.message : "unknown_exception";
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error("exception", {
    error: message,
    ...context,
  });

  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  const parts = parseSentryDsn(dsn);
  if (!parts) {
    logger.error("sentry.invalid_dsn");
    return;
  }

  const endpoint = `https://${parts.host}/api/${parts.projectId}/store/`;
  const auth = [
    "Sentry sentry_version=7",
    `sentry_client=chms/0.1.0`,
    `sentry_key=${parts.publicKey}`,
  ].join(", ");

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": auth,
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID().replaceAll("-", ""),
        timestamp: new Date().toISOString(),
        platform: "node",
        level: "error",
        server_name: process.env.VERCEL_URL ?? "chms",
        environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
        message,
        exception: {
          values: [
            {
              type: error instanceof Error ? error.name : "Error",
              value: message,
              stacktrace: stack
                ? {
                    frames: stack
                      .split("\n")
                      .slice(1)
                      .map((line) => ({ filename: line.trim() })),
                  }
                : undefined,
            },
          ],
        },
        tags: context,
      }),
    });
  } catch (sendError) {
    logger.error("sentry.send_failed", {
      error:
        sendError instanceof Error ? sendError.message : "unknown",
    });
  }
}
