import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0,
  beforeSend(event) {
    delete event.request?.cookies;
    delete event.request?.data;
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  },
});
