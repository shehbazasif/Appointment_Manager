<script setup lang="ts">
import { ref, onMounted } from "vue";

type MeResponse = {
  user: { id: string; email: string; firstName: string; lastName: string };
  organization: {
    name: string;
    slug: string;
    bookingActive: boolean;
  } | null;
  role: string | null;
};

const { user } = useSupabaseAuth();
const me = ref<MeResponse | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    me.value = await $fetch<MeResponse>("/api/me");
    if (!me.value.organization) {
      await navigateTo("/onboarding", { replace: true });
      return;
    }
  } catch (error: any) {
    if (error?.statusCode === 401) {
      await navigateTo("/login", { replace: true });
      return;
    }
  } finally {
    isLoading.value = false;
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
            user?.user_metadata?.first_name
              ? `, ${user.user_metadata.first_name}`
              : ""
          }}.
        </h1>
        <p class="mt-2 text-sm text-stone-500">
          <template v-if="me?.organization">
            {{ me.organization.name }} ·
            <span class="text-stone-400">/book/{{ me.organization.slug }}</span>
          </template>
          <template v-else>
            {{ user?.email ?? "Your Supabase account" }}
          </template>
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink
          to="/onboarding"
          class="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >Business setup</NuxtLink
        >
        <NuxtLink
          v-if="me?.organization?.bookingActive"
          :to="`/book/${me.organization.slug}`"
          class="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >Open booking page</NuxtLink
        >
        <NuxtLink
          to="/logout"
          class="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          >Sign out</NuxtLink
        >
      </div>
    </section>
    <p v-if="isLoading" class="text-sm text-stone-500" role="status">
      Loading your workspace...
    </p>
    <section v-else class="grid gap-4 sm:grid-cols-3">
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
        <p class="mt-2 text-sm leading-6 text-stone-500">{{ item.text }}</p>
      </NuxtLink>
    </section>
  </div>
</template>
