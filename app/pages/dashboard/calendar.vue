<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  UserCheck,
  Phone,
  AlertCircle,
  X,
  CalendarDays,
} from "lucide-vue-next";

definePageMeta({
  layout: "dashboard",
});

interface AppointmentDetail {
  appointment: {
    id: string;
    customerId: string;
    staffId?: string | null;
    serviceId: string;
    startAt: string;
    endAt: string;
    status: string;
    source: string;
    notes?: string | null;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
    accent: string;
  };
  staff?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

const appointments = ref<AppointmentDetail[]>([]);
const staffList = ref<StaffMember[]>([]);
const isLoading = ref(true);
const selectedStaffId = ref("ALL");
const viewMode = ref<"MONTH" | "WEEK" | "DAY">("WEEK");
const currentDate = ref(new Date());

const activeAppointment = ref<AppointmentDetail | null>(null);

const loadCalendarData = async () => {
  isLoading.value = true;
  try {
    const [apptData, staffData] = await Promise.all([
      $fetch<AppointmentDetail[]>("/api/appointments"),
      $fetch<StaffMember[]>("/api/staff"),
    ]);
    appointments.value = apptData;
    staffList.value = staffData.filter((s) => s.active);
  } catch (e) {
    console.error("Failed to load calendar", e);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadCalendarData();
});

const currentMonthLabel = computed(() => {
  return currentDate.value.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
});

const prevPeriod = () => {
  const d = new Date(currentDate.value);
  if (viewMode.value === "MONTH") {
    d.setMonth(d.getMonth() - 1);
  } else if (viewMode.value === "WEEK") {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 1);
  }
  currentDate.value = d;
};

const nextPeriod = () => {
  const d = new Date(currentDate.value);
  if (viewMode.value === "MONTH") {
    d.setMonth(d.getMonth() + 1);
  } else if (viewMode.value === "WEEK") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + 1);
  }
  currentDate.value = d;
};

const goToToday = () => {
  currentDate.value = new Date();
};

// Filtered appointments by staff
const filteredAppointments = computed(() => {
  if (selectedStaffId.value === "unassigned") {
    return appointments.value.filter((a) => !a.appointment.staffId);
  }
  if (selectedStaffId.value !== "ALL") {
    return appointments.value.filter(
      (a) => a.appointment.staffId === selectedStaffId.value,
    );
  }
  return appointments.value;
});

// Week View Days calculation
const weekDays = computed(() => {
  const d = new Date(currentDate.value);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday (monday start)
  const monday = new Date(d.setDate(diff));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
});

const isToday = (d: Date) => {
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

const getAppointmentsForDay = (d: Date) => {
  const dateStr = d.toISOString().slice(0, 10);
  return filteredAppointments.value.filter((a) =>
    a.appointment.startAt.startsWith(dateStr),
  );
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const updateStatus = async (id: string, status: string) => {
  try {
    await $fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      body: { status },
    });
    if (activeAppointment.value) {
      activeAppointment.value.appointment.status = status;
    }
    await loadCalendarData();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to update status");
  }
};
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Header Controls -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">Visual Schedule</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Calendar</h1>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Staff Filter -->
        <select
          v-model="selectedStaffId"
          class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800 shadow-2xs outline-none focus:border-stone-900"
        >
          <option value="ALL">All Staff</option>
          <option value="unassigned">⚠️ Unassigned Bookings</option>
          <option v-for="s in staffList" :key="s.id" :value="s.id">
            {{ s.name }}
          </option>
        </select>

        <!-- View Mode Switcher -->
        <div class="flex rounded-xl bg-stone-200/80 p-1 text-xs font-semibold text-stone-700">
          <button
            type="button"
            @click="viewMode = 'WEEK'"
            :class="[
              viewMode === 'WEEK' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900',
              'rounded-lg px-3 py-1.5 transition',
            ]"
          >
            Week
          </button>
          <button
            type="button"
            @click="viewMode = 'DAY'"
            :class="[
              viewMode === 'DAY' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900',
              'rounded-lg px-3 py-1.5 transition',
            ]"
          >
            Day
          </button>
        </div>

        <NuxtLink
          to="/dashboard/appointments"
          class="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-stone-800 transition"
        >
          <Plus :size="15" />
          <span>New</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Calendar Navigation & Date Banner -->
    <div class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="goToToday"
          class="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
        >
          Today
        </button>
        <div class="flex items-center gap-1">
          <button
            type="button"
            @click="prevPeriod"
            class="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition"
          >
            <ChevronLeft :size="18" />
          </button>
          <button
            type="button"
            @click="nextPeriod"
            class="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition"
          >
            <ChevronRight :size="18" />
          </button>
        </div>
      </div>

      <span class="font-display text-lg font-bold text-stone-900">
        {{ currentMonthLabel }}
      </span>
    </div>

    <!-- WEEK VIEW -->
    <div v-if="viewMode === 'WEEK'" class="grid gap-3 sm:grid-cols-7">
      <div
        v-for="day in weekDays"
        :key="day.toISOString()"
        :class="[
          isToday(day) ? 'border-rose-400 bg-rose-50/20' : 'border-stone-200 bg-white',
          'rounded-2xl border p-3 shadow-2xs min-h-[420px] flex flex-col',
        ]"
      >
        <!-- Day Header -->
        <div class="border-b border-stone-100 pb-2.5 text-center">
          <span class="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
            {{ day.toLocaleDateString(undefined, { weekday: "short" }) }}
          </span>
          <span
            :class="[
              isToday(day) ? 'bg-rose-600 text-white' : 'text-stone-900',
              'mx-auto mt-1 grid size-7 place-items-center rounded-full text-xs font-bold',
            ]"
          >
            {{ day.getDate() }}
          </span>
        </div>

        <!-- Appointments in Day -->
        <div class="flex-1 space-y-2 pt-3 overflow-y-auto max-h-[500px]">
          <div
            v-if="getAppointmentsForDay(day).length === 0"
            class="py-6 text-center text-[11px] text-stone-400 italic"
          >
            Free
          </div>

          <div
            v-for="item in getAppointmentsForDay(day)"
            :key="item.appointment.id"
            @click="activeAppointment = item"
            class="cursor-pointer rounded-xl border border-stone-200/80 bg-stone-50/80 p-2.5 space-y-1 hover:border-stone-400 hover:bg-white transition text-xs shadow-2xs text-left"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-stone-900 text-[11px]">
                {{ formatTime(item.appointment.startAt) }}
              </span>
              <span
                class="size-2 rounded-full shrink-0"
                :style="{ backgroundColor: item.service.accent || '#ca7481' }"
              ></span>
            </div>
            <div class="font-semibold text-stone-800 truncate text-[11px]">
              {{ item.customer.firstName }} {{ item.customer.lastName }}
            </div>
            <div class="text-[10px] text-stone-500 truncate">
              {{ item.service.name }}
            </div>
            <div
              v-if="!item.staff"
              class="text-[9px] font-bold text-amber-700 bg-amber-100/70 px-1 py-0.5 rounded text-center mt-1"
            >
              Unassigned
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DAY VIEW -->
    <div v-else-if="viewMode === 'DAY'" class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
      <div class="border-b border-stone-100 pb-3">
        <h2 class="font-display text-xl font-bold text-stone-900">
          {{ currentDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) }}
        </h2>
      </div>

      <div
        v-if="getAppointmentsForDay(currentDate).length === 0"
        class="py-12 text-center text-xs text-stone-500"
      >
        No appointments scheduled for this date.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in getAppointmentsForDay(currentDate)"
          :key="item.appointment.id"
          @click="activeAppointment = item"
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-stone-200 bg-stone-50/50 p-4 hover:bg-white hover:border-stone-400 cursor-pointer transition shadow-2xs"
        >
          <div class="flex items-center gap-4">
            <div class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-center min-w-16">
              <span class="font-display font-bold text-sm text-stone-900">{{ formatTime(item.appointment.startAt) }}</span>
              <span class="block text-[10px] text-stone-500">{{ item.service.durationMinutes }}m</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="size-2.5 rounded-full" :style="{ backgroundColor: item.service.accent || '#ca7481' }"></span>
                <span class="font-bold text-stone-900 text-sm">{{ item.customer.firstName }} {{ item.customer.lastName }}</span>
                <span class="rounded bg-stone-200/60 px-2 py-0.5 text-[10px] font-bold text-stone-700 uppercase">
                  {{ item.appointment.status }}
                </span>
              </div>
              <div class="text-xs text-stone-500 mt-1">
                {{ item.service.name }} · Staff: {{ item.staff?.name ?? 'Unassigned' }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <span class="font-bold text-stone-900">{{ (item.service.priceCents / 100).toFixed(2) }} €</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Appointment Detail Drawer / Modal -->
    <div
      v-if="activeAppointment"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600">Booking Details</span>
            <h3 class="font-display text-xl font-bold text-stone-900">
              {{ activeAppointment.customer.firstName }} {{ activeAppointment.customer.lastName }}
            </h3>
          </div>
          <button type="button" @click="activeAppointment = null" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="flex items-center justify-between rounded-xl bg-stone-50 p-3">
            <span class="text-stone-500">Service</span>
            <span class="font-bold text-stone-900">{{ activeAppointment.service.name }} ({{ activeAppointment.service.durationMinutes }}m)</span>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-stone-50 p-3">
            <span class="text-stone-500">Scheduled Time</span>
            <span class="font-bold text-stone-900">{{ formatTime(activeAppointment.appointment.startAt) }} ({{ new Date(activeAppointment.appointment.startAt).toLocaleDateString() }})</span>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-stone-50 p-3">
            <span class="text-stone-500">Assigned Staff</span>
            <span class="font-bold text-stone-900">{{ activeAppointment.staff?.name ?? '⚠️ Unassigned' }}</span>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-stone-50 p-3">
            <span class="text-stone-500">Contact Phone</span>
            <span class="font-bold text-stone-900">{{ activeAppointment.customer.phone }}</span>
          </div>
          <div v-if="activeAppointment.appointment.notes" class="rounded-xl bg-stone-50 p-3">
            <span class="block text-stone-500 font-semibold mb-1">Notes:</span>
            <span class="text-stone-800">{{ activeAppointment.appointment.notes }}</span>
          </div>
        </div>

        <!-- Quick Status Actions -->
        <div class="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            @click="updateStatus(activeAppointment.appointment.id, 'CONFIRMED')"
            class="flex-1 rounded-xl bg-emerald-50 border border-emerald-200 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            Confirm
          </button>
          <button
            type="button"
            @click="updateStatus(activeAppointment.appointment.id, 'COMPLETED')"
            class="flex-1 rounded-xl bg-stone-100 border border-stone-200 py-2 text-xs font-bold text-stone-800 hover:bg-stone-200"
          >
            Complete
          </button>
          <button
            type="button"
            @click="updateStatus(activeAppointment.appointment.id, 'CANCELLED')"
            class="flex-1 rounded-xl bg-rose-50 border border-rose-200 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            Cancel
          </button>
        </div>

        <div class="pt-3 border-t border-stone-100 flex justify-end">
          <NuxtLink
            to="/dashboard/appointments"
            class="text-xs font-bold text-stone-900 hover:underline"
          >
            Go to Full Management List →
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
