import { clearSession } from "../../utils/session";

export default defineEventHandler((event) => {
  clearSession(event);
  return { success: true };
});
