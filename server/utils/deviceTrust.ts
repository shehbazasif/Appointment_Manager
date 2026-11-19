import { createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";
import { getCookie, setCookie, deleteCookie } from "h3";
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
const TRUST_DAYS = 2;
const TRUST_MS = TRUST_DAYS * 24 * 60 * 60 * 1000;

const sign = (payload: string) => createHmac("sha256", `device-trust:${serverSecret()}`).update(payload).digest("base64url");

const write = (event: H3Event, userId: string) => {
  const exp = Date.now() + TRUST_MS;
  const payload = `${userId}.${exp}`;
  setCookie(event, TRUST_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TRUST_MS / 1000),
  });
};

/** True when this browser verified a login code for this user in the last TRUST_DAYS of activity. */
export const isDeviceTrusted = (event: H3Event, userId: string) => {
  const raw = getCookie(event, TRUST_COOKIE);
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
