import { computed } from "vue";

type Dict = Record<string, string>;

/** Lazy loaders: only the language in use is downloaded. */
const loaders: Record<string, () => Promise<Dict>> = {
  el: () => import("~/locales/el").then((m) => m.default),
  ar: () => import("~/locales/ar").then((m) => m.default),
  fr: () => import("~/locales/fr").then((m) => m.default),
  it: () => import("~/locales/it").then((m) => m.default),
};

/** Cookie set when a person picks a language themselves (overrides the business default). */
export const LANG_COOKIE = "lang_user";
/** Last known business language (so pages render in it without a flash). */
export const BIZ_LANG_COOKIE = "lang_biz";

export const useLocale = () => useState<LocaleCode>("locale", () => DEFAULT_LOCALE);
const useDicts = () => useState<Record<string, Dict>>("locale-dicts", () => ({}));

/** Load a language's dictionary (if needed) and switch to it. */
export async function setLocale(code: string | null | undefined) {
  const next: LocaleCode = isLocale(code) ? code : DEFAULT_LOCALE;
  // grab state before any await (Nuxt context is lost after awaiting)
  const dicts = useDicts();
  const locale = useLocale();
  if (next !== "en" && !dicts.value[next]) {
    try {
      dicts.value = { ...dicts.value, [next]: await loaders[next]!() };
    } catch {
      /* keep English if the file cannot load */
    }
  }
  locale.value = next;
}

/**
 * Pick the language for a page: the person's own choice (cookie) wins,
 * otherwise the business language, otherwise English.
 */
export async function applyLocale(businessLanguage?: string | null) {
  const own = useCookie<string | null>(LANG_COOKIE, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  // remember the business language too, so the next page load renders in it right away
  const biz = useCookie<string | null>(BIZ_LANG_COOKIE, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  if (isLocale(businessLanguage)) biz.value = businessLanguage;
  await setLocale(isLocale(own.value) ? own.value : businessLanguage);
}

/** On app start: personal choice, then the last known business language. */
export async function initLocale() {
  const own = useCookie<string | null>(LANG_COOKIE);
  const biz = useCookie<string | null>(BIZ_LANG_COOKIE);
  await setLocale(isLocale(own.value) ? own.value : biz.value);
}

/** Remember a language the person picked on this device. */
export async function chooseLocale(code: LocaleCode) {
  useCookie<string | null>(LANG_COOKIE, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax" }).value = code;
  await setLocale(code);
}

/** Forget the personal choice and follow the business language again. */
export async function followBusinessLocale(businessLanguage?: string | null) {
  useCookie<string | null>(LANG_COOKIE).value = null;
  await setLocale(businessLanguage);
}

/**
 * t("Today's schedule") → translated text. Keys are the English text itself.
 * Placeholders: t("{n} bookings", { n: 4 }).
 */
export function useT() {
  const locale = useLocale();
  const dicts = useDicts();
  const t = (key: string, params?: Record<string, string | number | null | undefined>) => {
    let s = (locale.value !== "en" && dicts.value[locale.value]?.[key]) || key;
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? m) as string);
    return s;
  };
  const info = computed(() => localeInfo(locale.value));
  return {
    t,
    locale,
    /** "ltr" or "rtl" */
    dir: computed(() => info.value.dir),
    /** BCP-47 tag for Intl / toLocaleString, e.g. "el-GR" */
    intl: computed(() => info.value.intl),
  };
}

/** Sets <html lang dir> for translated pages (dashboard, booking page). */
export function useLocaleHead() {
  const { locale, dir } = useT();
  useHead({ htmlAttrs: { lang: locale, dir } });
}
