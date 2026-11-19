<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

/**
 * Ticket-style booking card. One piece with real cut-out notches (CSS mask)
 * at the line between the main info and the details, so the page
 * background shows through on any colour. The shadow follows the shape.
 */
defineProps<{
  /** small label in the coloured band, e.g. "Your token" / "Booking confirmed" */
  kicker: string;
  businessName: string;
  /** token number to show big; leave empty for a normal confirmation */
  token?: string | null;
  dateLabel: string;
  time: string;
  rows: { label: string; value: string }[];
  /** amber notice (e.g. arrive early) */
  note?: string | null;
  /** small grey line at the bottom */
  footer?: string | null;
}>();
const { t } = useT();

// where the notches go = bottom of the top section
const card = ref<HTMLElement | null>(null);
const top = ref<HTMLElement | null>(null);
let ro: ResizeObserver | null = null;
const place = () => {
  if (card.value && top.value) card.value.style.setProperty("--cut", `${top.value.offsetHeight}px`);
};
onMounted(() => {
  place();
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(place);
    if (top.value) ro.observe(top.value);
  }
});
onBeforeUnmount(() => ro?.disconnect());
</script>

<template>
  <div class="ticket-wrap mx-auto w-full max-w-sm text-start">
    <div ref="card" class="ticket overflow-hidden rounded-3xl bg-white">
      <!-- top: brand band + main info -->
      <div ref="top">
        <div class="bg-rose-600 px-5 py-4 text-white">
          <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">{{ kicker }}</p>
          <p class="truncate text-base font-bold">{{ businessName }}</p>
        </div>
        <div class="px-5 pb-5 pt-4">
          <div v-if="token" class="flex items-end justify-between gap-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-stone-500">{{ t("Token No.") }}</p>
              <p class="font-display text-7xl font-bold leading-none tabular-nums text-stone-900">{{ token }}</p>
            </div>
            <div class="text-end">
              <p class="text-sm font-bold text-stone-900">{{ dateLabel }}</p>
              <p class="text-2xl font-bold tabular-nums text-stone-900">{{ time }}</p>
            </div>
          </div>
          <div v-else>
            <p class="text-[11px] font-bold uppercase tracking-wider text-stone-500">{{ t("Date & Time") }}</p>
            <p class="mt-1 text-xl font-bold text-stone-900">{{ dateLabel }}</p>
            <p class="font-display text-5xl font-bold leading-none tabular-nums text-stone-900">{{ time }}</p>
          </div>
        </div>
      </div>

      <!-- bottom: details (tear line between the notches) -->
      <div class="px-5 pb-5">
        <div class="mx-2 mb-3 border-t-2 border-dashed border-stone-200" />
        <dl class="space-y-1.5 text-sm">
          <div v-for="r in rows" :key="r.label" class="flex justify-between gap-3">
            <dt class="shrink-0 text-stone-500">{{ r.label }}</dt>
            <dd class="min-w-0 truncate text-end font-semibold text-stone-900">{{ r.value }}</dd>
          </div>
        </dl>
        <div v-if="note" class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <p class="text-sm font-bold">{{ t("Important") }}</p>
          <p class="mt-0.5 text-sm leading-6">{{ note }}</p>
        </div>
        <p v-if="footer" class="mt-3 text-center text-xs leading-5 text-stone-500">{{ footer }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticket-wrap {
  filter: drop-shadow(0 18px 30px rgb(28 25 23 / 0.1)) drop-shadow(0 2px 4px rgb(28 25 23 / 0.06));
}
/* one element, two half-width mask layers → a notch on each side at --cut */
.ticket {
  --cut: 150px;
  -webkit-mask:
    radial-gradient(circle 13px at 0 var(--cut), #0000 98%, #000) left / 51% 100% no-repeat,
    radial-gradient(circle 13px at 100% var(--cut), #0000 98%, #000) right / 51% 100% no-repeat;
  mask:
    radial-gradient(circle 13px at 0 var(--cut), #0000 98%, #000) left / 51% 100% no-repeat,
    radial-gradient(circle 13px at 100% var(--cut), #0000 98%, #000) right / 51% 100% no-repeat;
}
</style>
