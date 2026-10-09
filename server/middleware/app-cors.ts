import { getHeader, handleCors } from "h3";

/**
 * Lets the Android app (Capacitor) call this server's /api routes.
 * Only the app's own origins are allowed; the website itself is same-origin
 * and never needs (or receives) these headers. No cookies are involved —
 * the app authenticates with an Authorization: Bearer token.
 */
const APP_ORIGINS = ["https://localhost", "http://localhost", "capacitor://localhost"];

export default defineEventHandler((event) => {
  const origin = getHeader(event, "origin") ?? "";
  if (!APP_ORIGINS.includes(origin)) return;

  const done = handleCors(event, {
    origin: APP_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: "86400",
    preflight: { statusCode: 204 },
  });
  if (done) return "";
});
