<script setup lang="ts">
import { ArrowRight, Check, Smartphone, Monitor } from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/features",
  title: "Features",
  description:
    `Online booking, automatic reminders, staff hours, customer history, on-location jobs, QR attendance, Excel import and multi-currency — every feature of ${BRAND.name}.`,
});

const groups = [
  {
    title: "For your customers",
    text: "A booking page that feels like an app, without an app download.",
    items: [
      "Your own booking link to share anywhere",
      "Pick a service, a staff member and a free time",
      "Prices shown or hidden until a service is chosen",
      "Share location for on-site services",
      "Confirmation and reminder emails",
    ],
  },
  {
    title: "For you, the owner",
    text: "Today first. Everything else one tap away.",
    items: [
      "Today's schedule and upcoming bookings",
      "Bookings list with search and filters",
      "Calendar view by day and week",
      "Customers with visit history and notes",
      "Services with categories, prices and currency",
    ],
  },
  {
    title: "For your team",
    text: "Clear hours, clear jobs, clear attendance.",
    items: [
      "Working hours per staff member",
      "Jobs assigned to the right person",
      "On the way / On location status",
      "Enter and Exit with QR attendance",
      "WhatsApp hand-off with a map link",
    ],
  },
];
</script>

<template>
  <div>
    <SitePageHero
      eyebrow="Features"
      title="Everything you need to run your appointments."
      subtitle="Replace phone calls, paper books and WhatsApp chaos with one calm workspace — on your phone and your computer."
    >
      <NuxtLink to="/register" class="site-btn inline-flex min-h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 font-semibold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-700">
        Start free trial <ArrowRight :size="18" />
      </NuxtLink>
      <NuxtLink to="/pricing" class="site-btn inline-flex min-h-12 items-center rounded-2xl border border-stone-200 bg-white px-6 font-semibold text-stone-900 hover:border-stone-300">
        See pricing
      </NuxtLink>
    </SitePageHero>

    <section class="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="(f, i) in SITE_FEATURES"
          :key="f.title"
          v-reveal="(i % 3) * 80"
          class="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-900/5"
        >
          <span class="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 transition group-hover:scale-110">
            <component :is="f.icon" :size="22" />
          </span>
          <h2 class="mt-5 text-lg font-bold text-stone-900">{{ f.title }}</h2>
          <p class="mt-2 text-[15px] leading-7 text-stone-600">{{ f.text }}</p>
        </article>
      </div>
    </section>

    <section class="bg-white py-16 lg:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <h2 v-reveal class="text-center font-display text-3xl text-stone-900 sm:text-5xl">One app, three points of view</h2>
        <div class="mt-12 grid gap-4 lg:grid-cols-3">
          <article v-for="(g, i) in groups" :key="g.title" v-reveal="i * 90" class="rounded-3xl border border-stone-200 bg-[#fbfaf8] p-6 sm:p-8">
            <h3 class="text-xl font-bold text-stone-900">{{ g.title }}</h3>
            <p class="mt-1 text-sm text-stone-500">{{ g.text }}</p>
            <ul class="mt-6 space-y-3">
              <li v-for="item in g.items" :key="item" class="flex items-start gap-2.5 text-[15px] text-stone-700">
                <Check :size="18" class="mt-0.5 shrink-0 text-rose-600" /> {{ item }}
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-10 lg:py-24">
      <div>
        <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Phone first</p>
        <h2 v-reveal="60" class="mt-3 font-display text-3xl text-stone-900 sm:text-5xl">Feels like an app on your iPhone</h2>
        <p v-reveal="120" class="mt-4 text-base leading-7 text-stone-600 sm:text-lg">
          Add {{ BRAND.name }} to your home screen and it opens full-screen, with a bottom tab bar, big buttons and today's bookings first. On a computer you get the full table and calendar views.
        </p>
        <div v-reveal="160" class="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-stone-700">
          <span class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4"><Smartphone :size="16" class="text-rose-600" /> iPhone & Android</span>
          <span class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4"><Monitor :size="16" class="text-rose-600" /> Mac & Windows</span>
        </div>
      </div>
      <div v-reveal="120" class="px-2 sm:px-8 lg:px-0">
        <DeviceMockups />
      </div>
    </section>

    <SiteCta />
  </div>
</template>
