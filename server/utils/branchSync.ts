import type { UserClient } from "./supabase";

/** Profile fields a branch takes from its head office (the name stays its own). */
const PROFILE_KEYS = ["logo_url", "description", "email", "phone"] as const;
/** Booking settings a branch takes from its head office (online booking stays off). */
const SETTINGS_KEYS = [
  "on_location_enabled",
  "hide_prices_in_list",
  "tokens_enabled",
  "show_token_to_customer",
  "business_type",
  "slot_step_minutes",
  "buffer_minutes",
] as const;

/** Fields a branch cannot change itself (settings form keys). */
export const BRANCH_LOCKED_INPUT = [
  "slug",
  "description",
  "logoUrl",
  "email",
  "phone",
  "bookingActive",
  "onLocationEnabled",
  "hidePricesInList",
  "showTokenToCustomer",
  "tokensEnabled",
  "businessType",
  "slotStepMinutes",
  "bufferMinutes",
] as const;

const differs = (a: Record<string, any>, b: Record<string, any>, keys: readonly string[]) =>
  keys.some((k) => (a?.[k] ?? null) !== (b?.[k] ?? null));

/**
 * Branches are part of the head office: copy the head office's logo, contact
 * details and booking settings to every branch that differs. Only rows that
 * changed are written. Safe to call for a business without branches.
 */
export const syncBranchesFromHead = async (sb: UserClient, headId: string) => {
  const { data: branches } = await sb
    .from("businesses")
    .select(`id, ${PROFILE_KEYS.join(", ")}`)
    .eq("parent_business_id", headId);
  if (!branches?.length) return;

  const [{ data: head }, { data: headSettings }, { data: branchSettings }] = await Promise.all([
    sb.from("businesses").select(PROFILE_KEYS.join(", ")).eq("id", headId).maybeSingle(),
    sb.from("business_settings").select(SETTINGS_KEYS.join(", ")).eq("business_id", headId).maybeSingle(),
    sb
      .from("business_settings")
      .select(`business_id, online_booking_enabled, ${SETTINGS_KEYS.join(", ")}`)
      .in("business_id", branches.map((b: any) => b.id)),
  ]);
  if (!head) return;

  const profile = Object.fromEntries(PROFILE_KEYS.map((k) => [k, (head as any)[k] ?? null]));
  const settings = headSettings
    ? { ...Object.fromEntries(SETTINGS_KEYS.map((k) => [k, (headSettings as any)[k] ?? null])), online_booking_enabled: false }
    : null;
  const now = new Date().toISOString();

  await Promise.all(
    (branches as any[]).flatMap((b) => {
      const jobs: PromiseLike<unknown>[] = [];
      if (differs(b, profile, PROFILE_KEYS))
        jobs.push(sb.from("businesses").update({ ...profile, updated_at: now }).eq("id", b.id));
      const bs = (branchSettings ?? []).find((x: any) => x.business_id === b.id);
      if (settings && bs && differs(bs, settings, [...SETTINGS_KEYS, "online_booking_enabled"]))
        jobs.push(sb.from("business_settings").update({ ...settings, updated_at: now }).eq("business_id", b.id));
      return jobs;
    }),
  );
};
