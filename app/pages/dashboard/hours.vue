<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  Save,
  Check,
  AlertCircle,
  CalendarDays,
  CalendarRange,
  Sun,
  Moon,
  Briefcase,
  Copy,
  Clock3,
  Globe2,
  Loader2,
} from "lucide-vue-next";
const { t, intl } = useT();

definePageMeta({
  layout: "dashboard",
});

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const schedule = ref<DaySchedule[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const savedSnapshot = ref("");

// Business country + time zone: all hours below are in this time zone
const region = reactive({ country: "", timezone: "", currency: "" });
const savedRegion = reactive({ country: "", timezone: "" });
const loadRegion = async () => {
  try {
    const org = await $fetch<{ country?: string | null; timezone?: string; currency?: string }>("/api/organization");
    region.country = org.country ?? "";
    region.timezone = org.timezone ?? "";
    region.currency = org.currency ?? "";
    savedRegion.country = region.country;
    savedRegion.timezone = region.timezone;
  } catch {}
};
const browserZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
})();

const snapshot = () =>
  JSON.stringify({ s: schedule.value.map((d) => [d.enabled, d.startTime, d.endTime]), c: region.country, z: region.timezone });

const loadHours = async () => {
  isLoading.value = true;
  await Promise.all([
    loadRegion(),
    (async () => {
      try {
        const rawHours = await $fetch<any[]>("/api/business-hours");
        const map = new Map<number, any>();
        for (const h of rawHours) map.set(h.dayOfWeek, h);
        // Monday first
        schedule.value = [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
          const existing = map.get(dayIndex);
          return {
            dayOfWeek: dayIndex,
            dayName: dayNames[dayIndex] || `Day ${dayIndex}`,
            startTime: (existing?.startTime ?? "09:00").slice(0, 5),
            endTime: (existing?.endTime ?? "19:00").slice(0, 5),
            enabled: existing ? Boolean(existing.enabled) : dayIndex !== 0,
          };
        });
      } catch (err: any) {
        errorMessage.value = err?.data?.statusMessage ?? t("Failed to load working hours.");
      }
    })(),
  ]);
  savedSnapshot.value = snapshot();
  isLoading.value = false;
};
onMounted(loadHours);

// ---- helpers ----
const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const isInvalid = (d: DaySchedule) => d.enabled && toMin(d.endTime) <= toMin(d.startTime);
const dayMinutes = (d: DaySchedule) => (d.enabled && !isInvalid(d) ? toMin(d.endTime) - toMin(d.startTime) : 0);
const fmtDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};
// open-hours bar on a 24h track
const barStyle = (d: DaySchedule) => {
  const s = toMin(d.startTime) / 1440;
  const e = toMin(d.endTime) / 1440;
  return { insetInlineStart: `${s * 100}%`, width: `${Math.max(0, e - s) * 100}%` };
};

const openDays = computed(() => schedule.value.filter((d) => d.enabled).length);
const weeklyMinutes = computed(() => schedule.value.reduce((sum, d) => sum + dayMinutes(d), 0));
const hasErrors = computed(() => schedule.value.some(isInvalid));
const isDirty = computed(() => !isLoading.value && snapshot() !== savedSnapshot.value);

// "now" in the business time zone, to show whether you are open right now
const nowInfo = computed(() => {
  if (!region.timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: region.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
    const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
    const mins = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24 * 60 + Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const today = schedule.value.find((d) => d.dayOfWeek === idx);
    const open = !!today && today.enabled && mins >= toMin(today.startTime) && mins < toMin(today.endTime);
    const time = new Intl.DateTimeFormat(intl.value, { timeZone: region.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    return { open, time, today: idx };
  } catch {
    return null;
  }
});

const copyToAll = (from: DaySchedule) => {
  schedule.value.forEach((d) => {
    if (d.enabled && d !== from) {
      d.startTime = from.startTime;
      d.endTime = from.endTime;
    }
  });
};

const saveHours = async () => {
  if (hasErrors.value) {
    errorMessage.value = t("Closing time must be after opening time.");
    return;
  }
  isSaving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const payload = schedule.value.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
      enabled: d.enabled,
    }));

    // Save country / time zone first (only when changed)
    if (region.timezone && (region.timezone !== savedRegion.timezone || region.country !== savedRegion.country)) {
      await $fetch("/api/organization", {
        method: "PATCH",
        body: {
          timezone: region.timezone,
          ...(region.country ? { country: region.country } : {}),
          ...(region.currency ? { currency: region.currency } : {}),
        },
      });
      savedRegion.country = region.country;
      savedRegion.timezone = region.timezone;
    }

    await $fetch("/api/business-hours", { method: "PUT", body: { hours: payload } });

    savedSnapshot.value = snapshot();
    successMessage.value = t("Working hours saved successfully. Online booking slots updated.");
    setTimeout(() => (successMessage.value = ""), 3500);
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? t("Failed to save hours.");
  } finally {
    isSaving.value = false;
  }
};

const discard = () => {
  loadHours();
  errorMessage.value = "";
};

type PresetId = "STANDARD" | "EXTENDED" | "WEEKEND_OFF";
const presets: { id: PresetId; title: string; sub: string; icon: any }[] = [
  { id: "STANDARD", title: "Standard (Mon - Sat)", sub: "09:00 – 19:00 · Sat 09:00 – 17:00", icon: Briefcase },
  { id: "EXTENDED", title: "Extended (8:30 - 21:00)", sub: "Mon – Sat · 08:30 – 21:00", icon: Moon },
  { id: "WEEKEND_OFF", title: "Mon - Fri Only", sub: "09:00 – 18:00 · weekend closed", icon: Sun },
];
const applyPreset = (type: PresetId) => {
  schedule.value.forEach((d) => {
    if (type === "STANDARD") {
      d.enabled = d.dayOfWeek !== 0;
      d.startTime = "09:00";
      d.endTime = d.dayOfWeek === 6 ? "17:00" : "19:00";
    } else if (type === "EXTENDED") {
      d.enabled = d.dayOfWeek !== 0;
      d.startTime = "08:30";
      d.endTime = "21:00";
    } else {
      d.enabled = d.dayOfWeek >= 1 && d.dayOfWeek <= 5;
      d.startTime = "09:00";
      d.endTime = "18:00";
    }
  });
};

</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-28">
    <!-- Header -->
    <div class="page-head flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">{{ t("Availability & Operations") }}</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">{{ t("Working Hours") }}</h1>
        <p class="mt-1 text-sm text-stone-500">{{ t("Customers can only book inside these hours.") }}</p>
      </div>
      <button
        type="button"
        :disabled="isSaving || isLoading"
        @click="saveHours"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50 max-sm:w-full"
      >
        <Loader2 v-if="isSaving" :size="16" class="animate-spin" />
        <Save v-else :size="16" />
        <span>{{ isSaving ? t("Saving...") : t("Save Schedule") }}</span>
      </button>
    </div>

    <!-- Alerts -->
    <p v-if="errorMessage" class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700" role="alert">
      <AlertCircle :size="18" class="shrink-0" /> <span>{{ errorMessage }}</span>
    </p>
    <p v-if="successMessage" class="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700" role="status">
      <Check :size="18" class="shrink-0" /> <span>{{ successMessage }}</span>
    </p>

    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <!-- Weekly schedule -->
      <section class="min-w-0 rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div class="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
          <h2 class="flex items-center gap-2 text-base font-bold text-stone-900">
            <CalendarDays :size="18" class="text-rose-600" /> {{ t("Weekly schedule") }}
          </h2>
          <!-- hour ruler legend -->
          <div class="hidden items-center gap-3 text-[10px] font-semibold text-stone-400 md:flex">
            <span class="inline-flex items-center gap-1.5"><span class="h-2 w-4 rounded-full bg-emerald-500" /> {{ t("Open") }}</span>
            <span class="inline-flex items-center gap-1.5"><span class="h-2 w-4 rounded-full bg-stone-200" /> {{ t("Closed") }}</span>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="space-y-3 p-5 sm:p-6">
          <div v-for="i in 7" :key="i" class="h-20 animate-pulse rounded-2xl bg-stone-100" />
        </div>

        <ul v-else class="divide-y divide-stone-100">
          <li
            v-for="day in schedule"
            :key="day.dayOfWeek"
            class="px-5 py-4 transition-colors sm:px-6"
            :class="[!day.enabled ? 'bg-stone-50/60' : '', nowInfo?.today === day.dayOfWeek ? 'bg-rose-50/40' : '']"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <!-- switch + day -->
              <div class="flex min-w-0 items-center gap-3 sm:w-48">
                <button
                  type="button"
                  role="switch"
                  :aria-checked="day.enabled"
                  :aria-label="t(day.dayName)"
                  class="relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
                  :class="day.enabled ? 'bg-emerald-500' : 'bg-stone-300'"
                  @click="day.enabled = !day.enabled"
                >
                  <span
                    class="absolute top-1 size-5 rounded-full bg-white shadow transition-all"
                    :class="day.enabled ? 'start-6' : 'start-1'"
                  />
                </button>
                <div class="min-w-0">
                  <p class="flex items-center gap-2 text-sm font-bold" :class="day.enabled ? 'text-stone-900' : 'text-stone-400'">
                    {{ t(day.dayName) }}
                    <span v-if="nowInfo?.today === day.dayOfWeek" class="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">{{ t("Today") }}</span>
                  </p>
                  <p class="text-[11px] font-semibold" :class="day.enabled ? (isInvalid(day) ? 'text-rose-600' : 'text-emerald-700') : 'text-stone-400'">
                    {{ !day.enabled ? t("Closed") : isInvalid(day) ? t("Check the times") : fmtDuration(dayMinutes(day)) }}
                  </p>
                </div>
                <button
                  v-if="day.enabled"
                  type="button"
                  class="ms-auto grid size-10 shrink-0 place-items-center rounded-xl border border-stone-200 text-stone-500 transition hover:bg-stone-50 hover:text-stone-900 sm:hidden"
                  :aria-label="t('Copy these hours to all open days')"
                  @click="copyToAll(day)"
                >
                  <Copy :size="16" />
                </button>
              </div>

              <!-- times -->
              <div v-if="day.enabled" class="flex flex-1 items-center gap-2 sm:justify-end">
                <HourPicker
                  v-model="day.startTime"
                  class="flex-1 sm:w-36 sm:flex-none"
                  :invalid="isInvalid(day)"
                  :label="`${t(day.dayName)} – ${t('start')}`"
                />
                <span class="shrink-0 text-xs font-bold text-stone-400">–</span>
                <HourPicker
                  v-model="day.endTime"
                  class="flex-1 sm:w-36 sm:flex-none"
                  :from="day.startTime"
                  :invalid="isInvalid(day)"
                  :label="`${t(day.dayName)} – ${t('end')}`"
                />
                <button
                  type="button"
                  class="hidden size-11 shrink-0 place-items-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 sm:grid"
                  :title="t('Copy these hours to all open days')"
                  :aria-label="t('Copy these hours to all open days')"
                  @click="copyToAll(day)"
                >
                  <Copy :size="16" />
                </button>
              </div>
              <div v-else class="flex flex-1 sm:justify-end">
                <button
                  type="button"
                  class="inline-flex h-11 items-center rounded-xl border border-dashed border-stone-300 px-4 text-xs font-semibold text-stone-500 transition hover:border-emerald-400 hover:text-emerald-700"
                  @click="day.enabled = true"
                >
                  + {{ t("Open this day") }}
                </button>
              </div>
            </div>

            <!-- 24h bar -->
            <div class="mt-3 sm:ms-[3.75rem]">
              <div class="relative h-2 overflow-hidden rounded-full bg-stone-100">
                <span
                  v-if="day.enabled && !isInvalid(day)"
                  class="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
                  :style="barStyle(day)"
                />
              </div>
              <div class="mt-1 hidden justify-between text-[9px] font-semibold tabular-nums text-stone-300 sm:flex">
                <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Side panel -->
      <aside class="min-w-0 space-y-4">
        <!-- Summary -->
        <div class="rounded-3xl border border-stone-200 bg-stone-950 p-5 text-white shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-stone-400">{{ t("This week") }}</p>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p class="font-display text-3xl">{{ openDays }}<span class="text-base text-stone-400">/7</span></p>
              <p class="text-xs text-stone-400">{{ t("Open days") }}</p>
            </div>
            <div>
              <p class="font-display text-3xl">{{ fmtDuration(weeklyMinutes) }}</p>
              <p class="text-xs text-stone-400">{{ t("Open hours") }}</p>
            </div>
          </div>
          <div v-if="nowInfo" class="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-xs">
            <span class="relative flex size-2.5">
              <span v-if="nowInfo.open" class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span class="relative inline-flex size-2.5 rounded-full" :class="nowInfo.open ? 'bg-emerald-400' : 'bg-stone-500'" />
            </span>
            <span class="font-semibold">{{ nowInfo.open ? t("Open now") : t("Closed now") }}</span>
            <span class="ms-auto inline-flex items-center gap-1 tabular-nums text-stone-300"><Clock3 :size="13" /> {{ nowInfo.time }}</span>
          </div>
        </div>

        <!-- Presets -->
        <div class="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <p class="flex items-center gap-2 px-1 text-sm font-bold text-stone-900"><CalendarRange :size="16" class="text-rose-600" /> {{ t("Quick presets") }}</p>
          <div class="mt-3 space-y-2">
            <button
              v-for="p in presets"
              :key="p.id"
              type="button"
              class="group flex w-full items-center gap-3 rounded-2xl border border-stone-200 p-3 text-start transition hover:border-stone-900 hover:bg-stone-50"
              @click="applyPreset(p.id)"
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 transition group-hover:bg-stone-900 group-hover:text-white">
                <component :is="p.icon" :size="16" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-stone-900">{{ t(p.title) }}</span>
                <span class="block truncate text-[11px] text-stone-500">{{ p.sub }}</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Location & time zone -->
        <div class="space-y-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div>
            <p class="flex items-center gap-2 px-1 text-sm font-bold text-stone-900"><Globe2 :size="16" class="text-rose-600" /> {{ t("Your business location & time zone") }}</p>
            <p class="mt-1 px-1 text-xs text-stone-500">{{ t("The hours below are in this time zone. Customers anywhere see slots in your local time.") }}</p>
          </div>
          <RegionFields
            v-model:country="region.country"
            v-model:timezone="region.timezone"
            v-model:currency="region.currency"
            :show-currency="false"
            stacked
          />
          <p
            v-if="browserZone && region.timezone && browserZone !== region.timezone"
            class="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
          >
            {{ t("This device is in {device}, but your business is set to {business}.", { device: browserZone.replace(/_/g, " "), business: region.timezone.replace(/_/g, " ") }) }}
            <button type="button" class="mt-1 block font-bold underline" @click="region.timezone = browserZone">
              {{ t("Use {zone}", { zone: browserZone.replace(/_/g, " ") }) }}
            </button>
          </p>
        </div>
      </aside>
    </div>

    <!-- Unsaved changes bar -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="isDirty"
        class="fixed inset-x-3 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-stone-900 p-2.5 ps-4 text-white shadow-2xl shadow-stone-900/30 max-lg:bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6"
      >
        <span class="size-2 shrink-0 rounded-full bg-amber-400" />
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ t("You have unsaved changes") }}</span>
        <button type="button" class="hidden rounded-xl px-3 py-2 text-xs font-semibold text-stone-300 hover:text-white sm:block" @click="discard">{{ t("Discard") }}</button>
        <button
          type="button"
          :disabled="isSaving"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-stone-900 hover:bg-stone-100 disabled:opacity-60"
          @click="saveHours"
        >
          <Loader2 v-if="isSaving" :size="14" class="animate-spin" />
          <Save v-else :size="14" />
          {{ t("Save") }}
        </button>
      </div>
    </Transition>
  </div>
</template>
