import * as Sentry from "@sentry/nextjs";

export type LogLevel = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const SECRET_KEY = /api[-_]?key|secret|token|password|authorization|cookie|credential|access[_-]?token|webhook/i;
const PII_KEY = /email|phone|content|message|firstName|lastName|address/i;

function safeValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (value instanceof Error) return { name: value.name, message: value.message.slice(0, 300) };
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => safeValue(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Context).map(([key, item]) => [
      key,
      SECRET_KEY.test(key) ? "[redacted]" : PII_KEY.test(key) ? "[omitted]" : safeValue(item, depth + 1),
    ]));
  }
  return typeof value === "string" ? value.slice(0, 500) : value;
}

export function log(level: LogLevel, event: string, context: Context = {}) {
  const entry = { level, event, ...safeValue(context) as Context, timestamp: new Date().toISOString() };
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.info(JSON.stringify(entry));
}

export function reportError(event: string, error: unknown, context: Context = {}) {
  const safeContext = safeValue(context) as Context;
  log("error", event, { ...safeContext, error });
  Sentry.withScope((scope) => {
    scope.setTag("event", event);
    scope.setExtras(safeContext);
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

export function operationalAlert(
  severity: "warning" | "critical",
  event: string,
  context: Context = {},
) {
  log(severity === "critical" ? "error" : "warn", event, { severity, ...context });
  Sentry.captureMessage(event, severity === "critical" ? "error" : "warning");
}
