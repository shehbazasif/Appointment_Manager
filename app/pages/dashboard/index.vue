<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  CalendarCheck,
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

const loadDashboard = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const [sumData, staffData] = await Promise.all([
      $fetch<DashboardSummary>("/api/dashboard/summary"),
      $fetch<StaffMember[]>("/api/staff"),
    ]);
    summary.value = sumData;
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
  <div class="space-y-7 pb-12">
    <!-- Page Header -->
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">
          Business Control Center
        </p>
        <h1
          class="font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl"
        >
          Studio Overview
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="loadDashboard"
          class="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
        >
          <span>Refresh Data</span>
        </button>
        <NuxtLink
          to="/dashboard/appointments"
          class="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm"
        >
          <CalendarCheck :size="15" />
          <span>New Appointment</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="i in 4"
        :key="i"
        class="h-28 rounded-2xl bg-stone-200/60 animate-pulse"
      ></div>
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
          class="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm"
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
      <AlertCircle :size="20" />
      <span>{{ errorMessage }}</span>
    </div>

    <template v-else-if="summary">
      <!-- Unassigned Alert Banner (if any) -->
      <div
        v-if="summary.unassignedCount > 0"
        class="flex flex-col gap-4 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 sm:flex-row sm:items-center sm:justify-between"
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
          class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white hover:bg-amber-900 transition"
        >
          <span>Assign Staff Now</span>
          <ArrowRight :size="14" />
        </NuxtLink>
      </div>

      <!-- Key Metric Overview Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Today's Appointments -->
        <div
          class="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm space-y-3"
        >
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-bold uppercase tracking-wider text-stone-500"
              >Today's Total</span
            >
            <div
              class="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600"
            >
              <CalendarCheck :size="18" />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold tracking-tight text-stone-900">{{
              summary.totalToday
            }}</span>
            <span class="text-xs text-stone-500 font-medium">appointments</span>
          </div>
          <div
            class="flex items-center gap-2 text-[11px] text-stone-500 pt-1 border-t border-stone-100"
          >
            <span class="text-emerald-600 font-semibold"
              >{{ summary.confirmedToday }} Confirmed</span
            >
            ·
            <span class="text-stone-600"
              >{{ summary.completedToday }} Done</span
            >
          </div>
        </div>

        <!-- Upcoming Next 7 Days -->
        <div
          class="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm space-y-3"
        >
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-bold uppercase tracking-wider text-stone-500"
              >Upcoming</span
            >
            <div
              class="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"
            >
              <Clock :size="18" />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold tracking-tight text-stone-900">{{
              summary.upcomingAppointments.length
            }}</span>
            <span class="text-xs text-stone-500 font-medium">scheduled</span>
          </div>
          <div
            class="text-[11px] text-stone-500 pt-1 border-t border-stone-100"
          >
            Active bookings queue
          </div>
        </div>

        <!-- Total Customers CRM -->
        <NuxtLink
          to="/dashboard/customers"
          class="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm space-y-3 hover:border-stone-400 transition"
        >
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-bold uppercase tracking-wider text-stone-500"
              >Total Clients</span
            >
            <div
              class="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"
            >
              <Users :size="18" />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold tracking-tight text-stone-900">{{
              summary.totalCustomers
            }}</span>
            <span class="text-xs text-stone-500 font-medium">customers</span>
          </div>
          <div
            class="text-[11px] text-emerald-600 font-semibold pt-1 border-t border-stone-100 flex items-center justify-between"
          >
            <span>View directory</span>
            <ArrowRight :size="13" />
          </div>
        </NuxtLink>

        <!-- Active Staff & Services -->
        <div
          class="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm space-y-3"
        >
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-bold uppercase tracking-wider text-stone-500"
              >Team & Menu</span
            >
            <div
              class="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600"
            >
              <Sparkles :size="18" />
            </div>
          </div>
          <div class="flex items-baseline gap-3">
            <div>
              <span class="text-2xl font-bold text-stone-900">{{
                summary.totalStaff
              }}</span>
              <span class="text-[11px] text-stone-500 ml-1">Staff</span>
            </div>
            <span class="text-stone-300">|</span>
            <div>
              <span class="text-2xl font-bold text-stone-900">{{
                summary.totalServices
              }}</span>
              <span class="text-[11px] text-stone-500 ml-1">Services</span>
            </div>
          </div>
          <div
            class="text-[11px] text-stone-500 pt-1 border-t border-stone-100"
          >
            Active and bookable
          </div>
        </div>
      </div>

      <!-- Schedule Section: Today's Appointments -->
      <section
        class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5"
      >
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4"
        >
          <div>
            <h2 class="font-display text-xl font-bold text-stone-900">
              Today's Schedule
            </h2>
            <p class="text-xs text-stone-500 mt-0.5">
              Real-time status updates and staff assignments.
            </p>
          </div>
          <NuxtLink
            to="/dashboard/appointments"
            class="text-xs font-bold text-stone-900 hover:text-rose-600 transition flex items-center gap-1"
          >
            <button>Full Appointment Directory</button>
            <ArrowRight :size="14" />
          </NuxtLink>
        </div>

        <!-- Empty State -->
        <div
          v-if="summary.todayAppointments.length === 0"
          class="py-12 text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50"
        >
          <CalendarIcon :size="32" class="mx-auto text-stone-400" />
          <h3 class="mt-2 text-sm font-semibold text-stone-700">
            No appointments today
          </h3>
          <p class="mt-1 text-xs text-stone-500">
            Your schedule is free for today. New bookings will appear here.
          </p>
          <NuxtLink
            to="/dashboard/appointments"
            class="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Create Appointment
          </NuxtLink>
        </div>

        <!-- Appointments List -->
        <div v-else class="divide-y divide-stone-100">
          <div
            v-for="item in summary.todayAppointments"
            :key="item.appointment.id"
            class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-stone-50/50 px-2 rounded-xl"
          >
            <!-- Time & Service Info -->
            <div class="flex items-start gap-3.5">
              <div
                class="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-center min-w-18"
              >
                <span class="font-display text-sm font-bold text-stone-900">{{
                  formatTime(item.appointment.startAt)
                }}</span>
                <span class="block text-[10px] text-stone-500 font-medium"
                  >{{ item.service.durationMinutes }}m</span
                >
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span
                    class="size-2.5 rounded-full"
                    :style="{
                      backgroundColor: item.service.accent || '#ca7481',
                    }"
                  ></span>
                  <span class="font-bold text-stone-900 text-sm"
                    >{{ item.customer.firstName }}
                    {{ item.customer.lastName }}</span
                  >
                  <span
                    :class="[
                      getStatusBadge(item.appointment.status),
                      'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    ]"
                  >
                    {{ item.appointment.status.replace("_", " ") }}
                  </span>
                </div>
                <div
                  class="flex flex-wrap items-center gap-3 text-xs text-stone-500"
                >
                  <span
                    >{{ item.service.name }} ·
                    {{ (item.service.priceCents / 100).toFixed(2) }} €</span
                  >
                  <span class="text-stone-300">·</span>
                  <span class="flex items-center gap-1">
                    <Phone :size="12" />
                    {{ item.customer.phone }}
                  </span>
                  <span class="text-stone-300">·</span>
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
              class="flex flex-wrap items-center gap-1.5 self-end sm:self-center"
            >
              <button
                v-if="!item.staff"
                type="button"
                @click="openAssignModal(item)"
                class="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
              >
                <UserPlus :size="13" />
                <span>Assign Staff</span>
              </button>

              <button
                v-if="item.appointment.status === 'PENDING'"
                type="button"
                @click="updateStatus(item.appointment.id, 'CONFIRMED')"
                class="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
              >
                Confirm
              </button>

              <button
                v-if="item.appointment.status === 'CONFIRMED'"
                type="button"
                @click="updateStatus(item.appointment.id, 'CHECKED_IN')"
                class="rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
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
                class="rounded-lg border border-stone-300 bg-stone-100 px-2.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-200"
              >
                Complete
              </button>

              <button
                v-if="
                  item.appointment.status !== 'CANCELLED' &&
                  item.appointment.status !== 'COMPLETED'
                "
                type="button"
                @click="updateStatus(item.appointment.id, 'CANCELLED')"
                class="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                title="Cancel appointment"
              >
                <XCircle :size="16" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Upcoming Appointments Grid -->
      <section
        class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div
          class="flex items-center justify-between border-b border-stone-100 pb-3"
        >
          <div>
            <h2 class="font-display text-lg font-bold text-stone-900">
              Upcoming Appointments
            </h2>
            <p class="text-xs text-stone-500">
              Upcoming bookings over the next 7 days.
            </p>
          </div>
          <NuxtLink
            to="/dashboard/calendar"
            class="text-xs font-bold text-stone-900 hover:text-rose-600 transition flex items-center gap-1"
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
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-stone-900"
                >{{ formatDate(item.appointment.startAt) }} ·
                {{ formatTime(item.appointment.startAt) }}</span
              >
              <span
                :class="[
                  getStatusBadge(item.appointment.status),
                  'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
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
    </template>

    <!-- Staff Assignment Modal -->
    <div
      v-if="assigningAppointment"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5"
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
          class="flex items-center justify-end gap-2 pt-3 border-t border-stone-100"
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
