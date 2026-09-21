<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import {
  Clock,
  Save,
  Check,
  AlertCircle,
  Sparkles,
  CalendarDays,
} from "lucide-vue-next";

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

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const schedule = ref<DaySchedule[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const loadHours = async () => {
  isLoading.value = true;
  try {
    const rawHours = await $fetch<any[]>("/api/business-hours");
    const map = new Map<number, any>();
    for (const h of rawHours) {
      map.set(h.dayOfWeek, h);
    }

    // Initialize 0-6 (Sunday to Saturday) with Monday first order or natural 0-6
    const ordered = [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
      const existing = map.get(dayIndex);
      return {
        dayOfWeek: dayIndex,
        dayName: dayNames[dayIndex] || `Day ${dayIndex}`,
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "19:00",
        enabled: existing ? Boolean(existing.enabled) : dayIndex !== 0,
      };
    });
    schedule.value = ordered;
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? "Failed to load working hours.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadHours();
});

const saveHours = async () => {
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

    await $fetch("/api/business-hours", {
      method: "PUT",
      body: { hours: payload },
    });

    successMessage.value = "Working hours saved successfully. Online booking slots updated.";
    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? "Failed to save hours.";
  } finally {
    isSaving.value = false;
  }
};

const applyPreset = (type: "STANDARD" | "EXTENDED" | "WEEKEND_OFF") => {
  schedule.value.forEach((d) => {
    if (type === "STANDARD") {
      if (d.dayOfWeek === 0) {
        d.enabled = false;
      } else if (d.dayOfWeek === 6) {
        d.enabled = true;
        d.startTime = "09:00";
        d.endTime = "17:00";
      } else {
        d.enabled = true;
        d.startTime = "09:00";
        d.endTime = "19:00";
      }
    } else if (type === "EXTENDED") {
      d.enabled = d.dayOfWeek !== 0;
      d.startTime = "08:30";
      d.endTime = "21:00";
    } else if (type === "WEEKEND_OFF") {
      d.enabled = d.dayOfWeek >= 1 && d.dayOfWeek <= 5;
      d.startTime = "09:00";
      d.endTime = "18:00";
    }
  });
};
</script>

<template>
  <div class="space-y-6 pb-16 max-w-4xl">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">Availability & Operations</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Working Hours</h1>
      </div>
      <button
        type="button"
        :disabled="isSaving"
        @click="saveHours"
        class="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition shadow-sm self-start sm:self-auto"
      >
        <Save :size="15" />
        <span>{{ isSaving ? "Saving..." : "Save Schedule" }}</span>
      </button>
    </div>

    <!-- Presets Toolbar -->
    <div class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="text-xs text-stone-500">
        Quick Schedule Presets:
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          @click="applyPreset('STANDARD')"
          class="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
        >
          Greek Retail (Mon-Sat)
        </button>
        <button
          type="button"
          @click="applyPreset('EXTENDED')"
          class="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
        >
          Extended (8:30 - 21:00)
        </button>
        <button
          type="button"
          @click="applyPreset('WEEKEND_OFF')"
          class="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
        >
          Mon - Fri Only
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 7" :key="i" class="h-16 rounded-2xl bg-stone-200/60 animate-pulse"></div>
    </div>

    <!-- Schedule Form -->
    <div v-else class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
      <div class="divide-y divide-stone-100">
        <div
          v-for="day in schedule"
          :key="day.dayOfWeek"
          class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <!-- Day Name & Toggle -->
          <div class="flex items-center gap-4 min-w-44">
            <input
              type="checkbox"
              :id="`day-${day.dayOfWeek}`"
              v-model="day.enabled"
              class="size-4.5 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            />
            <label
              :for="`day-${day.dayOfWeek}`"
              :class="[
                day.enabled ? 'text-stone-900 font-bold' : 'text-stone-400 font-medium',
                'text-sm cursor-pointer select-none',
              ]"
            >
              {{ day.dayName }}
            </label>
          </div>

          <!-- Open/Closed & Time Pickers -->
          <div class="flex items-center gap-3">
            <template v-if="day.enabled">
              <div class="flex items-center gap-2">
                <input
                  v-model="day.startTime"
                  type="time"
                  class="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-stone-900 focus:bg-white"
                />
                <span class="text-xs text-stone-400 font-bold">to</span>
                <input
                  v-model="day.endTime"
                  type="time"
                  class="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>
              <span class="hidden sm:inline rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 uppercase border border-emerald-200">
                Open
              </span>
            </template>
            <template v-else>
              <span class="rounded-md bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-500 uppercase">
                Closed
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <p
        v-if="errorMessage"
        class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center gap-2"
      >
        <AlertCircle :size="16" />
        <span>{{ errorMessage }}</span>
      </p>

      <p
        v-if="successMessage"
        class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700 flex items-center gap-2"
      >
        <Check :size="16" />
        <span>{{ successMessage }}</span>
      </p>
    </div>
  </div>
</template>
