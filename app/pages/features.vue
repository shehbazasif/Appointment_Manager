<script setup lang="ts">
useHead({ title: "Features — RantevouOS" });
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#f8eee9_0,transparent_32rem),#fbfaf8]"
  >
    <Header />

    <!-- Hero Section -->
    <section class="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-24 text-center">
      <p class="text-xs font-semibold uppercase tracking-wider text-rose-600">
        Built for Greek SMEs
      </p>
      <h1
        class="mt-3 font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-6xl"
      >
        Everything you need to run your appointment business.
      </h1>
      <p
        class="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-500 sm:text-lg"
      >
        Replace messy phone calls and paper books with a calm, automated booking
        workspace built for efficiency.
      </p>
    </section>

    <!-- Feature Grid -->
    <section class="mx-auto max-w-7xl px-6 pb-24 lg:px-12">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Feature 1 -->
        <article
          class="surface rounded-2xl border border-stone-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
        >
          <div
            class="grid size-10 place-items-center rounded-xl bg-stone-900 text-white"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 class="mt-5 text-xl font-bold text-stone-900">
            Unified Business Calendar
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-stone-500">
            Manage single or multi-staff schedules, filter by service or team
            member, and control your day in Europe/Athens time.
          </p>
        </article>

        <!-- Feature 2 -->
        <article
          class="surface rounded-2xl border border-stone-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
        >
          <div
            class="grid size-10 place-items-center rounded-xl bg-rose-600 text-white"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <h2 class="mt-5 text-xl font-bold text-stone-900">
            Branded Public Booking Page
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-stone-500">
            Share one clean, mobile-optimized booking URL (<code
              class="text-xs bg-stone-100 px-1 py-0.5 rounded"
              >/book/your-salon</code
            >) directly with customers on Instagram or Facebook.
          </p>
        </article>

        <!-- Feature 3 -->
        <article
          class="surface rounded-2xl border border-stone-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
        >
          <div
            class="grid size-10 place-items-center rounded-xl bg-teal-600 text-white"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 class="mt-5 text-xl font-bold text-stone-900">
            Automated Email Reminders
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-stone-500">
            Send instant booking confirmations and 24-hour reminder emails to
            drastically cut down on costly no-shows.
          </p>
        </article>

        <!-- Feature 4 -->
        <article
          class="surface rounded-2xl border border-stone-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
        >
          <div
            class="grid size-10 place-items-center rounded-xl bg-stone-900 text-white"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 class="mt-5 text-xl font-bold text-stone-900">
            Customer Memory & CRM
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-stone-500">
            Keep contact details, visit history, completed services, and no-show
            records organized in one centralized database.
          </p>
        </article>

        <!-- Feature 5 -->
        <article
          class="surface rounded-2xl border border-stone-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
        >
          <div
            class="grid size-10 place-items-center rounded-xl bg-rose-600 text-white"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 class="mt-5 text-xl font-bold text-stone-900">
            Double-Booking Prevention
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-stone-500">
            Server-side atomic transaction validation ensures two clients can
            never book the exact same staff slot simultaneously.
          </p>
        </article>

        <!-- Feature 6 -->
        <article
          class="surface rounded-2xl border border-stone-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
        >
          <div
            class="grid size-10 place-items-center rounded-xl bg-teal-600 text-white"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 class="mt-5 text-xl font-bold text-stone-900">
            GDPR Compliant Architecture
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-stone-500">
            Strict multi-tenant organization boundaries isolate business data,
            with support for right-to-be-forgotten customer deletions.
          </p>
        </article>
      </div>
    </section>

    <Footer />
  </div>
</template>
