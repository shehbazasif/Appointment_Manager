/**
 * schema.org structured data for the home page: the company (Organization),
 * the website (WebSite), the product (SoftwareApplication with its plans)
 * and the page itself (WebPage). Search engines and AI agents read this.
 */
export function useSiteJsonLd() {
  const origin = getSiteOrigin() || useRequestURL().origin;
  const orgId = `${origin}/#organization`;
  const siteId = `${origin}/#website`;
  const appId = `${origin}/#software`;
  const sameAs = [...BRAND.sameAs].filter((u) => /^https:\/\//.test(u));
  const [city, country] = BRAND.basedIn.split(",").map((x) => x.trim());

  const graph = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: BRAND.name,
      url: `${origin}/`,
      logo: { "@type": "ImageObject", url: `${origin}/icon-512.png`, width: 512, height: 512 },
      description: BRAND.description,
      email: BRAND.email,
      ...(BRAND.telephone ? { telephone: BRAND.telephone } : {}),
      address: { "@type": "PostalAddress", addressLocality: city, addressCountry: country },
      contactPoint: [
        { "@type": "ContactPoint", contactType: "customer support", email: BRAND.email, ...(BRAND.telephone ? { telephone: BRAND.telephone } : {}), url: `${origin}/contactus`, availableLanguage: ["en", "el", "ar", "fr", "it"] },
      ],
      ...(sameAs.length ? { sameAs } : {}),
    },
    {
      "@type": "WebSite",
      "@id": siteId,
      url: `${origin}/`,
      name: BRAND.name,
      description: BRAND.tagline,
      publisher: { "@id": orgId },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": appId,
      name: BRAND.name,
      url: `${origin}/`,
      description: BRAND.description,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Appointment scheduling",
      operatingSystem: "Web, Android, iOS",
      publisher: { "@id": orgId },
      featureList: SITE_FEATURES.map((f) => f.title),
      audience: { "@type": "BusinessAudience", audienceType: SITE_INDUSTRIES.map((i) => i.name).join(", ") },
      offers: PLANS.map((p) => ({
        "@type": "Offer",
        name: `${p.name} plan`,
        description: p.description,
        price: p.monthly,
        priceCurrency: PLAN_CURRENCY,
        url: `${origin}/pricing`,
        category: "subscription",
        priceSpecification: { "@type": "UnitPriceSpecification", price: p.monthly, priceCurrency: PLAN_CURRENCY, unitCode: "MON", valueAddedTaxIncluded: false },
      })),
    },
    {
      "@type": "WebPage",
      "@id": `${origin}/#webpage`,
      url: `${origin}/`,
      name: brandTitle(),
      description: BRAND.description,
      isPartOf: { "@id": siteId },
      about: { "@id": appId },
      primaryImageOfPage: `${origin}/images/salon.webp`,
      inLanguage: "en",
    },
  ];

  useHead({
    script: [{ key: "site-jsonld", type: "application/ld+json", innerHTML: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }],
  });
}
