<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  CalendarCheck,
  ChevronRight,
  Share2,
  RefreshCw,
  Clock,
  Users,
  UserCheck,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  UserPlus,
  ArrowRight,
  Phone,
  Mail,
  Calendar as CalendarIcon,
} from "lucide-vue-next";

definePageMeta({
  layout: "dashboard",
});

interface AppointmentDetail {
  appointment: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    source: string;
    notes?: string | null;
    fieldStatus?: string | null;
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

interface DashboardSummary {
  date: string;
  totalToday: number;
  confirmedToday: number;
  completedToday: number;
  cancelledToday: number;
  noShowToday: number;
  pendingToday: number;
  checkedInToday: number;
  unassignedCount: number;
  totalCustomers: number;
  totalStaff: number;
  totalServices: number;
  todayAppointments: AppointmentDetail[];
  upcomingAppointments: AppointmentDetail[];
}

const summary = ref<DashboardSummary | null>(null);
const staffList = ref<StaffMember[]>([]);
const isLoading = ref(true);
const errorMessage = ref("");
const assigningAppointment = ref<AppointmentDetail | null>(null);
const selectedStaffId = ref<string>("");
const isAssigning = ref(false);

// On-location mode (organization.onLocationEnabled): show the 3 field statuses
const onLocation = ref(false);
const FIELD_STATUSES = [
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ON_THE_WAY", label: "On the way" },
  { value: "ON_LOCATION", label: "On location" },
];
const fieldLabel = (v?: string | null) =>
  FIELD_STATUSES.find((f) => f.value === v)?.label ?? "Not assigned";
const getFieldBadge = (v?: string | null) =>
  v === "ASSIGNED"
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : v === "ON_THE_WAY"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : v === "ON_LOCATION"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-stone-50 text-stone-600 border-stone-200";

const sortedToday = computed(() =>
  [...(summary.value?.todayAppointments ?? [])].sort(
    (a, b) =>
      new Date(a.appointment.startAt).getTime() -
      new Date(b.appointment.startAt).getTime(),
  ),
);
const upcomingCountLabel = computed(() => {
  const n = summary.value?.upcomingAppointments.length ?? 0;
  return n >= 10 ? "10+" : String(n);
});

const loadDashboard = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const [sumData, staffData, org] = await Promise.all([
      $fetch<DashboardSummary>("/api/dashboard/summary"),
      $fetch<StaffMember[]>("/api/staff"),
      $fetch<{ onLocationEnabled?: boolean }>("/api/organization").catch(
        () => null,
      ),
    ]);
    summary.value = sumData;
    onLocation.value = org?.onLocationEnabled === true;
    staffList.value = staffData.filter((s) => s.active);
  } catch (err: any) {
    errorMessage.value =
      err?.data?.statusMessage ?? "Failed to load dashboard data.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadDashboard();
});

const updateStatus = async (appointmentId: string, status: string) => {
  try {
    await $fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      body: { status },
    });
    await loadDashboard();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to update appointment status.");
  }
};

const updateFieldStatus = async (appointmentId: string, fieldStatus: string) => {
  try {
    await $fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      body: { fieldStatus },
    });
    await loadDashboard();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to update status.");
  }
};

const openAssignModal = (appt: AppointmentDetail) => {
  assigningAppointment.value = appt;
  selectedStaffId.value = appt.staff?.id ?? staffList.value[0]?.id ?? "";
};

const saveStaffAssignment = async () => {
  if (!assigningAppointment.value || !selectedStaffId.value) return;
  isAssigning.value = true;
  try {
    await $fetch(
      `/api/appointments/${assigningAppointment.value.appointment.id}`,
      {
        method: "PATCH",
        body: { staffId: selectedStaffId.value },
      },
    );
    assigningAppointment.value = null;
    await loadDashboard();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to assign staff.");
  } finally {
    isAssigning.value = false;
  }
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "CHECKED_IN":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "COMPLETED":
      return "bg-stone-100 text-stone-700 border-stone-200";
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "NO_SHOW":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-stone-50 text-stone-600 border-stone-200";
  }
};
</script>

<template>
  <div class="space-y-6 pb-12 sm:space-y-7">
    <!-- Page Header -->
    <div
      class="page-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">
          Business Control Center
        </p>
        <h1
          class="font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl"
        >
          Studio Overview
        </h1>
      </div>
      <div class="page-head-actions flex items-center gap-2">
        <button
          type="button"
          @click="loadDashboard"
          class="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
        >
          <RefreshCw :size="14" class="sm:hidden" />
          <span>Refresh Data</span>
        </button>
        <NuxtLink
          to="/dashboard/appointments?new=1"
          class="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm"
        >
          <CalendarCheck :size="15" />
          <span>New Appointment</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div class="h-48 rounded-3xl bg-stone-200/60 animate-pulse"></div>
      <div class="grid grid-cols-3 gap-3">
        <div
          v-for="i in 3"
          :key="i"
          class="h-24 rounded-2xl bg-stone-200/60 animate-pulse"
        ></div>
      </div>
    </div>

    <!-- Workspace Not Ready Yet -->
    <div
      v-else-if="errorMessage && errorMessage.includes('No active business')"
      class="rounded-3xl border border-stone-200/90 bg-white p-8 text-center shadow-sm max-w-xl mx-auto my-8"
    >
      <div
        class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 mb-4"
      >
        <Sparkles :size="28" />
      </div>
      <h3 class="font-display text-xl font-bold text-stone-900">
        Preparing your workspace…
      </h3>
      <p class="mt-2 text-sm text-stone-500 leading-relaxed">
        Your business is being provisioned. This usually takes a moment — try
        again in a few seconds.
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          @click="loadDashboard"
          class="tap inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm"
        >
          <span>Retry</span>
          <ArrowRight :size="14" />
        </button>
      </div>
    </div>

    <!-- Other Error State -->
    <div
      v-else-if="errorMessage"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 flex items-center gap-3"
    >
      <AlertCircle :size="20" class="shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <template v-else-if="summary">
      <!-- Unassigned Alert Banner (if any) -->
      <div
        v-if="summary.unassignedCount > 0"
        class="flex flex-col gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <div
            class="grid size-10 place-items-center rounded-xl bg-amber-400/20 text-amber-800 shrink-0"
          >
            <AlertCircle :size="20" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-amber-950">
              {{ summary.unassignedCount }} Unassigned Online Booking{{
                summary.unassignedCount > 1 ? "s" : ""
              }}
            </h2>
            <p class="text-xs text-amber-800/90 mt-0.5">
              Online customer bookings require staff member assignment.
            </p>
          </div>
        </div>
        <NuxtLink
          to="/dashboard/appointments?staffId=unassigned"
          class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white hover:bg-amber-900 transition"
        >
          <span>Assign Staff Now</span>
          <ArrowRight :size="14" />
        </NuxtLink>
      </div>

      <!-- 1. Today's Schedule -->
      <section
        class="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm space-y-4 sm:p-6 sm:space-y-5"
      >
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4"
        >
          <div>
            <h2 class="font-display text-xl font-bold text-stone-900">
              Today's Schedule
            </h2>
            <p class="text-xs text-stone-500 mt-0.5">
              {{ sortedToday.length }} appointment{{
                sortedToday.length === 1 ? "" : "s"
              }}
              today, sorted by time.
            </p>
          </div>
          <NuxtLink
            to="/dashboard/appointments"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-stone-800 transition"
          >
            <span>See all appointments</span>
            <ArrowRight :size="16" />
          </NuxtLink>
        </div>

        <!-- Empty State -->
        <div
          v-if="sortedToday.length === 0"
          class="py-10 text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-4"
        >
          <CalendarIcon :size="32" class="mx-auto text-stone-400" />
          <h3 class="mt-2 text-sm font-semibold text-stone-700">
            No appointments today
          </h3>
          <p class="mt-1 text-xs text-stone-500">
            Your schedule is free for today. New bookings will appear here.
          </p>
          <NuxtLink
            to="/dashboard/appointments?new=1"
            class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Create Appointment
          </NuxtLink>
        </div>

        <!-- Appointments List -->
        <div v-else class="divide-y divide-stone-100">
          <div
            v-for="item in sortedToday"
            :key="item.appointment.id"
            class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-stone-50/50 sm:px-2 rounded-xl"
          >
            <!-- Time & Service Info -->
            <div class="flex min-w-0 items-start gap-3.5">
              <div
                class="shrink-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-center min-w-18"
              >
                <span class="font-display text-sm font-bold text-stone-900">{{
                  formatTime(item.appointment.startAt)
                }}</span>
                <span class="block text-[10px] text-stone-500 font-medium"
                  >{{ item.service.durationMinutes }}m</span
                >
              </div>
              <div class="min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    class="size-2.5 shrink-0 rounded-full"
                    :style="{
                      backgroundColor: item.service.accent || '#ca7481',
                    }"
                  ></span>
                  <span class="font-bold text-stone-900 text-sm"
                    >{{ item.customer.firstName }}
                    {{ item.customer.lastName }}</span
                  >
                  <span
                    v-if="onLocation"
                    :class="[
                      getFieldBadge(item.appointment.fieldStatus),
                      'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    ]"
                  >
                    {{ fieldLabel(item.appointment.fieldStatus) }}
                  </span>
                  <span
                    v-else
                    :class="[
                      getStatusBadge(item.appointment.status),
                      'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    ]"
                  >
                    {{ item.appointment.status.replace("_", " ") }}
                  </span>
                </div>
                <div
                  class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500"
                >
                  <span
                    >{{ item.service.name }} ·
                    {{ (item.service.priceCents / 100).toFixed(2) }} €</span
                  >
                  <span class="hidden text-stone-300 sm:inline">·</span>
                  <a
                    v-if="item.customer.phone"
                    :href="`tel:${item.customer.phone}`"
                    class="inline-flex min-h-8 items-center gap-1 font-semibold text-stone-700 underline-offset-2 hover:underline"
                  >
                    <Phone :size="12" />
                    {{ item.customer.phone }}
                  </a>
                  <span class="hidden text-stone-300 sm:inline">·</span>
                  <span v-if="item.staff" class="font-medium text-stone-700">
                    Staff: {{ item.staff.name }}
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]"
                  >
                    <AlertCircle :size="12" /> Unassigned
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Controls -->
            <div
              class="flex flex-wrap items-center gap-2 sm:gap-1.5 sm:self-center"
            >
              <button
                v-if="!item.staff"
                type="button"
                @click="openAssignModal(item)"
                class="tap inline-flex items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
              >
                <UserPlus :size="13" />
                <span>Assign Staff</span>
              </button>

              <!-- On-location mode: field status quick actions -->
              <template v-if="onLocation">
                <button
                  v-if="
                    item.staff &&
                    item.appointment.fieldStatus !== 'ON_THE_WAY' &&
                    item.appointment.fieldStatus !== 'ON_LOCATION'
                  "
                  type="button"
                  @click="updateFieldStatus(item.appointment.id, 'ON_THE_WAY')"
                  class="tap rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  On the way
                </button>
                <button
                  v-if="item.staff && item.appointment.fieldStatus !== 'ON_LOCATION'"
                  type="button"
                  @click="updateFieldStatus(item.appointment.id, 'ON_LOCATION')"
                  class="tap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  On location
                </button>
              </template>

              <template v-else>
                <button
                  v-if="item.appointment.status === 'PENDING'"
                  type="button"
                  @click="updateStatus(item.appointment.id, 'CONFIRMED')"
                  class="tap rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  Confirm
                </button>

                <button
                  v-if="item.appointment.status === 'CONFIRMED'"
                  type="button"
                  @click="updateStatus(item.appointment.id, 'CHECKED_IN')"
                  class="tap rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  Check-in
                </button>

                <button
                  v-if="
                    item.appointment.status === 'CHECKED_IN' ||
                    item.appointment.status === 'CONFIRMED'
                  "
                  type="button"
                  @click="updateStatus(item.appointment.id, 'COMPLETED')"
                  class="tap rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-200"
                >
                  Complete
                </button>
              </template>

              <button
                v-if="
                  item.appointment.status !== 'CANCELLED' &&
                  item.appointment.status !== 'COMPLETED'
                "
                type="button"
                @click="updateStatus(item.appointment.id, 'CANCELLED')"
                class="tap ml-auto inline-flex items-center justify-center rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 sm:ml-0"
                title="Cancel appointment"
                aria-label="Cancel appointment"
              >
                <XCircle :size="18" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Upcoming Appointments -->
      <section
        class="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm space-y-4 sm:p-6"
      >
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3"
        >
          <div>
            <h2 class="font-display text-lg font-bold text-stone-900">
              Upcoming Appointments
            </h2>
            <p class="text-xs text-stone-500">
              Your next bookings, soonest first.
            </p>
          </div>
          <NuxtLink
            to="/dashboard/calendar"
            class="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-stone-900 hover:text-rose-600 transition sm:min-h-0"
          >
            <span>Open Interactive Calendar</span>
            <ArrowRight :size="14" />
          </NuxtLink>
        </div>

        <div
          v-if="summary.upcomingAppointments.length === 0"
          class="py-8 text-center text-xs text-stone-500"
        >
          No upcoming appointments scheduled after today.
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="item in summary.upcomingAppointments.slice(0, 6)"
            :key="item.appointment.id"
            class="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 space-y-2 hover:bg-white hover:border-stone-300 transition"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-stone-900"
                >{{ formatDate(item.appointment.startAt) }} ·
                {{ formatTime(item.appointment.startAt) }}</span
              >
              <span
                v-if="onLocation"
                :class="[
                  getFieldBadge(item.appointment.fieldStatus),
                  'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase',
                ]"
              >
                {{ fieldLabel(item.appointment.fieldStatus) }}
              </span>
              <span
                v-else
                :class="[
                  getStatusBadge(item.appointment.status),
                  'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                ]"
              >
                {{ item.appointment.status }}
              </span>
            </div>
            <div class="font-bold text-stone-900 text-sm">
              {{ item.customer.firstName }} {{ item.customer.lastName }}
            </div>
            <div class="text-xs text-stone-500">
              {{ item.service.name }} ({{ item.service.durationMinutes }}m)
            </div>
            <div
              class="text-[11px] text-stone-600 pt-2 border-t border-stone-200/60 flex items-center justify-between"
            >
              <span>{{ item.staff ? item.staff.name : "Unassigned" }}</span>
              <span class="font-semibold"
                >{{ (item.service.priceCents / 100).toFixed(2) }} €</span
              >
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Small stat cards (whole card is a link) -->
      <div class="grid grid-cols-3 gap-3 sm:gap-4">
        <NuxtLink
          to="/dashboard/appointments?range=today"
          class="group flex min-h-24 flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3 shadow-sm transition hover:border-stone-400 active:bg-stone-50 sm:p-5"
        >
          <div class="flex items-center justify-between gap-1">
            <span
              class="text-[10px] font-bold uppercase tracking-wider text-stone-500 sm:text-xs"
              >Today's total</span
            >
            <ChevronRight
              :size="16"
              class="shrink-0 text-stone-400 transition group-hover:translate-x-0.5"
            />
          </div>
          <div class="mt-2 flex items-baseline gap-1.5">
            <span
              class="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
              >{{ summary.totalToday }}</span
            >
            <span class="hidden text-xs text-stone-500 font-medium sm:inline"
              >appointments</span
            >
          </div>
        </NuxtLink>

        <NuxtLink
          to="/dashboard/appointments?range=upcoming"
          class="group flex min-h-24 flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3 shadow-sm transition hover:border-stone-400 active:bg-stone-50 sm:p-5"
        >
          <div class="flex items-center justify-between gap-1">
            <span
              class="text-[10px] font-bold uppercase tracking-wider text-stone-500 sm:text-xs"
              >Upcoming</span
            >
            <ChevronRight
              :size="16"
              class="shrink-0 text-stone-400 transition group-hover:translate-x-0.5"
            />
          </div>
          <div class="mt-2 flex items-baseline gap-1.5">
            <span
              class="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
              >{{ upcomingCountLabel }}</span
            >
            <span class="hidden text-xs text-stone-500 font-medium sm:inline"
              >scheduled</span
            >
          </div>
        </NuxtLink>

        <NuxtLink
          to="/dashboard/customers"
          class="group flex min-h-24 flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3 shadow-sm transition hover:border-stone-400 active:bg-stone-50 sm:p-5"
        >
          <div class="flex items-center justify-between gap-1">
            <span
              class="text-[10px] font-bold uppercase tracking-wider text-stone-500 sm:text-xs"
              >Total clients</span
            >
            <ChevronRight
              :size="16"
              class="shrink-0 text-stone-400 transition group-hover:translate-x-0.5"
            />
          </div>
          <div class="mt-2 flex items-baseline gap-1.5">
            <span
              class="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
              >{{ summary.totalCustomers }}</span
            >
            <span class="hidden text-xs text-stone-500 font-medium sm:inline"
              >customers</span
            >
          </div>
        </NuxtLink>
      </div>

      <!-- 4. Team & menu shortcuts -->
      <section
        class="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 class="font-display text-lg font-bold text-stone-900">
          Team &amp; Menu
        </h2>
        <div class="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <NuxtLink
            to="/dashboard/staff"
            class="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-3 transition hover:border-stone-400 hover:bg-white"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600"
              ><UserCheck :size="18"
            /></span>
            <span class="min-w-0">
              <span class="block text-sm font-bold text-stone-900"
                >{{ summary.totalStaff }} Staff</span
              >
              <span class="block text-[11px] text-stone-500">Active team</span>
            </span>
          </NuxtLink>
          <NuxtLink
            to="/dashboard/services"
            class="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-3 transition hover:border-stone-400 hover:bg-white"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"
              ><Sparkles :size="18"
            /></span>
            <span class="min-w-0">
              <span class="block text-sm font-bold text-stone-900"
                >{{ summary.totalServices }} Services</span
              >
              <span class="block text-[11px] text-stone-500">Bookable menu</span>
            </span>
          </NuxtLink>
          <NuxtLink
            to="/dashboard/hours"
            class="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-3 transition hover:border-stone-400 hover:bg-white"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"
              ><Clock :size="18"
            /></span>
            <span class="min-w-0">
              <span class="block text-sm font-bold text-stone-900">Hours</span>
              <span class="block text-[11px] text-stone-500">Opening times</span>
            </span>
          </NuxtLink>
          <NuxtLink
            to="/dashboard/managebookinglink"
            class="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-3 transition hover:border-stone-400 hover:bg-white"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"
              ><Share2 :size="18"
            /></span>
            <span class="min-w-0">
              <span class="block text-sm font-bold text-stone-900"
                >Booking link</span
              >
              <span class="block text-[11px] text-stone-500">Share it</span>
            </span>
          </NuxtLink>
        </div>
      </section>
    </template>

    <!-- Staff Assignment Modal -->
    <div
      v-if="assigningAppointment"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
      @click.self="assigningAppointment = null"
    >
      <div
        class="m-sheet-panel w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5"
      >
        <h3 class="font-display text-xl font-bold text-stone-900">
          Assign Staff Member
        </h3>
        <p class="text-xs text-stone-500">
          Assigning an active team member to
          {{ assigningAppointment.customer.firstName }}
          {{ assigningAppointment.customer.lastName }} for
          {{ assigningAppointment.service.name }}.
        </p>

        <div class="space-y-3">
          <label
            class="block text-xs font-bold uppercase tracking-wider text-stone-600"
            >Select Active Staff</label
          >
          <select
            v-model="selectedStaffId"
            class="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-medium text-stone-900 outline-none focus:border-stone-900 focus:bg-white"
          >
            <option
              v-for="member in staffList"
              :key="member.id"
              :value="member.id"
            >
              {{ member.name }} ({{ member.role }})
            </option>
          </select>
        </div>

        <div
          class="m-sheet-actions flex items-center justify-end gap-2 pt-3 border-t border-stone-100"
        >
          <button
            type="button"
            @click="assigningAppointment = null"
            class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isAssigning"
            @click="saveStaffAssignment"
            class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {{ isAssigning ? "Saving..." : "Confirm Assignment" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
