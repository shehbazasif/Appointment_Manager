<script setup lang="ts">
definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/faq",
  title: "FAQ",
  description: `Answers about the free trial, online booking, reminders, on-location jobs, data import, currencies and data privacy in ${BRAND.name}.`,
});

const more = [
  {
    q: "Can I hide prices on my booking page?",
    a: "Yes. In Settings, turn on “Hide prices on service list”. Customers see the price only after they choose a service.",
  },
  {
    q: "Can each staff member have their own hours?",
    a: "Yes. Set working hours per person. Customers only see times when the chosen staff member is free.",
  },
  {
    q: "How does QR attendance work?",
    a: "Each staff member gets a personal QR badge (print it or keep it on their phone). On the Attendance page, tap Enter or Exit and scan the badge with your phone or tablet. You see who is in and their hours.",
  },
  {
    q: "Do you take a commission on bookings?",
    a: "No. You pay a flat monthly or yearly plan. We never take a share of your sales.",
  },
];

useHead({
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [...SITE_FAQS, ...more].map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    },
  ],
});
</script>

<template>
  <div>
    <SitePageHero eyebrow="FAQ" title="Frequently asked questions" :subtitle="`Quick answers about ${BRAND.name}. Can't find yours? Send us a message.`" />
    <section class="mx-auto max-w-3xl space-y-10 px-4 pb-8 sm:px-6">
      <div>
        <h2 class="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-stone-500">Getting started</h2>
        <SiteFaq :items="SITE_FAQS" />
      </div>
      <div>
        <h2 class="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-stone-500">Using the app</h2>
        <SiteFaq :items="more" />
      </div>
    </section>
    <SiteCta title="Still have a question?" text="Send us a message and a real person will answer." />
  </div>
</template>
