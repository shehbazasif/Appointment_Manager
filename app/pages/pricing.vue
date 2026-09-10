<script setup lang="ts">
useHead({ title: 'Pricing — RantevouOS' });
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#f8eee9_0,transparent_32rem),#fbfaf8]">
    <Header />

    <!-- Hero Section -->
    <section class="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-24 text-center">
      <p class="text-xs font-semibold uppercase tracking-wider text-rose-600">Simple & Predictable</p>
      <h1 class="mt-3 font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-6xl">
        0% Commission. Flat monthly pricing.
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-500 sm:text-lg">
        Keep 100% of what you earn. Choose a plan that fits your studio size.
      </p>
    </section>

    <!-- Pricing Cards -->
    <section class="mx-auto max-w-7xl px-6 pb-24 lg:px-12">
      <div class="grid gap-8 lg:grid-cols-3">
        <!-- Starter Plan -->
        <div class="surface flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-8 shadow-sm">
          <div>
            <h2 class="text-lg font-bold text-stone-900">Starter</h2>
            <p class="mt-1 text-xs text-stone-500">Ideal for solo barbers and independent stylists.</p>
            <div class="mt-6 flex items-baseline gap-1">
              <span class="font-display text-4xl font-bold text-stone-900">€19</span>
              <span class="text-sm font-medium text-stone-500">/month</span>
            </div>
            <ul class="mt-8 space-y-3 text-sm text-stone-600">
              <li class="flex items-center gap-2">✓ 1 Staff Member</li>
              <li class="flex items-center gap-2">✓ Unlimited Bookings</li>
              <li class="flex items-center gap-2">✓ Custom Booking URL</li>
              <li class="flex items-center gap-2">✓ Email Confirmations</li>
            </ul>
          </div>
          <NuxtLink to="/register" class="mt-8 block text-center rounded-xl border border-stone-300 bg-stone-50 py-3 text-sm font-semibold text-stone-900 transition-all hover:bg-stone-100">
            Start 14-Day Free Trial
          </NuxtLink>
        </div>

        <!-- Business Plan (Featured) -->
        <div class="surface relative flex flex-col justify-between rounded-2xl border-2 border-stone-900 bg-white p-8 shadow-xl shadow-stone-900/10">
          <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Most Popular</span>
          <div>
            <h2 class="text-lg font-bold text-stone-900">Business</h2>
            <p class="mt-1 text-xs text-stone-500">Perfect for growing salons and beauty studios.</p>
            <div class="mt-6 flex items-baseline gap-1">
              <span class="font-display text-4xl font-bold text-stone-900">€39</span>
              <span class="text-sm font-medium text-stone-500">/month</span>
            </div>
            <ul class="mt-8 space-y-3 text-sm text-stone-600">
              <li class="flex items-center gap-2 font-medium text-stone-900">✓ Up to 5 Staff Members</li>
              <li class="flex items-center gap-2 font-medium text-stone-900">✓ Unlimited Bookings & CRM</li>
              <li class="flex items-center gap-2">✓ Automated 24h Email Reminders</li>
              <li class="flex items-center gap-2">✓ Customer Visit History</li>
              <li class="flex items-center gap-2">✓ Simulated SMS Notifications</li>
            </ul>
          </div>
          <NuxtLink to="/register" class="mt-8 block text-center rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition-all hover:bg-stone-800 shadow-md">
            Start 14-Day Free Trial
          </NuxtLink>
        </div>

        <!-- Pro Plan -->
        <div class="surface flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-8 shadow-sm">
          <div>
            <h2 class="text-lg font-bold text-stone-900">Pro</h2>
            <p class="mt-1 text-xs text-stone-500">For high-volume multi-staff wellness centers.</p>
            <div class="mt-6 flex items-baseline gap-1">
              <span class="font-display text-4xl font-bold text-stone-900">€69</span>
              <span class="text-sm font-medium text-stone-500">/month</span>
            </div>
            <ul class="mt-8 space-y-3 text-sm text-stone-600">
              <li class="flex items-center gap-2">✓ Unlimited Staff Members</li>
              <li class="flex items-center gap-2">✓ Priority Email & Support</li>
              <li class="flex items-center gap-2">✓ Advanced Role Permissions</li>
              <li class="flex items-center gap-2">✓ Custom Email Branding</li>
            </ul>
          </div>
          <NuxtLink to="/register" class="mt-8 block text-center rounded-xl border border-stone-300 bg-stone-50 py-3 text-sm font-semibold text-stone-900 transition-all hover:bg-stone-100">
            Start 14-Day Free Trial
          </NuxtLink>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>