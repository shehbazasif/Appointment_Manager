/**
 * Seeds demo data into the Supabase tenant schema.
 *
 * This script is THE ONLY place that still needs elevated access, because it
 * creates data for two different users (admin + business owner) in one run.
 *
 * Two options — pick one:
 *
 * A) Preferred: run the equivalent inserts from the Supabase SQL Editor
 *    (Table Editor → insert rows manually). No key needed at all.
 *
 * B) Temporary service key: set SUPABASE_SERVICE_KEY in .env ONLY while
 *    running this script, then REMOVE it from .env afterwards. The app
 *    itself never reads that variable (see server/utils/supabase.ts).
 *
 * Required env vars (see .env.example):
 *   SUPABASE_URL, SUPABASE_KEY
 *   SUPABASE_ADMIN_USER_ID, SUPABASE_BUSINESS_USER_ID (UUIDs from Auth → Users)
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
// Seeding impersonates users by generating tokens? Not possible with anon key.
// We require the service key for this one-off administrative task (option B),
// or advise running the SQL by hand (option A).
const key = process.env.SUPABASE_SERVICE_KEY;
const adminUserId = process.env.SUPABASE_ADMIN_USER_ID;
const businessUserId = process.env.SUPABASE_BUSINESS_USER_ID;

if (!url || !key)
  throw new Error(
    "Seeding needs elevated access. Either run the inserts from the Supabase SQL Editor (preferred, no key), or temporarily add SUPABASE_SERVICE_KEY to .env for this script only.",
  );
if (!adminUserId || !businessUserId)
  throw new Error(
    "SUPABASE_ADMIN_USER_ID and SUPABASE_BUSINESS_USER_ID are required. Create the two users in Supabase (Auth → Users) and copy their UUIDs.",
  );

const sb = createClient(url, key, { auth: { persistSession: false } });

const adminEmail = "m.shahbazasif512@gmail.com";
const businessEmail = "riders@feroferto.gr";

try {
  // Mirror the auth users into profiles
  for (const [id, firstName, lastName] of [
    [adminUserId, "M.", "Shahbazasif"],
    [businessUserId, "Fero", "Ferto"],
  ] as const) {
    const { error } = await sb.from("profiles").upsert(
      { id, first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (error) throw error;
  }

  // Platform business for the SUPER_ADMIN
  const { data: platform, error: platformError } = await sb
    .from("businesses")
    .upsert(
      { slug: "rantevouos-platform", name: "RantevouOS Platform", email: adminEmail },
      { onConflict: "slug" },
    )
    .select()
    .single();
  if (platformError) throw platformError;

  // Demo business
  const { data: business, error: businessError } = await sb
    .from("businesses")
    .upsert(
      {
        slug: "fero-ferto",
        name: "Fero Ferto",
        email: businessEmail,
        city: "Athens",
        country: "Greece",
        timezone: "Europe/Athens",
        currency: "EUR",
        booking_active: true,
      },
      { onConflict: "slug" },
    )
    .select()
    .single();
  if (businessError) throw businessError;

  // Memberships
  for (const [businessId, userId, role] of [
    [platform.id, adminUserId, "SUPER_ADMIN"],
    [business.id, businessUserId, "OWNER"],
  ] as const) {
    const { data: existing } = await sb
      .from("business_members")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) {
      const { error } = await sb
        .from("business_members")
        .insert({ business_id: businessId, user_id: userId, role, status: "ACTIVE" });
      if (error) throw error;
    }
  }

  await sb
    .from("business_settings")
    .upsert(
      { business_id: business.id, currency: "EUR", timezone: "Europe/Athens" },
      { onConflict: "business_id" },
    );

  // Services (idempotent by name)
  const seededServices = [
    { name: "Classic manicure", duration_minutes: 45, price: 18 },
    { name: "Gel manicure", duration_minutes: 60, price: 28 },
    { name: "Signature facial", duration_minutes: 75, price: 45 },
  ];
  for (const service of seededServices) {
    const { data: existing } = await sb
      .from("services")
      .select("id")
      .eq("business_id", business.id)
      .eq("name", service.name)
      .maybeSingle();
    if (!existing) {
      const { error } = await sb
        .from("services")
        .insert({ ...service, business_id: business.id, currency: "EUR", status: "ACTIVE" });
      if (error) throw error;
    }
  }

  // Staff
  const seededStaff = [
    { first_name: "Fero", last_name: "Ferto", job_title: "Owner", email: businessEmail },
    {
      first_name: "Eleni",
      last_name: "Georgiou",
      job_title: "Nail artist",
      email: "eleni@feroferto.gr",
    },
  ];
  for (const member of seededStaff) {
    const { data: existing } = await sb
      .from("staff")
      .select("id")
      .eq("business_id", business.id)
      .eq("email", member.email)
      .maybeSingle();
    if (!existing) {
      const { error } = await sb
        .from("staff")
        .insert({ ...member, business_id: business.id, status: "ACTIVE" });
      if (error) throw error;
    }
  }

  console.log(
    JSON.stringify({ adminEmail, businessEmail, businessSlug: business.slug }, null, 2),
  );
} catch (error: any) {
  console.error("Seed failed:", error?.message ?? error);
  process.exit(1);
}
