<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  Clock,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  MessageSquare,
  Sparkles,
  Calendar,
  ChevronDown,
  X,
} from "lucide-vue-next";

definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

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
    fieldStatus?: string | null;
    location?: { lat: number; lng: number; accuracy?: number | null; note?: string | null } | null;
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
    currency?: string | null;
    accent: string;
  };
  staff?: {
    id: string;
    name: string;
    role: string;
    phone?: string | null;
  } | null;
}

interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  currency?: string | null;
  active: boolean;
  accent: string;
}

interface StaffItem {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

interface CustomerItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
}

type LocationValue = { lat: number; lng: number; accuracy?: number | null; note?: string | null };
const appointments = ref<AppointmentDetail[]>([]);
const services = ref<ServiceItem[]>([]);
const staffList = ref<StaffItem[]>([]);
const customers = ref<CustomerItem[]>([]);
const isLoading = ref(true);

// On-location service mode (car towing, dog cleaning ...): 3 statuses + WhatsApp to staff
const onLocation = ref(false);
const FIELD_STATUSES = [
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ON_THE_WAY", label: "On the way" },
  { value: "ON_LOCATION", label: "On location" },
];
const fieldLabel = (v?: string | null) => FIELD_STATUSES.find((f) => f.value === v)?.label ?? "Not assigned";
const getFieldBadge = (v?: string | null) =>
  v === "ASSIGNED"
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : v === "ON_THE_WAY"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : v === "ON_LOCATION"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-stone-50 text-stone-600 border-stone-200";
const mapsUrl = (item: AppointmentDetail) => {
  const l = item.appointment.location;
  return l ? `https://www.google.com/maps?q=${l.lat},${l.lng}` : "";
};
const whatsappUrl = (item: AppointmentDetail) => {
  const phone = (item.staff?.phone ?? "").replace(/\D/g, "");
  if (!phone) return "";
  const a = item.appointment;
  const lines = [
    `Hello ${item.staff?.name ?? ""}, new job for you:`,
    ``,
    `Customer: ${item.customer.firstName} ${item.customer.lastName === "Customer" ? "" : item.customer.lastName}`.trim(),
    `Phone: ${item.customer.phone}`,
    `Service: ${item.service.name}`,
    `When: ${formatDate(a.startAt)} ${formatTime(a.startAt)}`,
    a.location ? `Location: ${mapsUrl(item)}` : "",
    a.location?.note ? `Landmark: ${a.location.note}` : "",
    a.notes ? `Notes: ${a.notes}` : "",
  ];
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n").replace(/\n{3,}/g, "\n\n"))}`;
};
const searchQuery = ref("");
const statusFilter = ref<string>("ALL");
const staffFilter = ref<string>((route.query.staffId as string) || "ALL");

// Date filter can be pre-set from the URL: ?range=today | tomorrow | upcoming
// (used by the dashboard stat cards). The URL is kept in sync when the user
// changes the filter afterwards, so Back / refresh keep the same view.
const RANGE_TO_FILTER: Record<string, string> = {
  today: "TODAY",
  tomorrow: "TOMORROW",
  upcoming: "UPCOMING",
};
const rangeFromQuery = () =>
  RANGE_TO_FILTER[String(route.query.range ?? "").toLowerCase()] ?? "ALL";
const dateFilter = ref<string>(rangeFromQuery());
const router = useRouter();
watch(
  () => route.query.range,
  () => {
    dateFilter.value = rangeFromQuery();
  },
);
watch(dateFilter, (val) => {
  const range = Object.keys(RANGE_TO_FILTER).find(
    (k) => RANGE_TO_FILTER[k] === val,
  );
  if ((route.query.range ?? undefined) === range) return;
  const query = { ...route.query };
  if (range) query.range = range;
  else delete query.range;
  router.replace({ query });
});

// Phones: filters collapse behind one "Filters" button (search stays visible)
const filtersOpen = ref(false);
const activeFilterCount = computed(
  () =>
    [dateFilter.value, statusFilter.value, staffFilter.value].filter(
      (v) => v !== "ALL",
    ).length,
);
const clearFilters = () => {
  dateFilter.value = "ALL";
  statusFilter.value = "ALL";
  staffFilter.value = "ALL";
};

const waTarget = useExternalLinkTarget();

// Modals
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showAssignModal = ref(false);
const showCommModal = ref(false);
const selectedCustomerForComm = ref<any>(null);
const activeAppointment = ref<AppointmentDetail | null>(null);

// Forms
const createForm = reactive({
  customerId: "",
  newCustomerFirstName: "",
  newCustomerLastName: "",
  newCustomerPhone: "",
  newCustomerEmail: "",
  serviceId: "",
  staffId: "",
  date: new Date().toISOString().slice(0, 10),
  time: "10:00",
  notes: "",
  location: null as LocationValue | null,
  isNewCustomer: false,
});

const editForm = reactive({
  fieldStatus: "",
  serviceId: "",
  staffId: "",
  date: "",
  time: "",
  status: "",
  notes: "",
  location: null as LocationValue | null,
});

const assignStaffId = ref("");
const isSubmitting = ref(false);
const formError = ref("");

const loadData = async () => {
  isLoading.value = true;
  try {
    try {
      const org = await $fetch<{ onLocationEnabled?: boolean }>("/api/organization");
      onLocation.value = org.onLocationEnabled === true;
    } catch {}
    const [apptData, servData, staffData, custData] = await Promise.all([
      $fetch<AppointmentDetail[]>("/api/appointments"),
      $fetch<ServiceItem[]>("/api/services"),
      $fetch<StaffItem[]>("/api/staff"),
      $fetch<CustomerItem[]>("/api/customers"),
    ]);
    appointments.value = apptData;
    services.value = servData.filter((s) => s.active);
    staffList.value = staffData.filter((s) => s.active);
    customers.value = custData;

    if (services.value.length > 0 && !createForm.serviceId) {
      createForm.serviceId = services.value[0]?.id ?? "";
    }
  } catch (err: any) {
    console.error("Failed to fetch appointments data", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await loadData();
  // "New Appointment" from the dashboard opens the booking form directly
  if (route.query.new === "1") {
    openCreateModal();
    const query = { ...route.query };
    delete query.new;
    router.replace({ query });
  }
});

// Filter appointments locally
const filteredAppointments = computed(() => {
  let list = appointments.value;

  // Search filter
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (a) =>
        a.customer.firstName.toLowerCase().includes(q) ||
        a.customer.lastName.toLowerCase().includes(q) ||
        a.customer.phone.includes(q) ||
        (a.customer.email && a.customer.email.toLowerCase().includes(q)) ||
        a.service.name.toLowerCase().includes(q),
    );
  }

  // Status filter
  if (statusFilter.value !== "ALL") {
    if (onLocation.value) {
      list = list.filter((a) =>
        statusFilter.value === "NONE"
          ? !a.appointment.fieldStatus
          : a.appointment.fieldStatus === statusFilter.value,
      );
    } else {
      list = list.filter((a) => a.appointment.status === statusFilter.value);
    }
  }

  // Staff filter
  if (staffFilter.value === "unassigned") {
    list = list.filter((a) => !a.appointment.staffId);
  } else if (staffFilter.value !== "ALL") {
    list = list.filter((a) => a.appointment.staffId === staffFilter.value);
  }

  // Date filter (compared in the user's local time zone, same as the
  // dashboard's "Today" numbers)
  const now = new Date();
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const todayKey = dayKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dayKey(tomorrow);

  if (dateFilter.value === "TODAY") {
    list = list.filter((a) => dayKey(new Date(a.appointment.startAt)) === todayKey);
  } else if (dateFilter.value === "TOMORROW") {
    list = list.filter((a) => dayKey(new Date(a.appointment.startAt)) === tomorrowKey);
  } else if (dateFilter.value === "UPCOMING") {
    list = list.filter((a) => new Date(a.appointment.startAt) >= now);
  }

  // Today / upcoming views read best in time order
  if (dateFilter.value !== "ALL") {
    list = [...list].sort(
      (a, b) =>
        new Date(a.appointment.startAt).getTime() -
        new Date(b.appointment.startAt).getTime(),
    );
  }

  return list;
});

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const updateFieldStatus = async (id: string, fieldStatus: string) => {
  try {
    await $fetch(`/api/appointments/${id}`, { method: "PATCH", body: { fieldStatus } });
    await loadData();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Status update failed.");
  }
};

const updateStatus = async (id: string, status: string) => {
  try {
    await $fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      body: { status },
    });
    await loadData();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Status update failed.");
  }
};

const openCreateModal = () => {
  formError.value = "";
  createForm.customerId = customers.value[0]?.id ?? "";
  createForm.isNewCustomer = false;
  createForm.newCustomerFirstName = "";
  createForm.newCustomerLastName = "";
  createForm.newCustomerPhone = "";
  createForm.newCustomerEmail = "";
  createForm.notes = "";
  createForm.location = null;
  createForm.staffId = "";
  const today = new Date();
  createForm.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  showCreateModal.value = true;
};

const handleCreateAppointment = async () => {
  formError.value = "";
  isSubmitting.value = true;
  try {
    let customerId = createForm.customerId;

    if (createForm.isNewCustomer) {
      if (!createForm.newCustomerFirstName.trim() || !createForm.newCustomerPhone.trim()) {
        formError.value = "First name and phone number are required for new customer.";
        isSubmitting.value = false;
        return;
      }
      const newCust = await $fetch<CustomerItem>("/api/customers", {
        method: "POST",
        body: {
          firstName: createForm.newCustomerFirstName.trim(),
          lastName: createForm.newCustomerLastName.trim() || "Customer",
          phone: createForm.newCustomerPhone.trim(),
          email: createForm.newCustomerEmail.trim() || null,
        },
      });
      customerId = newCust.id;
    }

    const startAt = new Date(`${createForm.date}T${createForm.time}:00`);

    await $fetch("/api/appointments", {
      method: "POST",
      body: {
        customerId,
        serviceId: createForm.serviceId,
        staffId: createForm.staffId || null,
        startAt: startAt.toISOString(),
        notes: createForm.notes.trim() || null,
        source: "MANUAL",
        ...(onLocation.value && createForm.location ? { location: createForm.location } : {}),
      },
    });

    showCreateModal.value = false;
    await loadData();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? "Failed to create appointment.";
  } finally {
    isSubmitting.value = false;
  }
};

const openEditModal = (item: AppointmentDetail) => {
  activeAppointment.value = item;
  const start = new Date(item.appointment.startAt);
  editForm.serviceId = item.service.id;
  editForm.staffId = item.appointment.staffId ?? "";
  // local calendar date (toISOString() would give the UTC date)
  editForm.date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  editForm.time = start.toTimeString().slice(0, 5);
  editForm.status = item.appointment.status;
  editForm.fieldStatus = item.appointment.fieldStatus ?? (item.appointment.staffId ? "ASSIGNED" : "");
  editForm.notes = item.appointment.notes ?? "";
  editForm.location = item.appointment.location
    ? { ...item.appointment.location }
    : null;
  formError.value = "";
  showEditModal.value = true;
};

const handleEditAppointment = async () => {
  if (!activeAppointment.value) return;
  formError.value = "";
  isSubmitting.value = true;
  try {
    const startAt = new Date(`${editForm.date}T${editForm.time}:00`);

    await $fetch(`/api/appointments/${activeAppointment.value.appointment.id}`, {
      method: "PATCH",
      body: {
        serviceId: editForm.serviceId,
        staffId: editForm.staffId || null,
        startAt: startAt.toISOString(),
        ...(onLocation.value
          ? { fieldStatus: editForm.staffId ? ((editForm.fieldStatus || "ASSIGNED") as any) : null }
          : { status: editForm.status as any }),
        notes: editForm.notes.trim() || null,
        ...(onLocation.value ? { location: editForm.location } : {}),
      },
    });

    showEditModal.value = false;
    await loadData();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? "Failed to update appointment.";
  } finally {
    isSubmitting.value = false;
  }
};

const openAssignModal = (item: AppointmentDetail) => {
  activeAppointment.value = item;
  assignStaffId.value = item.appointment.staffId ?? (staffList.value[0]?.id ?? "");
  showAssignModal.value = true;
};

const handleAssignStaff = async () => {
  if (!activeAppointment.value || !assignStaffId.value) return;
  isSubmitting.value = true;
  try {
    await $fetch(`/api/appointments/${activeAppointment.value.appointment.id}`, {
      method: "PATCH",
      body: { staffId: assignStaffId.value },
    });
    showAssignModal.value = false;
    await loadData();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to assign staff.");
  } finally {
    isSubmitting.value = false;
  }
};

const openCommunication = (cust: any, apptId: string) => {
  selectedCustomerForComm.value = cust;
  showCommModal.value = true;
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
    case "RESCHEDULED":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-stone-50 text-stone-600 border-stone-200";
  }
};
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Header -->
    <div class="page-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">Scheduling</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Appointments</h1>
      </div>
      <div class="page-head-actions flex items-center gap-2">
        <NuxtLink
          to="/dashboard/calendar"
          class="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
        >
          <Calendar :size="15" />
          <span>Calendar View</span>
        </NuxtLink>
        <button
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm"
        >
          <Plus :size="16" />
          <span>New Booking</span>
        </button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm space-y-3 sm:p-4">
      <!-- Phones: search + Filters toggle in one row -->
      <div class="flex items-center gap-2 md:hidden">
        <div class="relative min-w-0 flex-1">
          <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            v-model="searchQuery"
            type="search"
            enterkeyhint="search"
            placeholder="Search client, phone..."
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-10 pr-3 py-2 outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>
        <button
          type="button"
          @click="filtersOpen = !filtersOpen"
          :aria-expanded="filtersOpen"
          :class="[
            filtersOpen || activeFilterCount ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700',
            'tap inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-bold',
          ]"
        >
          <Filter :size="16" />
          <span>Filters</span>
          <span
            v-if="activeFilterCount"
            class="grid size-5 place-items-center rounded-full bg-rose-500 text-[11px] text-white"
          >{{ activeFilterCount }}</span>
          <ChevronDown :size="16" :class="filtersOpen ? 'rotate-180' : ''" class="transition" />
        </button>
      </div>

      <div :class="[filtersOpen ? 'grid' : 'hidden', 'gap-3 md:grid md:grid-cols-4']">
        <!-- Search Input (tablet / desktop) -->
        <div class="relative hidden md:col-span-1 md:block">
          <Search :size="15" class="absolute left-3.5 top-3 text-stone-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search client, phone, service..."
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-9 pr-3 py-2 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <!-- Date Range Filter -->
        <div>
          <select
            v-model="dateFilter"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 outline-none focus:border-stone-900 focus:bg-white"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today's Schedule</option>
            <option value="TOMORROW">Tomorrow</option>
            <option value="UPCOMING">Upcoming Queue</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <select
            v-model="statusFilter"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 outline-none focus:border-stone-900 focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            <template v-if="onLocation">
              <option value="NONE">Not assigned</option>
              <option v-for="f in FIELD_STATUSES" :key="f.value" :value="f.value">{{ f.label }}</option>
            </template>
            <template v-else>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked-in</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-Show</option>
            <option value="RESCHEDULED">Rescheduled</option>
            </template>
          </select>
        </div>

        <!-- Staff Member Filter -->
        <div>
          <select
            v-model="staffFilter"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 outline-none focus:border-stone-900 focus:bg-white"
          >
            <option value="ALL">All Staff Members</option>
            <option value="unassigned">⚠️ Unassigned Only</option>
            <option v-for="s in staffList" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
        </div>

        <button
          v-if="activeFilterCount"
          type="button"
          @click="clearFilters"
          class="tap rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 md:hidden"
        >
          Clear filters
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 rounded-2xl bg-stone-200/60 animate-pulse"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredAppointments.length === 0"
      class="py-16 text-center rounded-3xl border border-dashed border-stone-200 bg-white"
    >
      <CalendarCheck :size="36" class="mx-auto text-stone-400" />
      <h3 class="mt-3 font-display text-lg font-bold text-stone-900">No appointments found</h3>
      <p class="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
        Try adjusting your search criteria or create a new appointment manually.
      </p>
      <button
        type="button"
        @click="openCreateModal"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white"
      >
        <Plus :size="14" />
        <span>Create Booking</span>
      </button>
    </div>

    <template v-else>
    <!-- Phones: booking cards (tap a card to edit / reschedule) -->
    <div class="space-y-3 md:hidden">
      <p class="px-1 text-xs font-semibold text-stone-500">
        {{ filteredAppointments.length }} booking{{ filteredAppointments.length === 1 ? "" : "s" }}
      </p>
      <article
        v-for="item in filteredAppointments"
        :key="item.appointment.id"
        role="button"
        tabindex="0"
        @click="openEditModal(item)"
        @keydown.enter.self="openEditModal(item)"
        class="cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition active:bg-stone-50"
      >
        <!-- Top row: date/time + status -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-bold text-stone-900">
              {{ formatDate(item.appointment.startAt) }} · {{ formatTime(item.appointment.startAt) }}
            </div>
            <div class="text-[11px] font-medium text-stone-500">{{ item.service.durationMinutes }} min</div>
          </div>
          <span
            v-if="onLocation"
            :class="[
              getFieldBadge(item.appointment.fieldStatus),
              'shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
            ]"
          >
            {{ fieldLabel(item.appointment.fieldStatus) }}
          </span>
          <span
            v-else
            :class="[
              getStatusBadge(item.appointment.status),
              'shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
            ]"
          >
            {{ item.appointment.status.replace('_', ' ') }}
          </span>
        </div>

        <!-- Customer -->
        <div class="mt-3">
          <div class="text-base font-bold text-stone-900">
            {{ item.customer.firstName }} {{ item.customer.lastName }}
          </div>
          <a
            v-if="item.customer.phone"
            :href="`tel:${item.customer.phone}`"
            @click.stop
            class="mt-0.5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-rose-700"
          >
            <Phone :size="15" />
            {{ item.customer.phone }}
          </a>
        </div>

        <!-- Service + price -->
        <div class="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 text-sm">
          <span class="flex min-w-0 items-center gap-2">
            <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.service.accent || '#ca7481' }"></span>
            <span class="truncate font-semibold text-stone-800">{{ item.service.name }}</span>
          </span>
          <span class="shrink-0 font-bold text-stone-900">{{ formatMoney(item.service.priceCents, item.service.currency) }}</span>
        </div>

        <!-- Staff -->
        <div class="mt-2 flex items-center justify-between gap-2 text-sm">
          <span v-if="item.staff" class="inline-flex items-center gap-1.5 font-semibold text-stone-800">
            <UserCheck :size="15" class="text-emerald-600" />
            {{ item.staff.name }}
          </span>
          <button
            v-else
            type="button"
            @click.stop="openAssignModal(item)"
            class="tap inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-700"
          >
            <AlertCircle :size="15" />
            <span>Assign staff</span>
          </button>
          <span class="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">
            {{ item.appointment.source }}
          </span>
        </div>

        <!-- Action buttons -->
        <div class="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3" @click.stop>
          <button
            type="button"
            @click="openEditModal(item)"
            class="tap inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-800"
          >
            <Edit2 :size="15" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            @click="openCommunication(item.customer, item.appointment.id)"
            class="tap inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-stone-700"
            aria-label="Message client"
            title="Message client"
          >
            <MessageSquare :size="17" />
          </button>

          <!-- On-location actions -->
          <template v-if="onLocation">
            <a
              v-if="mapsUrl(item)"
              :href="mapsUrl(item)"
              target="_blank"
              rel="noopener"
              class="tap inline-flex flex-1 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 px-3 text-sm font-bold text-stone-800"
            >
              Open map
            </a>
            <a
              v-if="item.staff && whatsappUrl(item)"
              :href="whatsappUrl(item)"
              :target="waTarget"
              rel="noopener"
              class="tap inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white"
            >
              WhatsApp staff
            </a>
            <span
              v-else-if="item.staff"
              class="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700"
            >
              No staff phone
            </span>
            <button
              v-if="item.staff && item.appointment.fieldStatus !== 'ON_THE_WAY' && item.appointment.fieldStatus !== 'ON_LOCATION'"
              type="button"
              @click="updateFieldStatus(item.appointment.id, 'ON_THE_WAY')"
              class="tap flex-1 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-700"
            >
              On the way
            </button>
            <button
              v-if="item.staff && item.appointment.fieldStatus !== 'ON_LOCATION'"
              type="button"
              @click="updateFieldStatus(item.appointment.id, 'ON_LOCATION')"
              class="tap flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700"
            >
              On location
            </button>
          </template>

          <!-- Status quick changes -->
          <button
            v-if="!onLocation && item.appointment.status === 'CONFIRMED'"
            type="button"
            @click="updateStatus(item.appointment.id, 'CHECKED_IN')"
            class="tap flex-1 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700"
          >
            Check-in
          </button>
          <button
            v-if="!onLocation && (item.appointment.status === 'CHECKED_IN' || item.appointment.status === 'CONFIRMED')"
            type="button"
            @click="updateStatus(item.appointment.id, 'COMPLETED')"
            class="tap flex-1 rounded-xl border border-stone-200 bg-stone-100 px-3 text-sm font-bold text-stone-800"
          >
            Done
          </button>
          <button
            v-if="item.appointment.status !== 'CANCELLED' && item.appointment.status !== 'COMPLETED'"
            type="button"
            @click="updateStatus(item.appointment.id, 'CANCELLED')"
            class="tap inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-stone-400 hover:text-rose-600"
            aria-label="Cancel appointment"
            title="Cancel appointment"
          >
            <XCircle :size="18" />
          </button>
        </div>
      </article>
    </div>

    <!-- Tablet / desktop: table -->
    <div class="hidden rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden md:block">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-stone-600">
          <thead class="bg-stone-50/80 border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            <tr>
              <th class="py-3.5 pl-6 pr-3">Date & Time</th>
              <th class="px-3 py-3.5">Customer</th>
              <th class="px-3 py-3.5">Service</th>
              <th class="px-3 py-3.5">Staff Assigned</th>
              <th class="px-3 py-3.5">Status</th>
              <th class="px-3 py-3.5">Source</th>
              <th class="py-3.5 pl-3 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100 font-medium">
            <tr
              v-for="item in filteredAppointments"
              :key="item.appointment.id"
              class="hover:bg-stone-50/60 transition"
            >
              <!-- Date & Time -->
              <td class="py-4 pl-6 pr-3 whitespace-nowrap">
                <div class="font-bold text-stone-900">{{ formatDate(item.appointment.startAt) }}</div>
                <div class="text-[11px] text-stone-500 font-display font-semibold">{{ formatTime(item.appointment.startAt) }} ({{ item.service.durationMinutes }}m)</div>
              </td>

              <!-- Customer -->
              <td class="px-3 py-4 whitespace-nowrap">
                <div class="font-bold text-stone-900">{{ item.customer.firstName }} {{ item.customer.lastName }}</div>
                <div class="text-[11px] text-stone-500 flex items-center gap-1">
                  <Phone :size="11" />
                  {{ item.customer.phone }}
                </div>
              </td>

              <!-- Service -->
              <td class="px-3 py-4 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full" :style="{ backgroundColor: item.service.accent || '#ca7481' }"></span>
                  <span class="font-semibold text-stone-800">{{ item.service.name }}</span>
                </div>
                <div class="text-[11px] text-stone-500 font-bold">{{ formatMoney(item.service.priceCents, item.service.currency) }}</div>
              </td>

              <!-- Staff Assigned -->
              <td class="px-3 py-4 whitespace-nowrap">
                <div v-if="item.staff" class="inline-flex items-center gap-1 text-stone-800 font-semibold">
                  <UserCheck :size="13" class="text-emerald-600" />
                  <span>{{ item.staff.name }}</span>
                </div>
                <button
                  v-else
                  type="button"
                  @click="openAssignModal(item)"
                  class="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                >
                  <AlertCircle :size="12" />
                  <span>Assign Staff</span>
                </button>
              </td>

              <!-- Status -->
              <td class="px-3 py-4 whitespace-nowrap">
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
                  {{ item.appointment.status.replace('_', ' ') }}
                </span>
              </td>

              <!-- Source -->
              <td class="px-3 py-4 whitespace-nowrap">
                <span class="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                  {{ item.appointment.source }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    @click="openCommunication(item.customer, item.appointment.id)"
                    class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    title="Message Client"
                  >
                    <MessageSquare :size="15" />
                  </button>

                  <button
                    type="button"
                    @click="openEditModal(item)"
                    class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    title="Edit / Reschedule"
                  >
                    <Edit2 :size="15" />
                  </button>

                  <!-- On-location actions -->
                  <template v-if="onLocation">
                    <a
                      v-if="mapsUrl(item)"
                      :href="mapsUrl(item)"
                      target="_blank"
                      rel="noopener"
                      class="rounded-lg bg-stone-100 border border-stone-200 px-2 py-1 text-[11px] font-bold text-stone-800 hover:bg-stone-200"
                    >
                      Open map
                    </a>
                    <a
                      v-if="item.staff && whatsappUrl(item)"
                      :href="whatsappUrl(item)"
                      :target="waTarget"
                      rel="noopener"
                      class="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                      title="Send job details to staff on WhatsApp"
                    >
                      WhatsApp staff
                    </a>
                    <span
                      v-else-if="item.staff"
                      class="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-bold text-amber-700"
                      title="Add this staff member's WhatsApp number on the Staff page"
                    >
                      No staff phone
                    </span>
                    <button
                      v-if="item.staff && item.appointment.fieldStatus !== 'ON_THE_WAY' && item.appointment.fieldStatus !== 'ON_LOCATION'"
                      type="button"
                      @click="updateFieldStatus(item.appointment.id, 'ON_THE_WAY')"
                      class="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                    >
                      On the way
                    </button>
                    <button
                      v-if="item.staff && item.appointment.fieldStatus !== 'ON_LOCATION'"
                      type="button"
                      @click="updateFieldStatus(item.appointment.id, 'ON_LOCATION')"
                      class="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      On location
                    </button>
                  </template>

                  <!-- Status quick changes -->
                  <button
                    v-if="!onLocation && item.appointment.status === 'CONFIRMED'"
                    type="button"
                    @click="updateStatus(item.appointment.id, 'CHECKED_IN')"
                    class="rounded-lg bg-blue-50 border border-blue-200 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Check-in
                  </button>

                  <button
                    v-if="!onLocation && (item.appointment.status === 'CHECKED_IN' || item.appointment.status === 'CONFIRMED')"
                    type="button"
                    @click="updateStatus(item.appointment.id, 'COMPLETED')"
                    class="rounded-lg bg-stone-100 border border-stone-200 px-2 py-1 text-[11px] font-bold text-stone-800 hover:bg-stone-200"
                  >
                    Done
                  </button>

                  <button
                    v-if="item.appointment.status !== 'CANCELLED' && item.appointment.status !== 'COMPLETED'"
                    type="button"
                    @click="updateStatus(item.appointment.id, 'CANCELLED')"
                    class="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Cancel Appointment"
                  >
                    <XCircle :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </template>

    <!-- Create Appointment Modal -->
    <div
      v-if="showCreateModal"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div class="m-sheet-panel w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5 my-8">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 class="font-display text-xl font-bold text-stone-900">New Appointment</h3>
            <p class="text-xs text-stone-500">Book an appointment manually into your schedule.</p>
          </div>
          <button type="button" @click="showCreateModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleCreateAppointment" class="space-y-4">
          <!-- Customer Selection Mode -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold uppercase tracking-wider text-stone-600">Client Information</label>
              <button
                type="button"
                @click="createForm.isNewCustomer = !createForm.isNewCustomer"
                class="text-xs font-semibold text-rose-600 hover:underline"
              >
                {{ createForm.isNewCustomer ? "Select existing client" : "+ Add new client" }}
              </button>
            </div>

            <!-- Existing Customer Select -->
            <select
              v-if="!createForm.isNewCustomer"
              v-model="createForm.customerId"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option v-for="c in customers" :key="c.id" :value="c.id">
                {{ c.firstName }} {{ c.lastName }} ({{ c.phone }})
              </option>
            </select>

            <!-- New Customer Fields -->
            <div v-else class="grid gap-2.5 rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5">
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="createForm.newCustomerFirstName"
                  type="text"
                  placeholder="First name"
                  required
                  class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                />
                <input
                  v-model="createForm.newCustomerLastName"
                  type="text"
                  placeholder="Last name"
                  class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="createForm.newCustomerPhone"
                  type="tel"
                  placeholder="Phone number"
                  required
                  class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                />
                <input
                  v-model="createForm.newCustomerEmail"
                  type="email"
                  placeholder="Email (optional)"
                  class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                />
              </div>
            </div>
          </div>

          <!-- Service Selection -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Service</label>
            <select
              v-model="createForm.serviceId"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option v-for="s in services" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.durationMinutes }}m) — {{ formatMoney(s.priceCents, s.currency) }}
              </option>
            </select>
          </div>

          <!-- Staff Assignment -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Assign Staff Member (Optional)
            </label>
            <select
              v-model="createForm.staffId"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option value="">Leave Unassigned (Assign later)</option>
              <option v-for="member in staffList" :key="member.id" :value="member.id">
                {{ member.name }} ({{ member.role }})
              </option>
            </select>
          </div>

          <!-- Date & Time -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Date</label>
              <input
                v-model="createForm.date"
                type="date"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Time</label>
              <input
                v-model="createForm.time"
                type="time"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <!-- On-location: where the staff member has to go -->
          <LocationInput v-if="onLocation" v-model="createForm.location" />

          <!-- Notes -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Notes (Optional)</label>
            <textarea
              v-model="createForm.notes"
              rows="2"
              placeholder="Special instructions or requests..."
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            ></textarea>
          </div>

          <!-- Error Alert -->
          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="m-sheet-actions flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              @click="showCreateModal = false"
              class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? "Creating..." : "Save Appointment" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Appointment Modal -->
    <div
      v-if="showEditModal && activeAppointment"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div class="m-sheet-panel w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5 my-8">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 class="font-display text-xl font-bold text-stone-900">Edit / Reschedule</h3>
            <p class="text-xs text-stone-500">
              Editing booking for {{ activeAppointment.customer.firstName }} {{ activeAppointment.customer.lastName }}.
            </p>
          </div>
          <button type="button" @click="showEditModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleEditAppointment" class="space-y-4">
          <!-- Service Selection -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Service</label>
            <select
              v-model="editForm.serviceId"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option v-for="s in services" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.durationMinutes }}m) — {{ formatMoney(s.priceCents, s.currency) }}
              </option>
            </select>
          </div>

          <!-- Staff Selection -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Assigned Staff</label>
            <select
              v-model="editForm.staffId"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option value="">Unassigned</option>
              <option v-for="member in staffList" :key="member.id" :value="member.id">
                {{ member.name }} ({{ member.role }})
              </option>
            </select>
          </div>

          <!-- Date & Time (Reschedule) -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Date</label>
              <input
                v-model="editForm.date"
                type="date"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Time</label>
              <input
                v-model="editForm.time"
                type="time"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <!-- Status (on-location mode: only Assigned / On the way / On location) -->
          <div v-if="onLocation">
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Status</label>
            <select
              v-model="editForm.fieldStatus"
              :disabled="!editForm.staffId"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white disabled:opacity-60"
            >
              <option v-for="f in FIELD_STATUSES" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
            <p v-if="!editForm.staffId" class="mt-1 text-[11px] text-amber-700">Assign a staff member first.</p>
            <a
              v-if="activeAppointment?.appointment.location"
              :href="mapsUrl(activeAppointment)"
              target="_blank"
              rel="noopener"
              class="mt-2 inline-block text-xs font-bold text-rose-600 underline"
            >
              Open customer location in Google Maps
            </a>
          </div>
          <div v-else>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Status</label>
            <select
              v-model="editForm.status"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked-in</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No-Show</option>
              <option value="RESCHEDULED">Rescheduled</option>
            </select>
          </div>

          <!-- On-location: change / set the customer location -->
          <LocationInput v-if="onLocation" v-model="editForm.location" />

          <!-- Notes -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Notes</label>
            <textarea
              v-model="editForm.notes"
              rows="2"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            ></textarea>
          </div>

          <!-- Error Alert -->
          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="m-sheet-actions flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              @click="showEditModal = false"
              class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? "Saving..." : "Update Appointment" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Quick Staff Assign Modal -->
    <div
      v-if="showAssignModal && activeAppointment"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="m-sheet-panel w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <h3 class="font-display text-xl font-bold text-stone-900">Assign Staff Member</h3>
        <p class="text-xs text-stone-500">
          Assigning a team member to {{ activeAppointment.customer.firstName }} {{ activeAppointment.customer.lastName }} for {{ activeAppointment.service.name }}.
        </p>

        <div class="space-y-3">
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600">Active Staff Members</label>
          <select
            v-model="assignStaffId"
            class="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-medium text-stone-900 outline-none focus:border-stone-900 focus:bg-white"
          >
            <option v-for="member in staffList" :key="member.id" :value="member.id">
              {{ member.name }} ({{ member.role }})
            </option>
          </select>
        </div>

        <div class="m-sheet-actions flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            @click="showAssignModal = false"
            class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="handleAssignStaff"
            class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {{ isSubmitting ? "Saving..." : "Confirm" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Customer Communication Modal -->
    <CommunicationModal
      v-model="showCommModal"
      :customer="selectedCustomerForComm"
    />
  </div>
</template>
