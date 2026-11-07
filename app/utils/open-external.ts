import { ref, onMounted } from "vue";

/** True on phones / tablets, or when running as a home-screen app. */
export const prefersSameTabLinks = () => {
  if (!import.meta.client) return false;
  const standalone =
    (navigator as any).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches;
  const phone = window.matchMedia?.("(max-width: 767px)").matches;
  const mobileUa = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return Boolean(standalone || phone || mobileUa);
};

/**
 * Open wa.me / sms: / tel: links. On phones this is a normal navigation, so
 * iOS hands it straight to the WhatsApp / Messages app (no popup blocker, and
 * it also works inside the "Add to Home Screen" app). On desktop a new tab.
 */
export const openExternalLink = (url: string) => {
  if (!url || !import.meta.client) return;
  if (prefersSameTabLinks()) {
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

/** `target` for <a> tags pointing at wa.me: same tab on phones, new tab on desktop. */
export const useExternalLinkTarget = () => {
  const target = ref<string | undefined>("_blank");
  onMounted(() => {
    target.value = prefersSameTabLinks() ? undefined : "_blank";
  });
  return target;
};
