import "dotenv/config";
import argon2 from "argon2";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";
import {
  memberships,
  organizations,
  services,
  staff,
  staffServices,
  users,
} from "./schema";

const databaseUrl = process.env.DATABASE_URL;
const adminPassword = process.env.ADMIN_PASSWORD;
const businessPassword = process.env.BUSINESS_PASSWORD;

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!adminPassword || !businessPassword)
  throw new Error("ADMIN_PASSWORD and BUSINESS_PASSWORD are required.");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
const database = drizzle(client);

try {
  const adminEmail = "m.shahbazasif512@gmail.com";
  const businessEmail = "riders@feroferto.gr";
  const [adminHash, businessHash] = await Promise.all([
    argon2.hash(adminPassword, { type: argon2.argon2id }),
    argon2.hash(businessPassword, { type: argon2.argon2id }),
  ]);

  const [admin] = await database
    .insert(users)
    .values({
      email: adminEmail,
      passwordHash: adminHash,
      firstName: "M.",
      lastName: "Shahbazasif",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash: adminHash, updatedAt: new Date(), status: "ACTIVE" },
    })
    .returning();
  const [businessOwner] = await database
    .insert(users)
    .values({
      email: businessEmail,
      passwordHash: businessHash,
      firstName: "Fero",
      lastName: "Ferto",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: businessHash,
        updatedAt: new Date(),
        status: "ACTIVE",
      },
    })
    .returning();

  const [platform] = await database
    .insert(organizations)
    .values({
      name: "RantevouOS Platform",
      slug: "rantevouos-platform",
      email: adminEmail,
      bookingActive: false,
    })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: { updatedAt: new Date() },
    })
    .returning();
  const [business] = await database
    .insert(organizations)
    .values({
      name: "Fero Ferto",
      slug: "fero-ferto",
      email: businessEmail,
      city: "Athens",
      country: "Greece",
      timezone: "Europe/Athens",
      currency: "EUR",
      bookingActive: true,
    })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: { email: businessEmail, bookingActive: true, updatedAt: new Date() },
    })
    .returning();

  await database
    .insert(memberships)
    .values({
      organizationId: platform.id,
      userId: admin.id,
      role: "SUPER_ADMIN",
    })
    .onConflictDoNothing();
  await database
    .insert(memberships)
    .values({
      organizationId: business.id,
      userId: businessOwner.id,
      role: "OWNER",
    })
    .onConflictDoNothing();

  const seededServices = [
    {
      name: "Classic manicure",
      category: "Nails",
      durationMinutes: 45,
      priceCents: 1800,
      accent: "#e6a4a4",
    },
    {
      name: "Gel manicure",
      category: "Nails",
      durationMinutes: 60,
      priceCents: 2800,
      accent: "#d77f90",
    },
    {
      name: "Signature facial",
      category: "Skin",
      durationMinutes: 75,
      priceCents: 4500,
      accent: "#78b4a7",
    },
  ];
  const insertedServices = [];
  for (const service of seededServices) {
    const existing = await database.query.services.findFirst({
      where: and(
        eq(services.organizationId, business.id),
        eq(services.name, service.name),
      ),
    });
    insertedServices.push(
      existing ??
        (
          await database
            .insert(services)
            .values({ ...service, organizationId: business.id })
            .returning()
        )[0],
    );
  }

  const seededStaff = [
    {
      name: "Fero Ferto",
      role: "Owner",
      email: businessEmail,
      phone: "+30 690 000 0000",
    },
    {
      name: "Eleni Georgiou",
      role: "Nail artist",
      email: "eleni@feroferto.gr",
      phone: "+30 690 000 0001",
    },
  ];
  const insertedStaff = [];
  for (const member of seededStaff) {
    const existing = await database.query.staff.findFirst({
      where: and(
        eq(staff.organizationId, business.id),
        eq(staff.email, member.email),
      ),
    });
    insertedStaff.push(
      existing ??
        (
          await database
            .insert(staff)
            .values({ ...member, organizationId: business.id })
            .returning()
        )[0],
    );
  }
  for (const member of insertedStaff)
    for (const service of insertedServices)
      await database
        .insert(staffServices)
        .values({ staffId: member.id, serviceId: service.id })
        .onConflictDoNothing();

  console.log(
    JSON.stringify(
      { adminEmail, businessEmail, businessSlug: business.slug },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
