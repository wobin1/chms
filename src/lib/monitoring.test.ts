import { afterEach, describe, expect, it, vi } from "vitest";

describe("monitoring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("does not call Sentry when SENTRY_DSN is unset", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { captureException } = await import("./monitoring");
    await captureException(new Error("boom"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts a Sentry event when SENTRY_DSN is set", async () => {
    vi.stubEnv(
      "SENTRY_DSN",
      "https://publickey@o123.ingest.sentry.io/456",
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { captureException } = await import("./monitoring");
    await captureException(new Error("boom"), { event: "test" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://o123.ingest.sentry.io/api/456/store/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Sentry-Auth": expect.stringContaining("sentry_key=publickey"),
        }),
      }),
    );
  });
});
