import { readBody, setResponseStatus } from "h3";
import { customerSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const digits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const body = await readBody(event);
  const rows: { row: number; data: Record<string, unknown> }[] = Array.isArray(body?.rows) ? body.rows : [];
  if (!rows.length) throw createError({ statusCode: 400, statusMessage: "No rows to import." });
  if (rows.length > 2000)
    throw createError({ statusCode: 400, statusMessage: "Please import at most 2000 rows at a time." });

  const sb = await getUserClient(event);
  const { data: existing, error: existingError } = await sb
    .from("customers")
    .select("email, phone")
    .eq("business_id", businessId)
    .limit(20000);
  if (existingError) throw createError({ statusCode: 500, statusMessage: existingError.message });

  const knownEmails = new Set((existing ?? []).map((c: any) => (c.email ?? "").toLowerCase()).filter(Boolean));
  const knownPhones = new Set((existing ?? []).map((c: any) => digits(c.phone)).filter(Boolean));

  const skipped: { row: number; reason: string }[] = [];
  const toInsert: Record<string, unknown>[] = [];

  for (const item of rows) {
    const parsed = customerSchema.safeParse(item.data);
    if (!parsed.success) {
      skipped.push({ row: item.row, reason: parsed.error.issues[0]?.message ?? "Invalid data" });
      continue;
    }
    const c = parsed.data;
    const email = c.email?.toLowerCase() ?? "";
    const phone = digits(c.phone);
    if ((email && knownEmails.has(email)) || (phone && knownPhones.has(phone))) {
      skipped.push({ row: item.row, reason: "Already exists" });
      continue;
    }
    if (email) knownEmails.add(email);
    if (phone) knownPhones.add(phone);
    toInsert.push({
      business_id: businessId,
      first_name: c.firstName,
      last_name: c.lastName,
      email: email || null,
      phone: c.phone,
      notes: c.notes ?? null,
    });
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200);
    const { error } = await sb.from("customers").insert(chunk);
    if (error) throw createError({ statusCode: 500, statusMessage: `Import stopped after ${inserted} rows: ${error.message}` });
    inserted += chunk.length;
  }

  setResponseStatus(event, 201);
  return { inserted, skipped };
});
