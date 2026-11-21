import type { H3Event } from "h3";
import { getRequestURL } from "h3";
import { PLANS, PLAN_CURRENCY, TRIAL_DAYS } from "../../app/utils/plans";
import { SITE_FAQS, SITE_FEATURES, SITE_INDUSTRIES, SITE_STEPS } from "../../app/utils/site-content";
import { BRAND } from "../../shared/utils/brand";

/** Public address of this website (no trailing slash). */
export const publicOrigin = (event: H3Event) => {
  const configured = String(useRuntimeConfig(event).public.siteUrl || "").replace(/\/+$/, "");
  return configured || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
};

/** Public pages, with a one-line summary each (llms.txt, Markdown home). */
export const KEY_PAGES = [
  { path: "/features", title: "Features", summary: "Everything the app does: online booking, reminders, staff, customers, on-location jobs." },
  { path: "/how-it-works", title: "How it works", summary: "Set up in about five minutes and share one booking link." },
  { path: "/industries", title: "Industries", summary: "Salons, clinics, pet care, towing, home services and more." },
  { path: "/pricing", title: "Pricing", summary: "Plans, prices and the free trial." },
  { path: "/faq", title: "FAQ", summary: "Common questions about the trial, data, countries and payments." },
  { path: "/help", title: "Help centre", summary: "Step-by-step guides for business owners and staff." },
  { path: "/about", title: "About", summary: `Who builds ${BRAND.name}.` },
  { path: "/contactus", title: "Contact", summary: "Questions, demos and support." },
  { path: "/register", title: "Start free trial", summary: "Create a business account." },
  { path: "/privacy", title: "Privacy policy", summary: "How personal data is handled (GDPR)." },
  { path: "/terms", title: "Terms of service", summary: "The rules for using the service." },
] as const;

const price = (n: number) => `${PLAN_CURRENCY === "EUR" ? "€" : PLAN_CURRENCY + " "}${n}`;

/** Plain data about the product, shared by Markdown, MCP and WebMCP tools. */
export const productOverview = (origin: string) => ({
  name: BRAND.name,
  url: origin,
  tagline: BRAND.tagline,
  description: BRAND.description,
  contactEmail: BRAND.email,
  basedIn: BRAND.basedIn,
  freeTrialDays: TRIAL_DAYS,
  features: SITE_FEATURES.map((f) => ({ title: f.title, text: f.text })),
  industries: SITE_INDUSTRIES.map((i) => ({ name: i.name, text: i.short })),
  howItWorks: SITE_STEPS.map((s) => ({ title: s.title, text: s.text })),
  pages: KEY_PAGES.map((p) => ({ title: p.title, url: `${origin}${p.path}`, summary: p.summary })),
});

export const pricingOverview = (origin: string) => ({
  currency: PLAN_CURRENCY,
  freeTrialDays: TRIAL_DAYS,
  note: "Prices are per month without VAT. The yearly price is the monthly price when paid yearly. No commission on bookings.",
  signUpUrl: `${origin}/register`,
  plans: PLANS.map((p) => ({ id: p.id, name: p.name, description: p.description, monthly: p.monthly, yearly: p.yearly, features: p.features })),
});

/** /llms.txt — https://llmstxt.org */
export const llmsTxt = (origin: string) =>
  [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.description}`,
    "",
    `${BRAND.name} is an online booking and appointment manager for small businesses. Customers book on a simple web page (no app needed); the business runs its day from a dashboard on the phone or computer. Free trial: ${TRIAL_DAYS} days, no card needed. Contact: ${BRAND.email}.`,
    "",
    "## Main pages",
    "",
    `- [Home](${origin}/): what ${BRAND.name} is and who it is for (also available as Markdown: send \`Accept: text/markdown\`, or open ${origin}/index.md)`,
    ...KEY_PAGES.map((p) => `- [${p.title}](${origin}${p.path}): ${p.summary}`),
    "",
    "## Plans",
    "",
    ...PLANS.map((p) => `- ${p.name}: ${price(p.monthly)}/month (${price(p.yearly)}/month paid yearly). ${p.description}`),
    "",
    "## For agents",
    "",
    `- MCP server (read-only, no sign-in): ${origin}/mcp, described at ${origin}/.well-known/mcp/server-card.json`,
    `- Sitemap: ${origin}/sitemap.xml`,
    "",
    "## Optional",
    "",
    `- [Privacy policy](${origin}/privacy)`,
    `- [Terms of service](${origin}/terms)`,
    "",
  ].join("\n");

/** Markdown version of the home page (served for Accept: text/markdown). */
export const homeMarkdown = (origin: string) =>
  [
    `# ${BRAND.name} — ${BRAND.tagline}`,
    "",
    BRAND.description,
    "",
    `[Start free trial](${origin}/register) · [Pricing](${origin}/pricing) · [Features](${origin}/features)`,
    "",
    "## Features",
    "",
    ...SITE_FEATURES.map((f) => `- **${f.title}**: ${f.text}`),
    "",
    "## How it works",
    "",
    ...SITE_STEPS.map((s, i) => `${i + 1}. **${s.title}**: ${s.text}`),
    "",
    "## Who it is for",
    "",
    ...SITE_INDUSTRIES.map((i) => `- **${i.name}**: ${i.short}`),
    "",
    "## Pricing",
    "",
    `Every plan starts with a ${TRIAL_DAYS}-day free trial, no card needed. Prices are per month without VAT.`,
    "",
    "| Plan | Monthly | Paid yearly | For |",
    "| --- | --- | --- | --- |",
    ...PLANS.map((p) => `| ${p.name} | ${price(p.monthly)} | ${price(p.yearly)} | ${p.description} |`),
    "",
    "## Frequently asked questions",
    "",
    ...SITE_FAQS.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    "## Contact",
    "",
    `- Email: ${BRAND.email}`,
    `- Based in: ${BRAND.basedIn}`,
    `- Website: ${origin}/`,
    "",
  ].join("\n");
