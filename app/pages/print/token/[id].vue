<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { Printer, X, Loader2 } from "lucide-vue-next";

/**
 * Printable queue token for thermal receipt printers (58 mm / 80 mm).
 * Uses the browser print dialog (Ctrl+P). `?auto=1` prints right away.
 */
definePageMeta({ layout: false });
const { t, intl } = useT();
useLocaleHead();
const route = useRoute();
const id = String(route.params.id ?? "");

const PAPER_KEY = "token_paper_mm";
const paper = ref<58 | 80>(80);
const data = ref<any>(null);
const org = ref<any>(null);
const error = ref("");
const loading = ref(true);
const printedAt = new Date();

useHead(() => ({
  title: data.value?.appointment?.tokenNumber ? `${t("Token")} ${formatToken(data.value.appointment.tokenNumber)}` : t("Token"),
  style: [
    {
      key: "token-page",
      innerHTML: `@page { size: ${paper.value}mm auto; margin: 0; }`,
    },
  ],
}));

const tz = computed(() => org.value?.timezone || undefined);
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat(intl.value, { timeZone: tz.value, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const fmtTime = (iso: string | Date) =>
  new Intl.DateTimeFormat(intl.value, { timeZone: tz.value, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

const doPrint = () => window.print();
const close = () => {
  if (window.opener) window.close();
  else history.length > 1 ? history.back() : navigateTo("/dashboard/appointments");
};
const setPaper = (mm: 58 | 80) => {
  paper.value = mm;
  try {
    localStorage.setItem(PAPER_KEY, String(mm));
  } catch {}
};

onMounted(async () => {
  try {
    const saved = Number(localStorage.getItem(PAPER_KEY));
    if (saved === 58 || saved === 80) paper.value = saved;
  } catch {}
  try {
    const [a, o] = await Promise.all([
      $fetch<any>(`/api/appointments/${id}`),
      $fetch<any>("/api/organization").catch(() => null),
    ]);
    data.value = a;
    org.value = o;
    await applyLocale(o?.language);
    if (!a?.appointment?.tokenNumber) error.value = t("This booking has no token number yet.");
  } catch (e: any) {
    error.value = e?.statusCode === 401 ? t("Please sign in to print tokens.") : e?.data?.statusMessage || t("Could not load this booking.");
  } finally {
    loading.value = false;
  }
  if (route.query.auto && !error.value) {
    // close the little print window as soon as printing is done (or cancelled)
    window.addEventListener("afterprint", () => {
      if (window.opener) setTimeout(() => window.close(), 200);
    });
    await nextTick();
    setTimeout(doPrint, 300);
  }
});
</script>

<template>
  <div class="token-page min-h-dvh bg-stone-100 py-6 print:bg-white print:p-0">
    <!-- Screen-only toolbar -->
    <div class="no-print mx-auto mb-4 flex max-w-sm flex-wrap items-center justify-between gap-2 px-4">
      <div class="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-xs font-bold" role="group" :aria-label="t('Paper width')">
        <button
          v-for="mm in [58, 80] as const"
          :key="mm"
          type="button"
          class="min-h-9 rounded-lg px-3"
          :class="paper === mm ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'"
          @click="setPaper(mm)"
        >
          {{ mm }} mm
        </button>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-50"
          :disabled="!!error || loading"
          @click="doPrint"
        >
          <Printer :size="16" /> {{ t("Print") }}
        </button>
        <button type="button" class="grid size-10 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600" :aria-label="t('Close')" @click="close">
          <X :size="18" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="no-print flex justify-center py-20 text-stone-500"><Loader2 :size="24" class="animate-spin" /></div>
    <p v-else-if="error" class="no-print mx-auto max-w-sm rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">{{ error }}</p>

    <!-- The receipt -->
    <article
      v-else
      class="receipt mx-auto bg-white px-[3mm] py-[4mm] text-black shadow-lg print:shadow-none"
      :style="{ width: `${paper}mm` }"
    >
      <header class="text-center">
        <p class="text-[15px] font-black leading-tight">{{ org?.name }}</p>
        <p v-if="org?.address || org?.city" class="mt-0.5 text-[10px] leading-snug">{{ [org?.address, org?.city].filter(Boolean).join(", ") }}</p>
        <p v-if="org?.phone" class="text-[10px]">☎ <bdi dir="ltr">{{ org.phone }}</bdi></p>
      </header>

      <div class="my-[3mm] border-t border-dashed border-black" />

      <section class="text-center">
        <p class="text-[11px] font-bold uppercase tracking-[0.25em]">{{ t("Token No.") }}</p>
        <p class="token-number font-black leading-none tabular-nums" :class="paper === 58 ? 'text-[56px]' : 'text-[72px]'">
          {{ formatToken(data.appointment.tokenNumber) }}
        </p>
        <p class="mt-1 text-[12px] font-bold">{{ fmtDate(data.appointment.startAt) }}</p>
        <p class="text-[20px] font-black tabular-nums">{{ fmtTime(data.appointment.startAt) }}</p>
      </section>

      <div class="my-[3mm] border-t border-dashed border-black" />

      <dl class="space-y-[1.2mm] text-[11px] leading-snug">
        <div class="flex justify-between gap-2">
          <dt class="shrink-0">{{ t("Patient") }}</dt>
          <dd class="text-end font-bold">{{ data.customer?.firstName }} {{ data.customer?.lastName === "Customer" ? "" : data.customer?.lastName }}</dd>
        </div>
        <div v-if="data.customer?.phone" class="flex justify-between gap-2">
          <dt class="shrink-0">{{ t("Phone") }}</dt>
          <dd class="text-end"><bdi dir="ltr">{{ data.customer.phone }}</bdi></dd>
        </div>
        <div v-if="data.service" class="flex justify-between gap-2">
          <dt class="shrink-0">{{ t("Service") }}</dt>
          <dd class="text-end font-bold">{{ data.service.name }}</dd>
        </div>
        <div v-if="data.staff" class="flex justify-between gap-2">
          <dt class="shrink-0">{{ t("Doctor / Staff") }}</dt>
          <dd class="text-end font-bold">{{ data.staff.name }}</dd>
        </div>
        <div class="flex justify-between gap-2">
          <dt class="shrink-0">{{ t("Booking") }}</dt>
          <dd class="text-end">{{ data.appointment.source === "ONLINE" ? t("Online") : t("Manual") }} · {{ data.appointment.id.slice(0, 8).toUpperCase() }}</dd>
        </div>
      </dl>

      <div class="my-[3mm] border-t border-dashed border-black" />

      <footer class="text-center text-[10px] leading-snug">
        <p class="font-bold">{{ t("Please wait for your number to be called.") }}</p>
        <p>{{ t("Thank you!") }}</p>
        <p class="mt-[2mm] text-[9px]">{{ t("Printed") }} {{ fmtDate(printedAt.toISOString()) }} {{ fmtTime(printedAt) }}</p>
        <p class="text-[9px]">{{ BRAND.name }}</p>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.receipt {
  font-family: ui-monospace, "Segoe UI", system-ui, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media print {
  .no-print {
    display: none !important;
  }
  .token-page {
    min-height: 0 !important;
  }
  .receipt {
    margin: 0 !important;
    box-shadow: none !important;
  }
}
</style>
