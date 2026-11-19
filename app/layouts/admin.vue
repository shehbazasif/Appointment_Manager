<script setup lang="ts">
import { ShieldCheck, LogOut } from "lucide-vue-next";

// admin's own session — signing out here leaves the business login alone
const { adminUser: user, signOut } = useAdminAuth();
// design system (html.ui), default blue
useBrandTheme(() => null);

const handleSignOut = async () => {
  await signOut();
  await navigateTo("/admin/login");
};
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-[#f5f7fa] text-[#111827] antialiased">
    <header
      class="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 lg:px-6"
      style="padding-top: env(safe-area-inset-top, 0px)"
    >
      <NuxtLink to="/admin" class="flex min-w-0 items-center gap-3">
        <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-600 text-white">
          <ShieldCheck :size="18" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-[15px] font-bold leading-5 text-stone-900">{{ BRAND.name }}</span>
          <span class="block text-xs text-stone-500">Platform admin</span>
        </span>
      </NuxtLink>

      <div class="flex shrink-0 items-center gap-2">
        <span class="hidden text-[13px] text-stone-500 md:inline">{{ user?.email }}</span>
        <button type="button" class="ui-btn ui-btn-ghost ui-btn-icon" title="Sign out" aria-label="Sign out" @click="handleSignOut">
          <LogOut :size="16" />
        </button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-10 pt-5 sm:px-6 sm:py-6">
      <slot />
    </main>
  </div>
</template>
