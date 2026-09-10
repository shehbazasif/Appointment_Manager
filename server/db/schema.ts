import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const membershipRole = pgEnum("membership_role", [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "STAFF",
]);
export const recordStatus = pgEnum("record_status", ["ACTIVE", "INACTIVE"]);
export const appointmentStatus = pgEnum("appointment_status", [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
]);
export const appointmentSource = pgEnum("appointment_source", [
  "ONLINE",
  "MANUAL",
]);
export const notificationStatus = pgEnum("notification_status", [
  "QUEUED",
  "SENT",
  "FAILED",
  "SIMULATED",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country").notNull().default("Greece"),
  timezone: text("timezone").notNull().default("Europe/Athens"),
  currency: text("currency").notNull().default("EUR"),
  status: recordStatus("status").notNull().default("ACTIVE"),
  bookingActive: boolean("booking_active").notNull().default(false),
  ...timestamps,
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  status: recordStatus("status").notNull().default("ACTIVE"),
  ...timestamps,
});

export const authChallenges = pgTable("auth_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamps.createdAt,
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("STAFF"),
    status: recordStatus("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (table) => [unique().on(table.organizationId, table.userId)],
);

export const staff = pgTable("staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  priceCents: integer("price_cents").notNull(),
  active: boolean("active").notNull().default(true),
  accent: text("accent").notNull().default("#ca7481"),
  ...timestamps,
});

export const staffServices = pgTable(
  "staff_services",
  {
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [unique().on(table.staffId, table.serviceId)],
);

export const businessHours = pgTable(
  "business_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [unique().on(table.organizationId, table.dayOfWeek)],
);

export const blockedTimes = pgTable("blocked_times", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id").references(() => staff.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
  createdAt: timestamps.createdAt,
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  notes: text("notes"),
  ...timestamps,
});

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staff.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  status: appointmentStatus("status").notNull().default("PENDING"),
  source: appointmentSource("source").notNull().default("MANUAL"),
  notes: text("notes"),
  ...timestamps,
});

export const appointmentStatusHistory = pgTable("appointment_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  fromStatus: appointmentStatus("from_status"),
  toStatus: appointmentStatus("to_status").notNull(),
  changedByUserId: uuid("changed_by_user_id").references(() => users.id),
  createdAt: timestamps.createdAt,
});

export const notificationJobs = pgTable("notification_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  customerId: uuid("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  channel: text("channel").notNull(),
  type: text("type").notNull(),
  recipient: text("recipient").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  status: notificationStatus("status").notNull().default("QUEUED"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  error: text("error"),
  ...timestamps,
});

export const organizationRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  staff: many(staff),
  services: many(services),
  customers: many(customers),
  appointments: many(appointments),
  notificationJobs: many(notificationJobs),
}));
export const membershipRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));
export const appointmentRelations = relations(
  appointments,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [appointments.organizationId],
      references: [organizations.id],
    }),
    customer: one(customers, {
      fields: [appointments.customerId],
      references: [customers.id],
    }),
    staff: one(staff, {
      fields: [appointments.staffId],
      references: [staff.id],
    }),
    service: one(services, {
      fields: [appointments.serviceId],
      references: [services.id],
    }),
    history: many(appointmentStatusHistory),
  }),
);
