<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  ShieldAlert,
  Building2,
  Users,
  CalendarCheck,
  LogOut,
  Activity,
  Sparkles,
} from "lucide-vue-next";

const { user, signOut } = useSupabaseAuth();

const handleSignOut = async () => {
  await signOut();
  await navigateTo("/login");
};
</script>

<template>
  <div class="min-h-screen bg-[#111215] text-[#e1e2e6] flex flex-col antialiased">
    <!-- Admin Top Bar -->
    <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#16171b]/90 px-6 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-md">
          <ShieldAlert :size="20" />
        </div>
        <div>
          <span class="font-display text-lg font-bold tracking-tight text-white block leading-none">RantevouOS</span>
          <span class="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mt-0.5">Platform Console</span>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <NuxtLink
          to="/dashboard"
          class="text-xs font-semibold text-white/70 hover:text-white transition"
        >
          Studio Workspace
        </NuxtLink>

        <div class="flex items-center gap-2 pl-4 border-l border-white/10">
          <span class="text-xs text-white/60 hidden sm:inline">{{ user?.email }}</span>
          <button
            type="button"
            @click="handleSignOut"
            class="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-8">
      <slot />
    </main>
  </div>
</template>
