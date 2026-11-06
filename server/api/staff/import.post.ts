import { readBody, setResponseStatus } from "h3";
import { staffSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const digits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const body = await readBody(event);
  const rows: { row: number; data: Record<string, unknown> }[] = Array.isArray(body?.rows) ? body.rows : [];
  if (!rows.length) throw createError({ statusCode: 400, statusMessage: "No rows to import." });
  if (rows.length > 500)
    throw createError({ statusCode: 400, statusMessage: "Please import at most 500 staff at a time." });

  const sb = await getUserClient(event);
  const { data: existing, error: existingError } = await sb
    .from("staff")
    .select("email, phone, first_name, last_name")
    .eq("business_id", businessId)
    .limit(5000);
  if (existingError) throw createError({ statusCode: 500, statusMessage: existingError.message });

  const knownEmails = new Set((existing ?? []).map((s: any) => (s.email ?? "").toLowerCase()).filter(Boolean));
  const knownPhones = new Set((existing ?? []).map((s: any) => digits(s.phone)).filter(Boolean));
  const knownNames = new Set(
    (existing ?? []).map((s: any) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim().toLowerCase()).filter(Boolean),
  );

  const skipped: { row: number; reason: string }[] = [];
  const toInsert: Record<string, unknown>[] = [];

  for (const item of rows) {
    const d = item.data ?? {};
    const parsed = staffSchema.safeParse({
      name: d.name,
      email: d.email || undefined,
      phone: d.phone || undefined,
      role: d.role || "Staff",
      active: String(d.active) !== "false",
      serviceIds: [],
    });
    if (!parsed.success) {
      skipped.push({ row: item.row, reason: parsed.error.issues[0]?.message ?? "Invalid data" });
      continue;
    }
    const s = parsed.data;
    const email = s.email?.toLowerCase() ?? "";
    const phone = digits(s.phone);
    const fullName = s.name.trim().toLowerCase();
    if ((email && knownEmails.has(email)) || (phone && knownPhones.has(phone)) || knownNames.has(fullName)) {
      skipped.push({ row: item.row, reason: "Already exists" });
      continue;
    }
    if (email) knownEmails.add(email);
    if (phone) knownPhones.add(phone);
    knownNames.add(fullName);

    const parts = s.name.trim().split(/\s+/);
    toInsert.push({
      business_id: businessId,
      first_name: parts[0] ?? "",
      last_name: parts.slice(1).join(" ") || "",
      email: email || null,
      phone: s.phone ?? null,
      job_title: s.role,
      status: s.active ? "ACTIVE" : "INACTIVE",
    });
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error } = await sb.from("staff").insert(chunk);
    if (error) throw createError({ statusCode: 500, statusMessage: `Import stopped after ${inserted} rows: ${error.message}` });
    inserted += chunk.length;
  }

  setResponseStatus(event, 201);
  return { inserted, skipped };
});
