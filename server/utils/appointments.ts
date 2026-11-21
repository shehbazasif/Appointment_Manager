/** Shape one appointments row (with customer/service/staff joins) for the UI. */
export const mapAppointmentRow = (row: any) => ({
  appointment: {
    id: row.id,
    organizationId: row.business_id,
    customerId: row.customer_id,
    staffId: row.staff_id,
    serviceId: row.service_id,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    source: row.booking_source,
    notes: row.notes,
    petName: row.pet_name ?? null,
    // several services in one booking: [{ serviceId, name, qty, price }]
    items: Array.isArray(row.items) ? row.items : null,
    // agreed price (major units) — null means "the service's price"
    price: row.price != null ? Number(row.price) : null,
    fieldStatus: row.field_status ?? null,
    // queue token for the day of the appointment (null until the SQL update is run)
    tokenNumber: row.token_number ?? null,
    tokenDate: row.token_date ?? null,
    location:
      (row.location_lat != null && row.location_lng != null) || row.location_url || row.location_note
        ? {
            lat: row.location_lat ?? null,
            lng: row.location_lng ?? null,
            accuracy: row.location_accuracy_m ?? null,
            note: row.location_note ?? null,
            url: row.location_url ?? null,
          }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  },
  customer: row.customer
    ? {
        id: row.customer.id,
        firstName: row.customer.first_name ?? "",
        lastName: row.customer.last_name ?? "",
        phone: row.customer.phone ?? "",
        email: row.customer.email ?? null,
      }
    : null,
  service: row.service
    ? {
        id: row.service.id,
        name: row.service.name,
        durationMinutes: row.service.duration_minutes,
        priceCents: row.service.price != null ? Math.round(Number(row.service.price) * 100) : 0,
        currency: row.service.currency ?? null,
        accent: row.service.accent ?? "#ca7481",
      }
    : null,
  staff: row.staff
    ? {
        id: row.staff.id,
        name: [row.staff.first_name, row.staff.last_name].filter(Boolean).join(" "),
        role: row.staff.job_title ?? "",
        phone: row.staff.phone ?? null,
      }
    : null,
});
