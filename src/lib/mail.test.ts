import { afterEach, describe, expect, it, vi } from "vitest";

describe("mail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("reports email as disabled when Mailtrap is not configured", async () => {
    vi.stubEnv("MAILTRAP_API_TOKEN", "");
    vi.stubEnv("EMAIL_FROM", "");
    const { isTransactionalEmailEnabled } = await import("./mail");
    expect(isTransactionalEmailEnabled()).toBe(false);
  });

  it("sends a password reset through Mailtrap sending API", async () => {
    vi.stubEnv("MAILTRAP_API_TOKEN", "mt_test");
    vi.stubEnv("EMAIL_FROM", "CHMS <noreply@example.com>");
    vi.stubEnv("MAILTRAP_INBOX_ID", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { sendPasswordResetEmail } = await import("./mail");
    const result = await sendPasswordResetEmail({
      to: "admin@church.example",
      resetUrl: "https://app.example/reset-password?token=abc",
    });
    expect(result).toEqual({ sent: true, delivery: "sending" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://send.api.mailtrap.io/api/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer mt_test",
        }),
      }),
    );
  });

  it("uses the Mailtrap sandbox endpoint when an inbox id is set", async () => {
    vi.stubEnv("MAILTRAP_API_TOKEN", "mt_test");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    vi.stubEnv("MAILTRAP_INBOX_ID", "12345");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { sendPasswordResetEmail } = await import("./mail");
    const result = await sendPasswordResetEmail({
      to: "admin@church.example",
      resetUrl: "https://app.example/reset-password?token=abc",
    });
    expect(result).toEqual({ sent: true, delivery: "sandbox" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.api.mailtrap.io/api/send/12345",
      expect.any(Object),
    );
  });

  it("surfaces Mailtrap error bodies when send fails", async () => {
    vi.stubEnv("MAILTRAP_API_TOKEN", "mt_test");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    vi.stubEnv("MAILTRAP_INBOX_ID", "12345");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"errors":["Unauthorized"]}',
    });
    vi.stubGlobal("fetch", fetchMock);
    const { sendPasswordResetEmail } = await import("./mail");
    await expect(
      sendPasswordResetEmail({
        to: "admin@church.example",
        resetUrl: "https://app.example/reset-password?token=abc",
      }),
    ).rejects.toThrow("Unable to send password reset email");
  });
});
