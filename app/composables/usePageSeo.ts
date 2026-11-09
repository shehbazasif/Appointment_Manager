/**
 * Title, description, canonical URL and Open Graph / Twitter tags for a
 * public page. `path` is the page path, e.g. "/pricing".
 */
export function usePageSeo(opts: { title?: string; description?: string; path: string; image?: string }) {
  const url = useRequestURL();
  const origin = getSiteOrigin() || url.origin;
  const canonical = `${origin}${opts.path === "/" ? "" : opts.path}` || origin;
  const title = brandTitle(opts.title);
  const description = opts.description ?? BRAND.description;
  const image = `${origin}${opts.image ?? "/images/salon.webp"}`;

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: "website",
    ogUrl: canonical,
    ogSiteName: BRAND.name,
    ogImage: image,
    twitterCard: "summary_large_image",
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
  });
  useHead({ link: [{ rel: "canonical", href: canonical }] });
}
