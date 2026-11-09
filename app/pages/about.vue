<script setup lang="ts">
import { Heart, Smartphone, Globe2, ShieldCheck } from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/about",
  title: "About",
  description: `Why we build ${BRAND.name}: simple booking software for the small businesses that keep our cities running.`,
  image: "/images/team.webp",
});

const values = [
  { icon: Heart, title: "Small business first", text: "We design for the owner who is also the receptionist, the accountant and the one cutting hair at 9am." },
  { icon: Smartphone, title: "Phone in your hand", text: "Most days are run from a phone. Every screen is built to work with one thumb, big buttons and clear words." },
  { icon: Globe2, title: "Local, everywhere", text: "Your country, your time zone, your currency. Athens, Doha, Dubai or London — it should just feel right." },
  { icon: ShieldCheck, title: "Your data is yours", text: "Each business only sees its own data. We never sell it and we never show it to other businesses." },
];
</script>

<template>
  <div>
    <SitePageHero
      eyebrow="About us"
      title="Booking software for the businesses that keep cities running."
      subtitle="Salons, clinics, groomers, tow trucks, electricians. Busy people who would rather do their work than answer the phone."
    />

    <section class="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
      <div v-reveal class="overflow-hidden rounded-[2rem] shadow-xl shadow-stone-900/10">
        <img src="/images/team.webp" alt="Two colleagues celebrating with a high five at a shared desk" width="960" height="640" loading="lazy" decoding="async" class="aspect-[3/2] w-full object-cover" />
      </div>
      <div class="space-y-5 text-base leading-8 text-stone-600">
        <h2 v-reveal class="font-display text-3xl text-stone-900 sm:text-4xl">Our story</h2>
        <p v-reveal="60">
          Small appointment businesses lose hours every week to phone calls, double bookings and paper diaries. Most booking tools are either too complicated or built for big chains, and many don't fit businesses that go to the customer.
        </p>
        <p v-reveal="120">
          {{ BRAND.name }} is built from {{ BRAND.basedIn }} to fix that: a booking page customers love, today's schedule first for the owner, and simple tools for the team — including on-location jobs for businesses that go to the customer.
        </p>
        <p v-reveal="180">
          It is made for appointment businesses in Greece, the Gulf and beyond, each in their own time zone and currency.
        </p>
      </div>
    </section>

    <section class="bg-white py-16 lg:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <h2 v-reveal class="text-center font-display text-3xl text-stone-900 sm:text-5xl">What we care about</h2>
        <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article v-for="(v, i) in values" :key="v.title" v-reveal="i * 80" class="rounded-3xl border border-stone-200 bg-[#fbfaf8] p-6">
            <span class="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><component :is="v.icon" :size="22" /></span>
            <h3 class="mt-5 text-lg font-bold text-stone-900">{{ v.title }}</h3>
            <p class="mt-2 text-[15px] leading-7 text-stone-600">{{ v.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <SiteCta title="Let's make your days easier." />
  </div>
</template>
