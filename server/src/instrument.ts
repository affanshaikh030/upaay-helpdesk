import * as Sentry from "@sentry/bun";

// Loaded with `bun --preload` (see package.json) so it runs before any other module.
// Error monitoring only (no tracing, profiling or logs). Skipped without a DSN so the server runs without Sentry.
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    // SDK v11 replaced `sendDefaultPii` with `dataCollection`, whose defaults collect more: turn everything off
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // Belt and braces: never send request data (ticket text, emails, headers, cookies) or user info
    beforeSend(event) {
      delete event.request;
      delete event.user;
      return event;
    },
  });
}
