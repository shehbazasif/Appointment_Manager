<script setup lang="ts">
useHead({ title: "Terms of Service — RantevouOS" });
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#f8eee9_0,transparent_32rem),#fbfaf8]"
  >
    <Header />

    <main class="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
      <p class="text-xs font-semibold uppercase tracking-wider text-rose-600">
        Terms & Agreement
      </p>
      <h1
        class="mt-2 font-display text-3xl font-bold text-stone-900 sm:text-4xl"
      >
        Terms of Service
      </h1>
      <p class="mt-2 text-xs text-stone-400">
        Effective date: September 10, 2026
      </p>

      <div class="mt-8 space-y-6 text-sm leading-relaxed text-stone-600">
        <section>
          <h2 class="text-base font-bold text-stone-900">
            1. Acceptance of Terms
          </h2>
          <p class="mt-2">
            By registering for RantevouOS, you agree to these Terms of Service.
            If operating on behalf of a Greek business entity, you confirm
            authority to bind the business to this agreement.
          </p>
        </section>

        <section>
          <h2 class="text-base font-bold text-stone-900">2. Service Scope</h2>
          <p class="mt-2">
            RantevouOS provides appointment scheduling, calendar management, and
            automated customer communication software. RantevouOS is not a
            consumer marketplace and takes 0% commission on business
            transactions.
          </p>
        </section>

        <section>
          <h2 class="text-base font-bold text-stone-900">
            3. User Responsibilities
          </h2>
          <ul class="mt-2 list-disc pl-5 space-y-1">
            <li>Maintain accurate staff working hours and service listings.</li>
            <li>
              Obtain customer consent prior to sending SMS or promotional
              notifications.
            </li>
            <li>Keep account access credentials confidential.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-bold text-stone-900">
            4. Account Termination & Cancellation
          </h2>
          <p class="mt-2">
            Business accounts may be canceled at any time from the business
            settings page without penalty. Upon cancellation, data access will
            remain available for export for 30 days.
          </p>
        </section>
      </div>
    </main>

    <Footer />
  </div>
</template>
