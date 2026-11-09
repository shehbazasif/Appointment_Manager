<script setup lang="ts">
definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/terms",
  title: "Terms of Service",
  description: `The terms for using ${BRAND.name}: accounts, trial, plans, acceptable use, data and cancellation.`,
});
// NOTE: this is a solid starting template. Have it reviewed by a lawyer for your company details.
</script>

<template>
  <SiteLegal eyebrow="Legal" title="Terms of Service" updated="9 November 2026">
    <h2>1. Agreement</h2>
    <p>
      By creating an account or using {{ BRAND.name }} you agree to these terms. If you sign up for a business, you
      confirm that you are allowed to accept them on its behalf.
    </p>

    <h2>2. The service</h2>
    <p>
      {{ BRAND.name }} is software for online booking, appointment management, staff hours, attendance and customer
      messages. We are not a marketplace: your customers book directly with you and we take no commission on your sales.
    </p>

    <h2>3. Free trial and plans</h2>
    <p>
      New accounts start with a free trial of {{ TRIAL_DAYS }} days. After the trial you can choose a paid plan, billed
      monthly or yearly. Prices are listed on the <NuxtLink to="/pricing">pricing page</NuxtLink> and may change; we
      will tell you at least 30 days before a price change affects you.
    </p>

    <h2>4. Your responsibilities</h2>
    <ul>
      <li>Keep your sign-in details private and tell us if you think your account is at risk.</li>
      <li>Keep your services, prices and working hours correct.</li>
      <li>Have a valid reason (for example consent or a booking) before you contact customers by email or WhatsApp.</li>
      <li>Do not use the service for anything illegal, for spam, or to harm others.</li>
    </ul>

    <h2>5. Your data</h2>
    <p>
      Your business data belongs to you. We process it only to provide the service, as described in our
      <NuxtLink to="/privacy">Privacy Policy</NuxtLink>. You can ask us for a copy of your data at any time.
    </p>

    <h2>6. Availability</h2>
    <p>
      We work to keep {{ BRAND.name }} available at all times, but there may be short interruptions for maintenance or
      reasons outside our control. We are not liable for indirect losses such as lost profits, to the extent the law allows.
    </p>

    <h2>7. Cancellation</h2>
    <p>
      You can cancel at any time. Monthly plans end at the end of the current month; yearly plans run until the end of the
      paid year. We may suspend accounts that break these terms, after warning you where possible.
    </p>

    <h2>8. Law</h2>
    <p>These terms are governed by Greek law, without limiting any rights you have as a consumer in your own country.</p>

    <h2>9. Contact</h2>
    <p>Questions about these terms: <a :href="`mailto:${BRAND.email}`">{{ BRAND.email }}</a>.</p>
  </SiteLegal>
</template>
