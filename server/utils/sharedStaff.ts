/**
 * Drivers (staff) of the head office are shared with its branches.
 * The businesses whose staff this business may use: itself and, for a
 * branch, its head office.
 */
export const staffOwners = (businessId: string, business: Record<string, any> | null | undefined) =>
  business?.parent_business_id ? [businessId, String(business.parent_business_id)] : [businessId];

/** One driver, one job at a time. */
export const staffBusyError = () =>
  createError({
    statusCode: 409,
    statusMessage: "This staff member already has another appointment at this time.",
  });
