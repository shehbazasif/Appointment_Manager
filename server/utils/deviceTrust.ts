import { createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";
import { getCookie, setCookie, deleteCookie, getHeader, setResponseHeader } from "h3";
import { serverSecret } from "../services/verification";

/**
 * "Trusted device" for the email login code (2-step login for business users).
 *
 * After someone enters the 6-digit code from their email, this browser gets an
 * httpOnly, signed cookie. Every visit pushes it forward by TRUST_DAYS, so
 * people who use the dashboard daily never see a code again; after TRUST_DAYS
 * away (or on a new browser/device) the next sign-in asks for a fresh code.
 * The cookie is bound to the user id and cannot be read or forged by scripts.
 */
export const TRUST_COOKIE = "rv_device_trust";
/**
 * The Android app cannot use the cookie (it talks to the server from another
 * origin), so it keeps the same signed value itself and sends it in this
 * header. App builds that support the login code also send APP_CODE_HEADER;
 * older installed app versions do not, and are not asked for a code (they have
 * no screen for it).
 */
export const TRUST_HEADER = "x-device-trust";
export const APP_CODE_HEADER = "x-app-login-code";
export const appSupportsLoginCode = (event: H3Event) => getHeader(event, APP_CODE_HEADER) === "1";
const TRUST_DAYS = 2;
const TRUST_MS = TRUST_DAYS * 24 * 60 * 60 * 1000;

const sign = (payload: string) => createHmac("sha256", `device-trust:${serverSecret()}`).update(payload).digest("base64url");

const write = (event: H3Event, userId: string) => {
  const exp = Date.now() + TRUST_MS;
  const payload = `${userId}.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  // the app keeps the refreshed value from this response header
  if (appSupportsLoginCode(event)) setResponseHeader(event, TRUST_HEADER, token);
  setCookie(event, TRUST_COOKIE, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TRUST_MS / 1000),
  });
  return token;
};

/** True when this browser verified a login code for this user in the last TRUST_DAYS of activity. */
export const isDeviceTrusted = (event: H3Event, userId: string) => {
  const raw = getCookie(event, TRUST_COOKIE) || getHeader(event, TRUST_HEADER);
  if (!raw) return false;
  const [uid, exp, sig] = raw.split(".");
  if (!uid || !exp || !sig || uid !== userId) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = sign(`${uid}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Mark this browser as trusted (after a correct code) or extend it (on activity). */
export const trustDevice = (event: H3Event, userId: string) => write(event, userId);

export const forgetDevice = (event: H3Event) => deleteCookie(event, TRUST_COOKIE, { path: "/" });
