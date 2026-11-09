<script setup lang="ts">
import { ref } from "vue";
import { Check, ArrowRight } from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/pricing",
  title: "Pricing",
  description: `Simple plans for small appointment businesses. Start with a ${TRIAL_DAYS}-day free trial, no card needed. Monthly or yearly, cancel any time.`,
});

const yearly = ref(true);
const bestSaving = Math.max(...PLANS.map((p) => Math.round((1 - p.yearly / p.monthly) * 100)));

const pricingFaqs = [
  { q: "What happens after the free trial?", a: "Choose a plan to keep going — all your services, customers and bookings stay exactly as they are." },
  { q: "Can I change plans later?", a: "Yes, move up or down at any time. Changes apply from your next billing period." },
  { q: "Are prices including VAT?", a: "Prices are shown without VAT. VAT is added where it applies, based on your country." },
  { q: "Do you charge per booking?", a: "No. Unlimited bookings on every plan and no commission on your sales." },
];
</script>

<template>
  <div>
    <SitePageHero
      eyebrow="Pricing"
      title="Simple plans. No commission."
      :subtitle="`Every plan starts with a ${TRIAL_DAYS}-day free trial. No card needed, cancel any time.`"
    />

    <section class="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10">
      <!-- Monthly / yearly toggle -->
      <div v-reveal class="flex justify-center">
        <div class="inline-flex items-center rounded-2xl border border-stone-200 bg-white p-1 shadow-sm" role="group" aria-label="Billing period">
          <button
            type="button"
            class="min-h-11 rounded-xl px-5 text-sm font-semibold transition"
            :class="!yearly ? 'bg-stone-900 text-white shadow' : 'text-stone-600 hover:text-stone-900'"
            :aria-pressed="!yearly"
            @click="yearly = false"
          >
            Monthly
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition"
            :class="yearly ? 'bg-stone-900 text-white shadow' : 'text-stone-600 hover:text-stone-900'"
            :aria-pressed="yearly"
            @click="yearly = true"
          >
            Yearly
            <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Save up to {{ bestSaving }}%</span>
          </button>
        </div>
      </div>

      <div class="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        <article
          v-for="(plan, i) in PLANS"
          :key="plan.id"
          v-reveal="i * 90"
          class="relative flex flex-col rounded-[2rem] border bg-white p-6 sm:p-8"
          :class="plan.highlighted ? 'border-rose-300 shadow-2xl shadow-rose-900/10 ring-1 ring-rose-200 lg:-translate-y-3' : 'border-stone-200 shadow-sm'"
        >
          <span v-if="plan.badge" class="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow">
            {{ plan.badge }}
          </span>
          <h2 class="text-xl font-bold text-stone-900">{{ plan.name }}</h2>
          <p class="mt-1 min-h-12 text-sm leading-6 text-stone-500">{{ plan.description }}</p>
          <p class="mt-6 flex items-end gap-1.5">
            <span class="font-display text-5xl tabular-nums text-stone-900">{{ formatPlanPrice(yearly ? plan.yearly : plan.monthly) }}</span>
            <span class="pb-2 text-sm text-stone-500">/ month</span>
          </p>
          <p class="mt-1 h-5 text-xs text-stone-500">
            <template v-if="yearly">Billed {{ formatPlanPrice(plan.yearly * 12) }} per year</template>
            <template v-else>Billed monthly</template>
          </p>
          <NuxtLink
            to="/register"
            class="site-btn mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl text-base font-semibold"
            :class="plan.highlighted ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25 hover:bg-rose-700' : 'bg-stone-900 text-white hover:bg-stone-800'"
          >
            {{ plan.cta }} <ArrowRight :size="18" />
          </NuxtLink>
          <ul class="mt-7 space-y-3 border-t border-stone-100 pt-6">
            <li v-for="f in plan.features" :key="f" class="flex items-start gap-2.5 text-[15px] text-stone-700">
              <Check :size="18" class="mt-0.5 shrink-0 text-rose-600" /> {{ f }}
            </li>
          </ul>
        </article>
      </div>

      <p v-reveal class="mt-10 text-center text-sm text-stone-500">
        Prices in {{ PLAN_CURRENCY }}, excluding VAT. Need something custom for many locations?
        <NuxtLink to="/contactus" class="font-semibold text-rose-700 underline-offset-4 hover:underline">Contact us</NuxtLink>.
      </p>
    </section>

    <section class="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
      <h2 v-reveal class="mb-6 text-center font-display text-3xl text-stone-900 sm:text-4xl">Pricing questions</h2>
      <SiteFaq :items="pricingFaqs" />
    </section>

    <SiteCta />
  </div>
</template>
