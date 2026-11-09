<script setup lang="ts">
import { ArrowRight, UserPlus, Share2, Smartphone, Check } from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/how-it-works",
  title: "How it works",
  description: `Create your business, share your booking link and run the day from your phone — see how ${BRAND.name} works in three simple steps.`,
});

const icons = [UserPlus, Share2, Smartphone];
const details = [
  ["Choose your country — time zone and currency are set for you", "Add services with price, duration and category", "Set opening hours and staff working hours"],
  ["Copy your personal booking link", "Add it to Instagram, Google Maps or your website", "Send it to customers on WhatsApp"],
  ["See today's bookings first when you open the app", "Check customers in, or mark jobs On the way", "Reminders and confirmations go out by themselves"],
];
</script>

<template>
  <div>
    <SitePageHero
      eyebrow="How it works"
      title="From sign-up to your first booking in minutes."
      :subtitle="`No installation, no training. If you can use WhatsApp, you can use ${BRAND.name}.`"
    />

    <section class="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
      <ol class="relative space-y-6 before:absolute before:bottom-8 before:left-[1.6rem] before:top-8 before:w-px before:bg-gradient-to-b before:from-rose-300 before:to-stone-200 sm:before:left-[2.1rem]">
        <li v-for="(step, i) in SITE_STEPS" :key="step.title" v-reveal="i * 80" class="relative flex gap-4 sm:gap-6">
          <span class="relative z-10 grid size-13 shrink-0 place-items-center rounded-2xl bg-stone-900 text-white shadow-lg sm:size-17">
            <component :is="icons[i]" :size="22" />
          </span>
          <div class="flex-1 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Step {{ i + 1 }}</p>
            <h2 class="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">{{ step.title }}</h2>
            <p class="mt-2 text-[15px] leading-7 text-stone-600">{{ step.text }}</p>
            <ul class="mt-5 space-y-2.5">
              <li v-for="d in details[i]" :key="d" class="flex items-start gap-2.5 text-[15px] text-stone-700">
                <Check :size="18" class="mt-0.5 shrink-0 text-emerald-600" /> {{ d }}
              </li>
            </ul>
          </div>
        </li>
      </ol>
    </section>

    <section class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div v-reveal class="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <h2 class="font-display text-2xl text-stone-900 sm:text-4xl">Need a hand getting started?</h2>
        <p class="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-stone-600">
          Our getting-started guide walks you through each screen, and we are happy to help you import your customers.
        </p>
        <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink to="/help" class="site-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-900 px-6 font-semibold text-white hover:bg-stone-800">
            Read the guide <ArrowRight :size="18" />
          </NuxtLink>
          <NuxtLink to="/contactus" class="site-btn inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-200 px-6 font-semibold text-stone-900 hover:border-stone-300">
            Contact us
          </NuxtLink>
        </div>
      </div>
    </section>

    <SiteCta />
  </div>
</template>
