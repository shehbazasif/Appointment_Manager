import { createHash, randomBytes } from "node:crypto";
import type { H3Event } from "h3";
import { getRequestURL } from "h3";
import { requireTenant } from "./auth";
import { getUserClient } from "./supabase";

/** Invite links carry a random token; only its hash is stored. */
export const newInviteToken = () => randomBytes(24).toString("base64url");
export const hashInviteToken = (token: string) => createHash("sha256").update(`invite:${token}`).digest("hex");

/** Public address of this website (for links in emails). */
export const siteOrigin = (event: H3Event) => {
  const configured = String(useRuntimeConfig(event).public.siteUrl || "").replace(/\/+$/, "");
  return configured || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
};

/** Turns a database error from the team functions into a friendly H3 error. */
export const teamError = (error: { code?: string; message?: string }) =>
  createError({
    statusCode: error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 500,
    statusMessage: error.message || "Something went wrong.",
  });

/**
 * Team management is for the head office only (or a business without
 * branches). It covers the head office and each of its branches ("places").
 */
export const requireTeamScope = async (event: H3Event) => {
  const tenant = await requireTenant(event);
  if (tenant.viewingBranch || (tenant.homeBusiness as any).parent_business_id)
    throw createError({ statusCode: 403, statusMessage: "The team is managed by the head office." });
  const sb = await getUserClient(event);
  const { data: branches } = await sb
    .from("businesses")
    .select("id, name")
    .eq("parent_business_id", tenant.businessId)
    .order("created_at", { ascending: true });
  const places = [
    { id: tenant.businessId, name: String((tenant.business as any).name ?? ""), isHead: true },
    ...(branches ?? []).map((b: any) => ({ id: b.id as string, name: String(b.name ?? ""), isHead: false })),
  ];
  /** The place an id points to, or a 403 when it is not one of ours. */
  const place = (id?: string | null) => {
    const p = places.find((x) => x.id === (id || tenant.businessId));
    if (!p) throw createError({ statusCode: 403, statusMessage: "Not allowed." });
    return p;
  };
  return { tenant, sb, places, place };
};
