<script setup lang="ts">
interface Props {
  name?: string;
  handle?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
}

withDefaults(defineProps<Props>(), {
  name: "Eleni Nikolaou",
  handle: "@eleni.barber",
  bio: "Owner of Glow Studio Athens. Crafting effortless appointments for modern clients. RantevouOS saved us 15 hours every week.",
  location: "Athens, Greece",
  avatarUrl:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
});
</script>

<template>
  <div
    class="group relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-stone-950 p-2 shadow-2xl ring-1 ring-black/5"
  >
    <!-- Top Gradient Header Area -->
    <div
      class="relative h-44 w-full overflow-hidden rounded-4xl bg-linear-to-tr from-rose-500 via-amber-500 to-rose-600"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_50%)]"
      />

      <!-- Floating Avatar Badge -->
      <div
        class="absolute bottom-3 right-3 overflow-hidden rounded-2xl border-2 border-stone-950 bg-stone-900 p-0.5 shadow-lg"
      >
        <img
          :src="avatarUrl"
          :alt="name"
          class="size-16 rounded-[0.85rem] object-cover"
        />
      </div>
    </div>

    <!-- Content Area -->
    <div class="px-5 pt-5 pb-4 text-white">
      <div class="flex items-baseline gap-2">
        <h3 class="text-xl font-bold tracking-tight text-white">{{ name }}</h3>
        <span class="text-xs text-stone-400 font-normal">{{ handle }}</span>
      </div>

      <p class="mt-3 text-xs leading-relaxed text-stone-300">
        {{ bio }}
      </p>

      <div class="mt-4 flex items-center gap-1.5 text-xs text-stone-400">
        <svg
          class="size-3.5 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>{{ location }}</span>
      </div>

      <!-- Action Button -->
      <NuxtLink
        to="/book/glow-studio"
        class="mt-6 block w-full rounded-2xl bg-stone-800 py-3.5 text-center text-xs font-semibold text-stone-200 transition-all hover:bg-stone-700 hover:text-white active:scale-[0.98]"
      >
        View Booking Page
      </NuxtLink>
    </div>
  </div>
</template>
