<script setup lang="ts">
import { Check, ArrowRight } from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/industries",
  title: "Industries",
  description:
    `${BRAND.name} for salons and barbers, clinics, pet care, towing and car services, home services and cleaning teams — online booking that fits how you work.`,
  image: "/images/barber.webp",
});
</script>

<template>
  <div>
    <SitePageHero
      eyebrow="Industries"
      title="One booking app, shaped to your business."
      :subtitle="`Whether customers come to you or you go to them, ${BRAND.name} keeps bookings, staff and customers in order.`"
    />

    <nav aria-label="Industries" class="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
      <ul class="flex flex-wrap justify-center gap-2">
        <li v-for="ind in SITE_INDUSTRIES" :key="ind.id">
          <a :href="`#${ind.id}`" class="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 hover:border-rose-200 hover:text-rose-700">
            <component :is="ind.icon" :size="16" class="text-rose-500" /> {{ ind.name }}
          </a>
        </li>
      </ul>
    </nav>

    <div class="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:space-y-10 lg:px-10">
      <section
        v-for="(ind, i) in SITE_INDUSTRIES"
        :id="ind.id"
        :key="ind.id"
        class="grid scroll-mt-24 items-center gap-8 overflow-hidden rounded-[2rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-2 lg:gap-12 lg:p-8"
      >
        <div v-reveal class="overflow-hidden rounded-3xl" :class="i % 2 ? 'lg:order-2' : ''">
          <img :src="ind.image" :alt="ind.alt" width="960" height="640" loading="lazy" decoding="async" class="aspect-[3/2] w-full object-cover" />
        </div>
        <div v-reveal="100" class="px-2 pb-4 sm:px-2 lg:pb-0">
          <span class="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
            <component :is="ind.icon" :size="14" /> {{ ind.short }}
          </span>
          <h2 class="mt-4 font-display text-3xl text-stone-900 sm:text-4xl">{{ ind.name }}</h2>
          <p class="mt-4 text-[15px] leading-7 text-stone-600 sm:text-base">{{ ind.text }}</p>
          <ul class="mt-6 space-y-2.5">
            <li v-for="p in ind.points" :key="p" class="flex items-start gap-2.5 text-[15px] font-medium text-stone-800">
              <Check :size="18" class="mt-0.5 shrink-0 text-rose-600" /> {{ p }}
            </li>
          </ul>
          <NuxtLink to="/register" class="site-btn mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800">
            Try it for {{ ind.name.toLowerCase() }} <ArrowRight :size="16" />
          </NuxtLink>
        </div>
      </section>
    </div>

    <SiteCta title="Don't see your business?" :text="`If you work with appointments, ${BRAND.name} fits. Tell us how you work and we'll help you set it up.`" />
  </div>
</template>
