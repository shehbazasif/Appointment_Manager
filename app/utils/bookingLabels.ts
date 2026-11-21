/**
 * How a booking's services and price are shown everywhere (lists, cards,
 * WhatsApp job message). Bookings can hold several services (each with how
 * many pets) and an agreed price; older bookings have one service only.
 */
type BookingLike = {
  appointment: { items?: { name: string; qty: number }[] | null; price?: number | null; petName?: string | null };
  service: { name: string; priceCents: number; currency?: string | null };
};

/** "Full grooming ×2 + Touch-up" */
export const bookingServices = (b: BookingLike) => {
  const items = b.appointment.items;
  if (!items?.length) return b.service.name;
  return items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(" + ");
};

/** "Full grooming ×2 + Touch-up (Max)" — with the pet name when there is one */
export const bookingLabel = (b: BookingLike) =>
  b.appointment.petName ? `${bookingServices(b)} (${b.appointment.petName})` : bookingServices(b);

/** agreed price of the booking, else the service's price */
export const bookingPrice = (b: BookingLike) =>
  b.appointment.price != null
    ? formatMoney(Math.round(b.appointment.price * 100), b.service.currency)
    : formatMoney(b.service.priceCents, b.service.currency);
