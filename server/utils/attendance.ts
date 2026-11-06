import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => {
  const s = process.env.ATTENDANCE_SECRET;
  if (!s || s.length < 16)
    throw createError({
      statusCode: 503,
      statusMessage:
        "Attendance is not set up yet: add ATTENDANCE_SECRET (any 16+ random characters) to the server environment.",
    });
  return s;
};

const sign = (businessId: string, staffId: string) =>
  createHmac("sha256", secret()).update(`${businessId}.${staffId}`).digest("base64url").slice(0, 22);

/** The text stored in a staff member's QR badge. Cannot be forged without the server secret. */
export const staffBadgeToken = (businessId: string, staffId: string) =>
  `rv1.${staffId}.${sign(businessId, staffId)}`;

/** Returns the staff id when the token is genuine for this business, otherwise null. */
export const staffIdFromToken = (businessId: string, token: string) => {
  const [version, staffId, signature] = String(token ?? "").trim().split(".");
  if (version !== "rv1" || !staffId || !signature) return null;
  const expected = Buffer.from(sign(businessId, staffId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return staffId;
};
