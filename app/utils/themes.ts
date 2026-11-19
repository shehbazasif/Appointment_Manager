/**
 * Colour themes a business can pick (Settings → Theme). The chosen colour
 * becomes the accent of the dashboard and the public booking page.
 * `null` = the built-in default look.
 */
export interface ThemePreset {
  id: string;
  name: string;
  color: string | null;
  swatch: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "default", name: "Default (Blue)", color: null, swatch: "#2563eb" },
  { id: "indigo", name: "Indigo", color: "#4f6bed", swatch: "#4f6bed" },
  { id: "rose", name: "Rose", color: "#e11d48", swatch: "#e11d48" },
  { id: "medical", name: "Medical Teal", color: "#0d9488", swatch: "#0d9488" },
  { id: "sky", name: "Sky Blue", color: "#0284c7", swatch: "#0284c7" },
  { id: "emerald", name: "Emerald", color: "#059669", swatch: "#059669" },
  { id: "violet", name: "Violet", color: "#7c3aed", swatch: "#7c3aed" },
  { id: "amber", name: "Amber", color: "#d97706", swatch: "#d97706" },
  { id: "slate", name: "Slate", color: "#334155", swatch: "#334155" },
];

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

/** Default accent when a business has not picked a theme colour. */
export const DEFAULT_BRAND = "#2563eb";

/**
 * Turns on the design system (<html class="ui">) on the page that calls it
 * (dashboard layout, booking page) and applies the business theme colour.
 */
export function useBrandTheme(color: () => string | null | undefined) {
  useHead(() => {
    const c = color();
    return {
      htmlAttrs: {
        class: "ui",
        ...(isHexColor(c) ? { style: `--brand-choice: ${c}` } : {}),
      },
    };
  });
}
