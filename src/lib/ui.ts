type ApiErrorBody = {
  error?: string;
  details?: {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
} | null;

export function formatApiErrorBody(body: ApiErrorBody, fallback: string) {
  const fieldMessages = Object.entries(body?.details?.fieldErrors ?? {}).flatMap(
    ([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`),
  );
  if (fieldMessages.length > 0) {
    return fieldMessages.slice(0, 3).join("; ");
  }
  const formMessages = body?.details?.formErrors?.filter(Boolean) ?? [];
  if (formMessages.length > 0) {
    return formMessages.slice(0, 3).join("; ");
  }
  return body?.error ?? fallback;
}

export async function readApiError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody;
  return formatApiErrorBody(body, fallback);
}

export function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
