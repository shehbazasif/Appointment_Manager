<script setup lang="ts">
const session = ref<{
  user?: { firstName: string };
  organization?: { name: string };
  role?: string;
} | null>(null);
onMounted(async () => {
  try {
    session.value = await $fetch("/api/me");
  } catch {
    await navigateTo("/login");
  }
});
</script>

<template>
  <div class="space-y-6 py-10">
    <section
      class="surface flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-end"
    >
      <div>
        <p class="eyebrow">Business workspace</p>
        <h1 class="font-display text-4xl">
          Welcome{{
            session?.user?.firstName ? `, ${session.user.firstName}` : ""
          }}.
        </h1>
        <p class="mt-2 text-sm text-stone-500">
          {{ session?.organization?.name ?? "Your business" }} ·
          {{ session?.role ?? "OWNER" }}
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink
          to="/onboarding"
          class="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >Business setup</NuxtLink
        ><NuxtLink
          to="/logout"
          class="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          >Sign out</NuxtLink
        >
      </div>
    </section>
    <section class="grid gap-4 sm:grid-cols-3">
      <NuxtLink
        v-for="item in [
          {
            title: 'Appointments',
            to: '/dashboard/appointments',
            text: 'Manage today\'s schedule and statuses.',
          },
          {
            title: 'Customers',
            to: '/dashboard/customers',
            text: 'Search customer profiles and history.',
          },
          {
            title: 'Services & staff',
            to: '/dashboard/settings',
            text: 'Configure the services you offer.',
          },
        ]"
        :key="item.title"
        :to="item.to"
        class="surface p-5 transition hover:-translate-y-0.5"
        ><h2 class="font-semibold">{{ item.title }}</h2>
        <p class="mt-2 text-sm leading-6 text-stone-500">
          {{ item.text }}
        </p></NuxtLink
      >
    </section>
  </div>
</template>
