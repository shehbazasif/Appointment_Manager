<script setup lang="ts">
import { ref, useId } from "vue";
import { Plus } from "lucide-vue-next";

defineProps<{ items: { q: string; a: string }[] }>();
const openIndex = ref<number | null>(0);
const toggle = (i: number) => (openIndex.value = openIndex.value === i ? null : i);
const uid = useId();
</script>

<template>
  <div class="divide-y divide-stone-200 rounded-3xl border border-stone-200 bg-white shadow-sm">
    <div v-for="(item, i) in items" :key="item.q" v-reveal="Math.min(i, 6) * 50">
      <h3>
        <button
          :id="`${uid}-q-${i}`"
          type="button"
          class="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-stone-900 sm:px-6"
          :aria-expanded="openIndex === i"
          :aria-controls="`${uid}-a-${i}`"
          @click="toggle(i)"
        >
          <span>{{ item.q }}</span>
          <span
            class="grid size-8 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-600 transition-transform duration-300"
            :class="openIndex === i ? 'rotate-45 bg-rose-50 text-rose-600' : ''"
          >
            <Plus :size="16" />
          </span>
        </button>
      </h3>
      <div
        :id="`${uid}-a-${i}`"
        role="region"
        :aria-labelledby="`${uid}-q-${i}`"
        class="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
        :class="openIndex === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
        :inert="openIndex !== i || undefined"
      >
        <div class="overflow-hidden">
          <p class="px-5 pb-5 text-[15px] leading-7 text-stone-600 sm:px-6">{{ item.a }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
