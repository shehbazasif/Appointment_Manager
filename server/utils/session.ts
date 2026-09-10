import { createHmac, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "h3";
import type { H3Event } from "h3";

const cookieName = "rantevou_session";
const sessionDurationSeconds = 60 * 60 * 24 * 7;

const secret = () => process.env.AUTH_SECRET ?? "development-only-change-me";
const sign = (value: string) =>
  createHmac("sha256", secret()).update(value).digest("base64url");

export const createSession = (
  event: H3Event,
  userId: string,
  organizationId: string,
) => {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds;
  const payload = `${userId}.${organizationId}.${expiresAt}`;
  setCookie(event, cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
};

export const clearSession = (event: H3Event) =>
  deleteCookie(event, cookieName, { path: "/" });

export const getSession = (event: H3Event) => {
  const value = getCookie(event, cookieName);
  if (!value) return undefined;
  const [userId, organizationId, expiresAt, signature] = value.split(".");
  if (
    !userId ||
    !organizationId ||
    !expiresAt ||
    !signature ||
    Number(expiresAt) < Math.floor(Date.now() / 1000)
  )
    return undefined;
  const payload = `${userId}.${organizationId}.${expiresAt}`;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return undefined;
  return { userId, organizationId };
};

export const requireSession = (event: H3Event) => {
  const session = getSession(event);
  if (!session)
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  return session;
};
