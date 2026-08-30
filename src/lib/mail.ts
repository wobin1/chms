import "server-only";
import { logger } from "./logger";

export type MailDelivery = "sandbox" | "sending";

export function isTransactionalEmailEnabled() {
  return Boolean(
    process.env.MAILTRAP_API_TOKEN?.trim() && process.env.EMAIL_FROM?.trim(),
  );
}

export function parseFromAddress(value: string): {
  email: string;
  name?: string;
} {
  const angled = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (angled) {
    const name = angled[1]?.trim();
    const email = angled[2]?.trim();
    if (email) {
      return name ? { email, name } : { email };
    }
  }
  return { email: value.trim() };
}

function mailtrapDelivery(): MailDelivery {
  return process.env.MAILTRAP_INBOX_ID?.trim() ? "sandbox" : "sending";
}

function mailtrapSendUrl() {
  const inboxId = process.env.MAILTRAP_INBOX_ID?.trim();
  if (inboxId) {
    return `https://sandbox.api.mailtrap.io/api/send/${inboxId}`;
  }
  return "https://send.api.mailtrap.io/api/send";
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}): Promise<{ sent: false } | { sent: true; delivery: MailDelivery }> {
  const apiToken = process.env.MAILTRAP_API_TOKEN?.trim();
  const fromRaw = process.env.EMAIL_FROM?.trim();
  if (!apiToken || !fromRaw) {
    return { sent: false as const };
  }

  const delivery = mailtrapDelivery();
  const from = parseFromAddress(fromRaw);
  const response = await fetch(mailtrapSendUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [{ email: input.to }],
      subject: "Reset your CHMS password",
      text: [
        "You requested a password reset for your CHMS account.",
        "",
        "Open this link to choose a new password:",
        input.resetUrl,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error("mail.password_reset_failed", {
      status: response.status,
      delivery,
      detail: detail.slice(0, 300),
    });
    throw new Error("Unable to send password reset email");
  }

  logger.info("mail.password_reset_sent", { delivery });
  return { sent: true as const, delivery };
}

export function appBaseUrl() {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}
