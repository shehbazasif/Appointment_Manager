<script setup lang="ts">
import {
  ArrowRight,
  PlayCircle,
  Check,
  MapPin,
  MessageCircle,
  Navigation,
  Truck,
  CalendarCheck,
  BellRing,
  QrCode,
  FileSpreadsheet,
  Quote,
  Star,
  LogIn,
  LogOut,
} from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/",
  description: BRAND.description,
});

const homeFeatures = SITE_FEATURES.slice(0, 6);

const stats = [
  { to: 24, suffix: "/7", label: "Online booking, day and night" },
  { to: 5, suffix: " min", label: "To set up your business" },
  { to: 400, suffix: "+", label: "Time zones supported" },
  { to: 3, suffix: " steps", label: "From sign-up to first booking" },
];

const highlights = [
  {
    icon: CalendarCheck,
    title: "Online booking",
    text: "Your own booking page with services, prices (or hidden prices), staff and live free times.",
    tone: "bg-rose-50 text-rose-600",
  },
  {
    icon: BellRing,
    title: "Reminders",
    text: "Confirmation and reminder emails go out automatically before each visit.",
    tone: "bg-amber-50 text-amber-600",
  },
  {
    icon: QrCode,
    title: "Attendance & QR",
    text: "Tap Enter or Exit and scan the staff member's QR badge. You see who is working today.",
    tone: "bg-teal-50 text-teal-700",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel import",
    text: "Bring your customers and staff from Excel or CSV in a few minutes.",
    tone: "bg-violet-50 text-violet-700",
  },
];

// TODO: placeholder testimonials — replace with real quotes from your customers.
const testimonials = [
  {
    quote: "Clients book at midnight and I wake up to a full day. The reminders alone saved us hours of phone calls every week.",
    name: "Salon owner",
    place: "Athens, Greece",
  },
  {
    quote: "Our drivers get the customer's exact location on WhatsApp. No more 'where are you?' calls on the motorway.",
    name: "Towing company manager",
    place: "Doha, Qatar",
  },
  {
    quote: "Setting up took one afternoon, including importing 900 customers from our old Excel file.",
    name: "Clinic receptionist",
    place: "Dubai, UAE",
  },
];

const homeFaqs = SITE_FAQS.slice(0, 5);
const teaserPlan = PLANS.find((p) => p.highlighted) ?? PLANS[0]!;
</script>

<template>
  <div>
    <!-- HERO -->
    <section class="relative overflow-hidden">
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_90%_-10%,#fbe3e7_0,transparent_60%),radial-gradient(40rem_26rem_at_-10%_20%,#f3efe8_0,transparent_60%)]"
        aria-hidden="true"
      />
      <div class="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:px-10 lg:pb-28 lg:pt-20">
        <div class="text-center lg:text-left">
          <p v-reveal class="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm">
            <span class="pulse-dot relative size-2 rounded-full bg-rose-500 text-rose-500" />
            For salons, clinics, pet care, towing & home services
          </p>
          <h1 v-reveal="60" class="mt-6 text-balance font-display text-[2.6rem] leading-[1.05] tracking-tight text-stone-900 sm:text-6xl lg:text-[4.2rem]">
            Bookings, reminders and your team — <span class="text-rose-600">in one calm app.</span>
          </h1>
          <p v-reveal="120" class="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-stone-600 sm:text-lg lg:mx-0">
            {{ BRAND.name }} gives your customers a beautiful booking page and gives you today's schedule, staff, customers and on-location jobs on your phone.
          </p>
          <div v-reveal="180" class="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <NuxtLink
              to="/register"
              class="site-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 text-base font-semibold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-700"
            >
              Start free trial <ArrowRight :size="18" />
            </NuxtLink>
            <NuxtLink
              to="/how-it-works"
              class="site-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 text-base font-semibold text-stone-900 shadow-sm hover:border-stone-300"
            >
              <PlayCircle :size="18" class="text-rose-600" /> See how it works
            </NuxtLink>
          </div>
          <ul v-reveal="240" class="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-stone-500 lg:justify-start">
            <li v-for="t in [`${TRIAL_DAYS}-day free trial`, 'No card needed', 'Works on iPhone & Android']" :key="t" class="inline-flex items-center gap-1.5">
              <Check :size="16" class="text-emerald-600" /> {{ t }}
            </li>
          </ul>
        </div>
        <div v-reveal="200" class="px-2 sm:px-6 lg:px-0">
          <DeviceMockups />
        </div>
      </div>
    </section>

    <!-- USE-CASE STRIP -->
    <section class="border-y border-stone-200/80 bg-white/70">
      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <p class="text-center text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Made for appointment businesses</p>
        <ul class="mt-5 flex flex-wrap justify-center gap-2.5">
          <li v-for="(ind, i) in SITE_INDUSTRIES" :key="ind.id" v-reveal="i * 50">
            <NuxtLink
              :to="`/industries#${ind.id}`"
              class="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-700"
            >
              <component :is="ind.icon" :size="16" class="text-rose-500" /> {{ ind.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- STATS -->
    <section class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
      <dl class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="(s, i) in stats" :key="s.label" v-reveal="i * 70" class="flex flex-col rounded-3xl border border-stone-200 bg-white p-5 text-center shadow-sm sm:p-6">
          <dt class="order-2 mt-1 text-xs font-medium text-stone-500 sm:text-sm">{{ s.label }}</dt>
          <dd class="font-display text-3xl text-stone-900 sm:text-4xl"><CountUp :to="s.to" :suffix="s.suffix" /></dd>
        </div>
      </dl>
    </section>

    <!-- FEATURES GRID -->
    <section class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10 lg:py-20">
      <div class="mx-auto max-w-2xl text-center">
        <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Everything in one place</p>
        <h2 v-reveal="60" class="mt-3 text-balance font-display text-3xl leading-tight text-stone-900 sm:text-5xl">Less phone calls. More booked hours.</h2>
        <p v-reveal="120" class="mt-4 text-base leading-7 text-stone-600 sm:text-lg">The tools a small business really uses every day — nothing you need a course to understand.</p>
      </div>
      <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="(f, i) in homeFeatures"
          :key="f.title"
          v-reveal="(i % 3) * 80"
          class="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-900/5"
        >
          <span class="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 transition group-hover:scale-110">
            <component :is="f.icon" :size="22" />
          </span>
          <h3 class="mt-5 text-lg font-bold text-stone-900">{{ f.title }}</h3>
          <p class="mt-2 text-[15px] leading-7 text-stone-600">{{ f.text }}</p>
        </article>
      </div>
      <div v-reveal class="mt-10 text-center">
        <NuxtLink to="/features" class="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-800">
          See all features <ArrowRight :size="16" />
        </NuxtLink>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="bg-white py-16 lg:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div class="mx-auto max-w-2xl text-center">
          <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">How it works</p>
          <h2 v-reveal="60" class="mt-3 font-display text-3xl text-stone-900 sm:text-5xl">Live in three steps</h2>
        </div>
        <ol class="relative mt-12 grid gap-5 lg:grid-cols-3">
          <li
            v-for="(step, i) in SITE_STEPS"
            :key="step.title"
            v-reveal="i * 100"
            class="relative rounded-3xl border border-stone-200 bg-[#fbfaf8] p-6 sm:p-8"
          >
            <span class="grid size-11 place-items-center rounded-2xl bg-stone-900 font-display text-lg text-white">{{ i + 1 }}</span>
            <h3 class="mt-5 text-xl font-bold text-stone-900">{{ step.title }}</h3>
            <p class="mt-2 text-[15px] leading-7 text-stone-600">{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- INDUSTRIES -->
    <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div class="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:items-end sm:text-left">
        <div class="max-w-2xl">
          <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Industries</p>
          <h2 v-reveal="60" class="mt-3 font-display text-3xl text-stone-900 sm:text-5xl">Built for the way you work</h2>
        </div>
        <NuxtLink v-reveal to="/industries" class="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-800">
          All industries <ArrowRight :size="16" />
        </NuxtLink>
      </div>
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(ind, i) in SITE_INDUSTRIES"
          :key="ind.id"
          v-reveal="(i % 3) * 80"
          :to="`/industries#${ind.id}`"
          class="group relative block overflow-hidden rounded-3xl bg-stone-900 shadow-sm"
        >
          <img
            :src="ind.image"
            :alt="ind.alt"
            width="960"
            height="640"
            loading="lazy"
            decoding="async"
            class="aspect-[4/3] w-full object-cover opacity-90 transition duration-700 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-5">
            <span class="inline-flex items-center gap-2 text-lg font-bold text-white">
              <component :is="ind.icon" :size="18" class="text-rose-300" /> {{ ind.name }}
            </span>
            <p class="mt-1 text-sm text-stone-200">{{ ind.short }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- ON-LOCATION HIGHLIGHT -->
    <section class="px-4 sm:px-6">
      <div class="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2rem] bg-stone-950 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:px-16 lg:py-20">
        <div>
          <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">On-location service</p>
          <h2 v-reveal="60" class="mt-3 text-balance font-display text-3xl leading-tight text-white sm:text-5xl">The customer shares a location. Your driver is on the way.</h2>
          <p v-reveal="120" class="mt-5 text-base leading-7 text-stone-300 sm:text-lg">
            For towing, mobile mechanics, home repairs and cleaning teams. Customers share their GPS location or a Google Maps link when booking — your staff get the map and a WhatsApp message in one tap.
          </p>
          <ul class="mt-7 space-y-3">
            <li v-for="(t, i) in ['Exact location saved with the booking', 'Assign the job to a driver or technician', 'Staff mark On the way and On location', 'One-tap Google Maps and WhatsApp']" :key="t" v-reveal="i * 60" class="flex items-start gap-3 text-stone-200">
              <span class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-rose-500/20 text-rose-300"><Check :size="14" /></span>
              {{ t }}
            </li>
          </ul>
        </div>
        <!-- mini flow -->
        <div v-reveal="150" class="relative mx-auto w-full max-w-md space-y-4">
          <div class="float-b rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div class="flex items-center gap-3">
              <span class="grid size-11 place-items-center rounded-2xl bg-rose-500/20 text-rose-300"><MapPin :size="20" /></span>
              <div>
                <p class="font-semibold text-white">Location shared</p>
                <p class="text-sm text-stone-400">Customer · accurate to 12 m</p>
              </div>
            </div>
            <div class="mt-4 h-28 rounded-2xl bg-[linear-gradient(135deg,#1f2937_25%,transparent_25%),linear-gradient(225deg,#1f2937_25%,transparent_25%),linear-gradient(45deg,#1f2937_25%,transparent_25%),linear-gradient(315deg,#1f2937_25%,#111827_25%)] bg-[length:24px_24px] bg-[position:12px_0,12px_0,0_0,0_0] opacity-80" />
          </div>
          <div class="float-a ml-6 rounded-3xl border border-white/10 bg-emerald-500/10 p-5 sm:ml-12" style="animation-delay: -2s">
            <div class="flex items-center gap-3">
              <span class="grid size-11 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300"><MessageCircle :size="20" /></span>
              <div>
                <p class="font-semibold text-white">WhatsApp to driver</p>
                <p class="text-sm text-stone-400">"New job 14:30 · tap for map"</p>
              </div>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-400/15 text-sm font-bold text-amber-200"><Truck :size="16" /> On the way</span>
            <span class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-400/15 text-sm font-bold text-emerald-200"><Navigation :size="16" /> On location</span>
          </div>
        </div>
      </div>
    </section>

    <!-- HIGHLIGHTS -->
    <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div class="mx-auto max-w-2xl text-center">
        <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Every day, handled</p>
        <h2 v-reveal="60" class="mt-3 font-display text-3xl text-stone-900 sm:text-5xl">From the first booking to the end of the shift</h2>
      </div>
      <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="(h, i) in highlights" :key="h.title" v-reveal="i * 80" class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <span class="grid size-12 place-items-center rounded-2xl" :class="h.tone"><component :is="h.icon" :size="22" /></span>
          <h3 class="mt-5 text-lg font-bold text-stone-900">{{ h.title }}</h3>
          <p class="mt-2 text-[15px] leading-7 text-stone-600">{{ h.text }}</p>
          <div v-if="h.title === 'Attendance & QR'" class="mt-4 flex gap-2">
            <span class="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white"><LogIn :size="15" /> Enter</span>
            <span class="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 text-sm font-bold text-white"><LogOut :size="15" /> Exit</span>
          </div>
        </article>
      </div>
    </section>

    <!-- TESTIMONIALS (placeholder) -->
    <section class="bg-white py-16 lg:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div class="mx-auto max-w-2xl text-center">
          <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">What owners say</p>
          <h2 v-reveal="60" class="mt-3 font-display text-3xl text-stone-900 sm:text-5xl">Fewer calls, fuller days</h2>
          <p v-reveal="100" class="mt-3 text-xs font-semibold uppercase tracking-wider text-amber-700">Example quotes — replace with real customer reviews</p>
        </div>
        <div class="mt-12 grid gap-4 lg:grid-cols-3">
          <figure v-for="(t, i) in testimonials" :key="t.name" v-reveal="i * 90" class="flex flex-col rounded-3xl border border-stone-200 bg-[#fbfaf8] p-6 sm:p-8">
            <Quote :size="28" class="text-rose-300" />
            <div class="mt-3 flex gap-0.5 text-amber-500" aria-label="5 out of 5 stars">
              <Star v-for="n in 5" :key="n" :size="16" fill="currentColor" />
            </div>
            <blockquote class="mt-4 flex-1 text-[15px] leading-7 text-stone-700">“{{ t.quote }}”</blockquote>
            <figcaption class="mt-6 border-t border-stone-200 pt-4">
              <span class="block font-semibold text-stone-900">{{ t.name }}</span>
              <span class="text-sm text-stone-500">{{ t.place }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- PRICING TEASER -->
    <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div class="grid items-center gap-10 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-2 lg:p-14">
        <div>
          <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Simple pricing</p>
          <h2 v-reveal="60" class="mt-3 font-display text-3xl text-stone-900 sm:text-5xl">Plans that grow with your team</h2>
          <p v-reveal="120" class="mt-4 text-base leading-7 text-stone-600 sm:text-lg">
            Start with a {{ TRIAL_DAYS }}-day free trial. No card needed, no contract — pay monthly or save with a yearly plan.
          </p>
          <NuxtLink v-reveal="160" to="/pricing" class="site-btn mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-stone-900 px-6 text-base font-semibold text-white hover:bg-stone-800">
            Compare plans <ArrowRight :size="18" />
          </NuxtLink>
        </div>
        <div v-reveal="120" class="rounded-3xl border-2 border-rose-200 bg-gradient-to-b from-rose-50 to-white p-6 sm:p-8">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-stone-900">{{ teaserPlan.name }}</h3>
            <span v-if="teaserPlan.badge" class="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">{{ teaserPlan.badge }}</span>
          </div>
          <p class="mt-4 flex items-end gap-1">
            <span class="font-display text-5xl text-stone-900">{{ formatPlanPrice(teaserPlan.yearly) }}</span>
            <span class="pb-2 text-sm text-stone-500">/ month, billed yearly</span>
          </p>
          <ul class="mt-6 space-y-2.5">
            <li v-for="f in teaserPlan.features.slice(0, 5)" :key="f" class="flex items-start gap-2.5 text-[15px] text-stone-700">
              <Check :size="18" class="mt-0.5 shrink-0 text-rose-600" /> {{ f }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
      <div class="text-center">
        <p v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">FAQ</p>
        <h2 v-reveal="60" class="mt-3 font-display text-3xl text-stone-900 sm:text-5xl">Questions, answered</h2>
      </div>
      <div class="mt-10">
        <SiteFaq :items="homeFaqs" />
      </div>
      <p class="mt-6 text-center text-sm text-stone-500">
        More answers on the <NuxtLink to="/faq" class="font-semibold text-rose-700 underline-offset-4 hover:underline">FAQ page</NuxtLink>.
      </p>
    </section>

    <SiteCta />
  </div>
</template>
