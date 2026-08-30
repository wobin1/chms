type LogMeta = Record<string, unknown>;

function write(level: "info" | "error", event: string, meta?: LogMeta) {
  const payload = { level, event, ...meta };
  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }
  console.info(JSON.stringify(payload));
}

export const logger = {
  info(event: string, meta?: LogMeta) {
    write("info", event, meta);
  },
  error(event: string, meta?: LogMeta) {
    write("error", event, meta);
  },
};
