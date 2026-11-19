<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
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
  Truck,
  MapPin,
  MapPinned,
  Printer,
  Columns3,
  RotateCcw,
  MoveHorizontal,
} from "lucide-vue-next";
const { t, intl } = useT();
const { features } = useFeatures();

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
    tokenNumber?: number | null;
    tokenDate?: string | null;
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
const fieldLabel = (v?: string | null) => t(FIELD_STATUSES.find((f) => f.value === v)?.label ?? "Not assigned");
const mapsUrl = (item: AppointmentDetail) => {
  const l = item.appointment.location;
  return l ? `https://www.google.com/maps?q=${l.lat},${l.lng}` : "";
};
const whatsappUrl = (item: AppointmentDetail) => {
  const phone = (item.staff?.phone ?? "").replace(/\D/g, "");
  if (!phone) return "";
  const a = item.appointment;
  const lines = [
    t("Hello {name}, new job for you:", { name: item.staff?.name ?? "" }),
    ``,
    `${t("Customer")}: ${item.customer.firstName} ${item.customer.lastName === "Customer" ? "" : item.customer.lastName}`.trim(),
    `${t("Phone")}: ${item.customer.phone}`,
    `${t("Service")}: ${item.service.name}`,
    `${t("When")}: ${formatDate(a.startAt)} ${formatTime(a.startAt)}`,
    a.location ? `${t("Location")}: ${mapsUrl(item)}` : "",
    a.location?.note ? `${t("Landmark")}: ${a.location.note}` : "",
    a.notes ? `${t("Notes")}: ${a.notes}` : "",
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

  // Today / tomorrow / upcoming: queue order (earliest first).
  // All dates: newest first, so recent bookings are on top.
  const time = (a: AppointmentDetail) => new Date(a.appointment.startAt).getTime();
  list = [...list].sort((a, b) => (dateFilter.value === "ALL" ? time(b) - time(a) : time(a) - time(b)));

  return list;
});

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString(intl.value, { hour: "2-digit", minute: "2-digit", hour12: false });
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString(intl.value, { weekday: "short", month: "short", day: "numeric" });
};

const updateFieldStatus = async (id: string, fieldStatus: string) => {
  try {
    await $fetch(`/api/appointments/${id}`, { method: "PATCH", body: { fieldStatus } });
    await loadData();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? t(t("Status update failed.")));
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
    alert(err?.data?.statusMessage ?? t(t("Status update failed.")));
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
        formError.value = t("First name and phone number are required for new customer.");
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
    formError.value = err?.data?.statusMessage ?? t("Failed to create appointment.");
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
    formError.value = err?.data?.statusMessage ?? t("Failed to update appointment.");
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
    alert(err?.data?.statusMessage ?? t("Failed to assign staff."));
  } finally {
    isSubmitting.value = false;
  }
};

const openCommunication = (cust: any, apptId: string) => {
  selectedCustomerForComm.value = cust;
  showCommModal.value = true;
};

// ---- Design-system table helpers ----

const DATE_TABS = [
  { value: "ALL", label: "All" },
  { value: "TODAY", label: "Today" },
  { value: "TOMORROW", label: "Tomorrow" },
  { value: "UPCOMING", label: "Upcoming" },
];
const dateCounts = computed<Record<string, number>>(() => {
  const now = new Date();
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  const c = { ALL: 0, TODAY: 0, TOMORROW: 0, UPCOMING: 0 };
  for (const a of appointments.value) {
    const d = new Date(a.appointment.startAt);
    c.ALL++;
    if (key(d) === key(now)) c.TODAY++;
    if (key(d) === key(tom)) c.TOMORROW++;
    if (d >= now) c.UPCOMING++;
  }
  return c;
});

// Columns people can switch on/off (saved on this device)
type ColKey = "email" | "service" | "duration" | "price" | "staff" | "source" | "notes";
const OPTIONAL_COLUMNS: { key: ColKey; label: string; on: boolean }[] = [
  { key: "service", label: "Service", on: true },
  { key: "staff", label: "Staff", on: true },
  { key: "price", label: "Price", on: true },
  { key: "duration", label: "Duration", on: false },
  { key: "email", label: "Email", on: false },
  { key: "source", label: "Source", on: false },
  { key: "notes", label: "Notes", on: false },
];
const COLS_KEY = "appt_table_cols";
const defaultCols = () => Object.fromEntries(OPTIONAL_COLUMNS.map((c) => [c.key, c.on])) as Record<ColKey, boolean>;
const visibleCols = reactive<Record<ColKey, boolean>>(defaultCols());
const columnsOpen = ref(false);
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(COLS_KEY) ?? "null");
    if (saved && typeof saved === "object") {
      for (const c of OPTIONAL_COLUMNS) if (typeof saved[c.key] === "boolean") visibleCols[c.key] = saved[c.key];
    }
  } catch {}
});
const saveCols = () => {
  try {
    localStorage.setItem(COLS_KEY, JSON.stringify(visibleCols));
  } catch {}
  nextTick(measureTable);
};
const toggleCol = (k: ColKey) => {
  visibleCols[k] = !visibleCols[k];
  saveCols();
};
const resetCols = () => {
  Object.assign(visibleCols, defaultCols());
  saveCols();
};

// Shadows on the pinned first/last columns while scrolling sideways
const tableWrap = ref<HTMLElement | null>(null);
const pager = usePager(filteredAppointments, "appointments_page_size", tableWrap);
const scrolledX = ref(false);
const canScrollX = ref(false);
const measureTable = () => {
  const el = tableWrap.value;
  if (!el) return;
  const x = Math.abs(el.scrollLeft);
  scrolledX.value = x > 2;
  canScrollX.value = el.scrollWidth - el.clientWidth - x > 2;
};
const onTableScroll = () => measureTable();
let tableObserver: ResizeObserver | null = null;
watch(tableWrap, (el) => {
  tableObserver?.disconnect();
  if (el && typeof ResizeObserver !== "undefined") {
    tableObserver = new ResizeObserver(measureTable);
    tableObserver.observe(el);
    const tbl = el.querySelector("table");
    if (tbl) tableObserver.observe(tbl);
  }
  nextTick(measureTable);
});
onBeforeUnmount(() => tableObserver?.disconnect());

const customerName = (c: { firstName: string; lastName: string }) =>
  `${c.firstName} ${c.lastName === "Customer" ? "" : c.lastName}`.trim();
const initials = (c: { firstName: string; lastName: string }) =>
  ((c.firstName?.[0] ?? "") + (c.lastName && c.lastName !== "Customer" ? c.lastName[0] : "")).toUpperCase() || "?";
const statusPill = (s: string) =>
  ({
    CONFIRMED: "ds-pill--success",
    PENDING: "ds-pill--warning",
    CHECKED_IN: "ds-pill--info",
    RESCHEDULED: "ds-pill--info",
    COMPLETED: "ds-pill--neutral",
    CANCELLED: "ds-pill--danger",
    NO_SHOW: "ds-pill--danger",
  })[s] ?? "ds-pill--neutral";
const fieldOf = (item: AppointmentDetail) => item.appointment.fieldStatus ?? (item.staff ? "ASSIGNED" : null);
const fieldPill = (item: AppointmentDetail) =>
  ({ ASSIGNED: "ds-pill--info", ON_THE_WAY: "ds-pill--warning", ON_LOCATION: "ds-pill--success" })[fieldOf(item) ?? ""] ??
  "ds-pill--neutral";
const sourceLabel = (src: string) => (src === "ONLINE" ? t("Online") : src === "MANUAL" ? t("Manual") : src);

</script>

<template>
  <div class="space-y-5 pb-16">
    <!-- Header -->
    <div class="ds-page-head">
      <div class="min-w-0">
        <h1 class="ds-page-title">{{ t("Appointments") }}</h1>
        <p class="ds-page-sub">{{ t("Every booking in one place. Check people in, print tokens and reschedule.") }}</p>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <NuxtLink to="/dashboard/calendar" class="ui-btn ui-btn-secondary flex-1 sm:flex-none">
          <Calendar :size="16" />
          <span>{{ t("Calendar View") }}</span>
        </NuxtLink>
        <button type="button" class="ui-btn ui-btn-primary flex-1 sm:flex-none" @click="openCreateModal">
          <Plus :size="16" />
          <span>{{ t("New Booking") }}</span>
        </button>
      </div>
    </div>

    <div class="ds-card">
      <!-- Date tabs -->
      <div class="ds-tabs" role="tablist">
        <button
          v-for="tab in DATE_TABS"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="dateFilter === tab.value"
          :class="['ds-tab', dateFilter === tab.value ? 'is-active' : '']"
          @click="dateFilter = tab.value"
        >
          {{ t(tab.label) }}
          <span class="count">{{ dateCounts[tab.value] }}</span>
        </button>
      </div>

      <!-- Toolbar: search + filters + columns -->
      <div class="ds-toolbar">
        <div class="relative min-w-0 flex-1 md:max-w-xs">
          <Search :size="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            v-model="searchQuery"
            type="search"
            enterkeyhint="search"
            :placeholder="t('Search client, phone, service...')"
            class="w-full ps-9 pe-3"
          />
        </div>
        <div class="md:hidden">
          <button
            type="button"
            class="ui-btn ui-btn-secondary"
            :aria-expanded="filtersOpen"
            @click="filtersOpen = !filtersOpen"
          >
            <Filter :size="16" />
            <span>{{ t("Filters") }}</span>
            <span v-if="activeFilterCount" class="grid size-5 place-items-center rounded-full bg-rose-600 text-[11px] text-white">{{ activeFilterCount }}</span>
          </button>
        </div>
        <div :class="[filtersOpen ? 'grid' : 'hidden', 'w-full grid-cols-1 gap-2 md:flex md:w-auto md:items-center']">
          <AppSelect v-model="statusFilter" class="w-full md:w-44">
            <option value="ALL">{{ t("All Statuses") }}</option>
            <template v-if="onLocation">
              <option value="NONE">{{ t("Not assigned") }}</option>
              <option v-for="f in FIELD_STATUSES" :key="f.value" :value="f.value">{{ t(f.label) }}</option>
            </template>
            <template v-else>
              <option value="PENDING">{{ t("Pending") }}</option>
              <option value="CONFIRMED">{{ t("Confirmed") }}</option>
              <option value="CHECKED_IN">{{ t("Checked-in") }}</option>
              <option value="COMPLETED">{{ t("Completed") }}</option>
              <option value="CANCELLED">{{ t("Cancelled") }}</option>
              <option value="NO_SHOW">{{ t("No-Show") }}</option>
              <option value="RESCHEDULED">{{ t("Rescheduled") }}</option>
            </template>
          </AppSelect>
          <AppSelect v-model="staffFilter" class="w-full md:w-48">
            <option value="ALL">{{ t("All Staff Members") }}</option>
            <option value="unassigned">{{ t("Unassigned only") }}</option>
            <option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</option>
          </AppSelect>
          <button v-if="activeFilterCount" type="button" class="ui-btn ui-btn-ghost" @click="clearFilters">
            <X :size="16" />
            <span>{{ t("Clear filters") }}</span>
          </button>
        </div>

        <!-- Columns picker (table only) -->
        <div class="relative ms-auto hidden lg:block">
          <button
            type="button"
            class="ui-btn ui-btn-secondary"
            :aria-expanded="columnsOpen"
            @click.stop="columnsOpen = !columnsOpen"
          >
            <Columns3 :size="16" />
            <span>{{ t("Columns") }}</span>
          </button>
          <div v-if="columnsOpen" class="fixed inset-0 z-40" @click="columnsOpen = false"></div>
          <div v-if="columnsOpen" class="absolute end-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl">
            <div class="ds-menu-label">{{ t("Show columns") }}</div>
            <label
              v-for="c in OPTIONAL_COLUMNS"
              :key="c.key"
              class="ds-menu-item"
            >
              <input type="checkbox" class="size-4" :checked="visibleCols[c.key]" @change="toggleCol(c.key)" />
              <span>{{ t(c.label) }}</span>
            </label>
            <div class="ds-menu-sep"></div>
            <button type="button" class="ds-menu-item" @click="resetCols">
              <RotateCcw :size="16" />
              <span>{{ t("Reset columns") }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-2 p-4">
        <div v-for="i in 6" :key="i" class="h-12 animate-pulse rounded-lg bg-stone-100"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredAppointments.length === 0" class="px-4 py-16 text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-stone-100 text-stone-500">
          <CalendarCheck :size="22" />
        </span>
        <h3 class="mt-3 text-base font-semibold text-stone-900">{{ t("No appointments found") }}</h3>
        <p class="mx-auto mt-1 max-w-sm text-sm text-stone-500">
          {{ t("Try adjusting your search criteria or create a new appointment manually.") }}
        </p>
        <button type="button" class="ui-btn ui-btn-primary mt-4" @click="openCreateModal">
          <Plus :size="16" />
          <span>{{ t("Create Booking") }}</span>
        </button>
      </div>

      <template v-else>
        <!-- Desktop / laptop: data table -->
        <div
          ref="tableWrap"
          :class="['ds-table-wrap hidden lg:block', scrolledX ? 'is-scrolled-x' : '', canScrollX ? 'can-scroll-x' : '']"
          @scroll="onTableScroll"
        >
          <table class="ds-table">
            <thead>
              <tr>
                <th v-if="features.tokens" class="sticky-start w-[72px]">{{ t("Token") }}</th>
                <th :class="features.tokens ? '' : 'sticky-start'">{{ t("Date & time") }}</th>
                <th>{{ t("Customer") }}</th>
                <th v-if="visibleCols.email">{{ t("Email") }}</th>
                <th v-if="visibleCols.service">{{ t("Service") }}</th>
                <th v-if="visibleCols.duration">{{ t("Duration") }}</th>
                <th v-if="visibleCols.price" class="text-end">{{ t("Price") }}</th>
                <th v-if="visibleCols.staff">{{ onLocation ? t("Staff") : t("Staff Assigned") }}</th>
                <th>{{ t("Status") }}</th>
                <th v-if="visibleCols.source">{{ t("Source") }}</th>
                <th v-if="visibleCols.notes">{{ t("Notes") }}</th>
                <th class="sticky-end text-end">{{ t("Actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in pager.rows" :key="item.appointment.id">
                <td v-if="features.tokens" class="sticky-start">
                  <span v-if="item.appointment.tokenNumber" class="ds-token" :title="t('Token number')">
                    {{ formatToken(item.appointment.tokenNumber) }}
                  </span>
                  <span v-else class="text-stone-400">—</span>
                </td>
                <td class="num" :class="features.tokens ? '' : 'sticky-start'">
                  <div class="is-strong">{{ formatTime(item.appointment.startAt) }}</div>
                  <div class="text-xs text-stone-500">{{ formatDate(item.appointment.startAt) }}</div>
                </td>
                <td>
                  <div class="flex items-center gap-3">
                    <span class="ds-avatar">{{ initials(item.customer) }}</span>
                    <div class="min-w-0">
                      <div class="is-strong max-w-[14rem] truncate">{{ customerName(item.customer) }}</div>
                      <a :href="`tel:${item.customer.phone}`" class="num text-xs text-stone-500 hover:text-rose-700">
                        <bdi dir="ltr">{{ item.customer.phone }}</bdi>
                      </a>
                    </div>
                  </div>
                </td>
                <td v-if="visibleCols.email" class="max-w-[14rem] truncate">{{ item.customer.email || "—" }}</td>
                <td v-if="visibleCols.service">
                  <div class="flex max-w-[13rem] items-center gap-2">
                    <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: item.service.accent || '#94a3b8' }"></span>
                    <span class="truncate text-stone-800" :title="item.service.name">{{ item.service.name }}</span>
                  </div>
                </td>
                <td v-if="visibleCols.duration" class="num">{{ t("{n} min", { n: item.service.durationMinutes }) }}</td>
                <td v-if="visibleCols.price" class="num text-end text-stone-800">{{ formatMoney(item.service.priceCents, item.service.currency) }}</td>
                <td v-if="visibleCols.staff">
                  <span v-if="item.staff" class="text-stone-800">{{ item.staff.name }}</span>
                  <button
                    v-else
                    type="button"
                    class="ui-btn ui-btn-sm ui-btn-secondary !border-amber-300 !bg-amber-50 !text-amber-800"
                    @click="openAssignModal(item)"
                  >
                    <AlertCircle :size="14" />
                    <span>{{ t("Assign Staff") }}</span>
                  </button>
                </td>
                <td>
                  <span v-if="onLocation" :class="['ds-pill', fieldPill(item)]">{{ fieldLabel(fieldOf(item)) }}</span>
                  <span v-else :class="['ds-pill', statusPill(item.appointment.status)]">{{ t(statusText(item.appointment.status)) }}</span>
                </td>
                <td v-if="visibleCols.source">
                  <span class="ds-tag">{{ sourceLabel(item.appointment.source) }}</span>
                </td>
                <td v-if="visibleCols.notes" class="max-w-[16rem] truncate" :title="item.appointment.notes ?? ''">{{ item.appointment.notes || "—" }}</td>
                <td class="sticky-end">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- one "next step" button -->
                    <template v-if="onLocation">
                      <button
                        v-if="item.staff && (!item.appointment.fieldStatus || item.appointment.fieldStatus === 'ASSIGNED')"
                        type="button"
                        class="ui-btn ui-btn-sm ui-btn-soft"
                        @click="updateFieldStatus(item.appointment.id, 'ON_THE_WAY')"
                      >
                        <Truck :size="14" /> {{ t("On the way") }}
                      </button>
                      <button
                        v-else-if="item.staff && item.appointment.fieldStatus === 'ON_THE_WAY'"
                        type="button"
                        class="ui-btn ui-btn-sm ui-btn-soft"
                        @click="updateFieldStatus(item.appointment.id, 'ON_LOCATION')"
                      >
                        <MapPinned :size="14" /> {{ t("On location") }}
                      </button>
                    </template>
                    <template v-else>
                      <button
                        v-if="item.appointment.status === 'CONFIRMED'"
                        type="button"
                        class="ui-btn ui-btn-sm ui-btn-soft"
                        @click="updateStatus(item.appointment.id, 'CHECKED_IN')"
                      >
                        <UserCheck :size="14" /> {{ t("Check-in") }}
                      </button>
                      <button
                        v-else-if="item.appointment.status === 'CHECKED_IN'"
                        type="button"
                        class="ui-btn ui-btn-sm ui-btn-soft"
                        @click="updateStatus(item.appointment.id, 'COMPLETED')"
                      >
                        <CheckCircle2 :size="14" /> {{ t("Done") }}
                      </button>
                    </template>
                    <button
                      v-if="features.tokens && item.appointment.tokenNumber"
                      type="button"
                      class="ui-btn ui-btn-sm ui-btn-secondary ui-btn-icon"
                      :title="t('Print token')"
                      :aria-label="t('Print token')"
                      @click="printToken(item.appointment.id)"
                    >
                      <Printer :size="15" />
                    </button>
                    <RowActionMenu :label="t('More actions')">
                      <button type="button" class="ds-menu-item" role="menuitem" @click="openEditModal(item)">
                        <Edit2 :size="16" /> {{ t("Edit / Reschedule") }}
                      </button>
                      <button type="button" class="ds-menu-item" role="menuitem" @click="openCommunication(item.customer, item.appointment.id)">
                        <MessageSquare :size="16" /> {{ t("Message Client") }}
                      </button>
                      <button type="button" class="ds-menu-item" role="menuitem" @click="openAssignModal(item)">
                        <UserPlus :size="16" /> {{ item.staff ? t("Change staff") : t("Assign Staff") }}
                      </button>
                      <a
                        v-if="onLocation && item.staff && whatsappUrl(item)"
                        :href="whatsappUrl(item)"
                        :target="waTarget"
                        rel="noopener"
                        class="ds-menu-item"
                        role="menuitem"
                      >
                        <WhatsAppIcon :size="16" /> {{ t("WhatsApp staff") }}
                      </a>
                      <a v-if="onLocation && mapsUrl(item)" :href="mapsUrl(item)" target="_blank" rel="noopener" class="ds-menu-item" role="menuitem">
                        <MapPin :size="16" /> {{ t("Open map") }}
                      </a>
                      <template v-if="!onLocation && item.appointment.status !== 'CANCELLED' && item.appointment.status !== 'COMPLETED'">
                        <button
                          v-if="item.appointment.status !== 'NO_SHOW'"
                          type="button"
                          class="ds-menu-item"
                          role="menuitem"
                          @click="updateStatus(item.appointment.id, 'NO_SHOW')"
                        >
                          <AlertCircle :size="16" /> {{ t("Mark as no-show") }}
                        </button>
                      </template>
                      <template v-if="item.appointment.status !== 'CANCELLED' && item.appointment.status !== 'COMPLETED'">
                        <div class="ds-menu-sep"></div>
                        <button
                          type="button"
                          class="ds-menu-item ds-menu-item--danger"
                          role="menuitem"
                          @click="updateStatus(item.appointment.id, 'CANCELLED')"
                        >
                          <XCircle :size="16" /> {{ t("Cancel Appointment") }}
                        </button>
                      </template>
                    </RowActionMenu>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="canScrollX" class="hidden items-center justify-end gap-1 border-t border-stone-200 px-4 py-2.5 text-xs text-stone-500 lg:flex">
          <MoveHorizontal :size="14" /> {{ t("Scroll sideways to see more columns") }}
        </div>

        <!-- Phones / tablets: booking cards -->
        <div class="grid gap-3 p-3 sm:grid-cols-2 lg:hidden">
          <p class="px-1 text-xs font-semibold text-stone-500 sm:col-span-2">
            {{ filteredAppointments.length === 1 ? t("1 booking") : t("{n} bookings", { n: filteredAppointments.length }) }}
          </p>
          <article
            v-for="item in pager.rows"
            :key="item.appointment.id"
            role="button"
            tabindex="0"
            class="cursor-pointer rounded-xl border border-stone-200 bg-white p-4 transition active:bg-stone-50"
            @click="openEditModal(item)"
            @keydown.enter.self="openEditModal(item)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <span v-if="features.tokens && item.appointment.tokenNumber" class="ds-token !h-10 !min-w-12 !text-lg">{{ formatToken(item.appointment.tokenNumber) }}</span>
                <div class="min-w-0">
                  <div class="text-sm font-semibold tabular-nums text-stone-900">
                    {{ formatTime(item.appointment.startAt) }} · {{ formatDate(item.appointment.startAt) }}
                  </div>
                  <div class="text-xs text-stone-500">{{ t("{n} min", { n: item.service.durationMinutes }) }}</div>
                </div>
              </div>
              <span v-if="onLocation" :class="['ds-pill shrink-0', fieldPill(item)]">{{ fieldLabel(fieldOf(item)) }}</span>
              <span v-else :class="['ds-pill shrink-0', statusPill(item.appointment.status)]">{{ t(statusText(item.appointment.status)) }}</span>
            </div>

            <div class="mt-3 flex items-center gap-3">
              <span class="ds-avatar">{{ initials(item.customer) }}</span>
              <div class="min-w-0">
                <div class="truncate text-base font-semibold text-stone-900">{{ customerName(item.customer) }}</div>
                <a
                  v-if="item.customer.phone"
                  :href="`tel:${item.customer.phone}`"
                  class="inline-flex min-h-8 items-center gap-1.5 text-sm font-medium text-rose-700"
                  @click.stop
                >
                  <Phone :size="14" />
                  <bdi dir="ltr">{{ item.customer.phone }}</bdi>
                </a>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2 text-sm">
              <span class="flex min-w-0 items-center gap-2">
                <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: item.service.accent || '#94a3b8' }"></span>
                <span class="truncate text-stone-800">{{ item.service.name }}</span>
              </span>
              <span class="shrink-0 font-semibold tabular-nums text-stone-900">{{ formatMoney(item.service.priceCents, item.service.currency) }}</span>
            </div>

            <div class="mt-2 flex items-center justify-between gap-2 text-sm">
              <span v-if="item.staff" class="inline-flex items-center gap-1.5 text-stone-700">
                <UserCheck :size="15" class="text-stone-400" />
                {{ item.staff.name }}
              </span>
              <button
                v-else
                type="button"
                class="ui-btn ui-btn-secondary !border-amber-300 !bg-amber-50 !text-amber-800"
                @click.stop="openAssignModal(item)"
              >
                <AlertCircle :size="15" />
                <span>{{ t("Assign staff") }}</span>
              </button>
              <span class="ds-tag">{{ sourceLabel(item.appointment.source) }}</span>
            </div>

            <!-- Actions -->
            <div class="mt-3 flex gap-2 border-t border-stone-100 pt-3" @click.stop>
              <template v-if="onLocation">
                <button
                  v-if="item.staff && item.appointment.fieldStatus !== 'ON_THE_WAY' && item.appointment.fieldStatus !== 'ON_LOCATION'"
                  type="button"
                  class="ui-btn ui-btn-soft flex-1"
                  @click="updateFieldStatus(item.appointment.id, 'ON_THE_WAY')"
                >
                  <Truck :size="16" /> {{ t("On the way") }}
                </button>
                <button
                  v-else-if="item.staff && item.appointment.fieldStatus === 'ON_THE_WAY'"
                  type="button"
                  class="ui-btn ui-btn-soft flex-1"
                  @click="updateFieldStatus(item.appointment.id, 'ON_LOCATION')"
                >
                  <MapPinned :size="16" /> {{ t("On location") }}
                </button>
              </template>
              <template v-else>
                <button
                  v-if="item.appointment.status === 'CONFIRMED'"
                  type="button"
                  class="ui-btn ui-btn-soft flex-1"
                  @click="updateStatus(item.appointment.id, 'CHECKED_IN')"
                >
                  <UserCheck :size="16" /> {{ t("Check-in") }}
                </button>
                <button
                  v-else-if="item.appointment.status === 'CHECKED_IN'"
                  type="button"
                  class="ui-btn ui-btn-soft flex-1"
                  @click="updateStatus(item.appointment.id, 'COMPLETED')"
                >
                  <CheckCircle2 :size="16" /> {{ t("Done") }}
                </button>
              </template>
              <button type="button" class="ui-btn ui-btn-secondary flex-1" @click="openEditModal(item)">
                <Edit2 :size="15" /> {{ t("Edit") }}
              </button>
              <button
                v-if="features.tokens && item.appointment.tokenNumber"
                type="button"
                class="ui-btn ui-btn-secondary ui-btn-icon"
                :aria-label="t('Print token')"
                @click="printToken(item.appointment.id)"
              >
                <Printer :size="17" />
              </button>
              <RowActionMenu :label="t('More actions')" size="md">
                <button type="button" class="ds-menu-item" @click="openCommunication(item.customer, item.appointment.id)">
                  <MessageSquare :size="16" /> {{ t("Message Client") }}
                </button>
                <a
                  v-if="onLocation && item.staff && whatsappUrl(item)"
                  :href="whatsappUrl(item)"
                  :target="waTarget"
                  rel="noopener"
                  class="ds-menu-item"
                >
                  <WhatsAppIcon :size="16" /> {{ t("WhatsApp staff") }}
                </a>
                <a v-if="onLocation && mapsUrl(item)" :href="mapsUrl(item)" target="_blank" rel="noopener" class="ds-menu-item">
                  <MapPin :size="16" /> {{ t("Open map") }}
                </a>
                <button
                  v-if="!onLocation && item.appointment.status !== 'CANCELLED' && item.appointment.status !== 'COMPLETED' && item.appointment.status !== 'NO_SHOW'"
                  type="button"
                  class="ds-menu-item"
                  @click="updateStatus(item.appointment.id, 'NO_SHOW')"
                >
                  <AlertCircle :size="16" /> {{ t("Mark as no-show") }}
                </button>
                <template v-if="item.appointment.status !== 'CANCELLED' && item.appointment.status !== 'COMPLETED'">
                  <div class="ds-menu-sep"></div>
                  <button type="button" class="ds-menu-item ds-menu-item--danger" @click="updateStatus(item.appointment.id, 'CANCELLED')">
                    <XCircle :size="16" /> {{ t("Cancel Appointment") }}
                  </button>
                </template>
              </RowActionMenu>
            </div>
          </article>
        </div>
        <TablePager :pager="pager" />
      </template>
    </div>

    <!-- Create Appointment Modal -->
    <div
      v-if="showCreateModal"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div class="m-sheet-panel w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5 my-8">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 class="font-display text-xl font-bold text-stone-900">{{ t("New Appointment") }}</h3>
            <p class="text-xs text-stone-500">{{ t("Book an appointment manually into your schedule.") }}</p>
          </div>
          <button type="button" @click="showCreateModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleCreateAppointment" class="space-y-4">
          <!-- Customer Selection Mode -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold uppercase tracking-wider text-stone-600">{{ t("Client Information") }}</label>
              <button
                type="button"
                @click="createForm.isNewCustomer = !createForm.isNewCustomer"
                class="text-xs font-semibold text-rose-600 hover:underline"
              >
                {{ createForm.isNewCustomer ? t("Select existing client") : t("+ Add new client") }}
              </button>
            </div>

            <!-- Existing Customer Select -->
            <AppSelect
              v-if="!createForm.isNewCustomer"
              v-model="createForm.customerId"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option v-for="c in customers" :key="c.id" :value="c.id">
                {{ c.firstName }} {{ c.lastName }} ({{ c.phone }})
              </option>
            </AppSelect>

            <!-- New Customer Fields -->
            <div v-else class="grid gap-2.5 rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5">
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="createForm.newCustomerFirstName"
                  type="text"
                  :placeholder="t('First name')"
                  required
                  class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                />
                <input
                  v-model="createForm.newCustomerLastName"
                  type="text"
                  :placeholder="t('Last name')"
                  class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="createForm.newCustomerPhone"
                  type="tel"
                  :placeholder="t('Phone number')"
                  required
                  class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                />
                <input
                  v-model="createForm.newCustomerEmail"
                  type="email"
                  :placeholder="t('Email (optional)')"
                  class="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-stone-900"
                />
              </div>
            </div>
          </div>

          <!-- Service Selection -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Service") }}</label>
            <AppSelect
              v-model="createForm.serviceId"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option v-for="s in services" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.durationMinutes }}m) — {{ formatMoney(s.priceCents, s.currency) }}
              </option>
            </AppSelect>
          </div>

          <!-- Staff Assignment -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              {{ t("Assign Staff Member (Optional)") }}
            </label>
            <AppSelect
              v-model="createForm.staffId"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option value="">{{ t("Leave Unassigned (Assign later)") }}</option>
              <option v-for="member in staffList" :key="member.id" :value="member.id">
                {{ member.name }} ({{ member.role }})
              </option>
            </AppSelect>
          </div>

          <!-- Date & Time -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Date") }}</label>
              <input
                v-model="createForm.date"
                type="date"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Time") }}</label>
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
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Notes (Optional)") }}</label>
            <textarea
              v-model="createForm.notes"
              rows="2"
              :placeholder="t('Special instructions or requests...')"
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
              class="ui-btn ui-btn-secondary rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {{ t("Cancel") }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="ui-btn ui-btn-primary rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? t("Creating...") : t("Save Appointment") }}
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
            <h3 class="font-display text-xl font-bold text-stone-900">{{ t("Edit / Reschedule") }}</h3>
            <p class="text-xs text-stone-500">
              {{ t("Editing booking for {name}.", { name: `${activeAppointment.customer.firstName} ${activeAppointment.customer.lastName}` }) }}
            </p>
          </div>
          <button type="button" @click="showEditModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleEditAppointment" class="space-y-4">
          <!-- Service Selection -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Service") }}</label>
            <AppSelect
              v-model="editForm.serviceId"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option v-for="s in services" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.durationMinutes }}m) — {{ formatMoney(s.priceCents, s.currency) }}
              </option>
            </AppSelect>
          </div>

          <!-- Staff Selection -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Assigned Staff") }}</label>
            <AppSelect
              v-model="editForm.staffId"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option value="">{{ t("Unassigned") }}</option>
              <option v-for="member in staffList" :key="member.id" :value="member.id">
                {{ member.name }} ({{ member.role }})
              </option>
            </AppSelect>
          </div>

          <!-- Date & Time (Reschedule) -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Date") }}</label>
              <input
                v-model="editForm.date"
                type="date"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Time") }}</label>
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
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Status") }}</label>
            <AppSelect
              v-model="editForm.fieldStatus"
              :disabled="!editForm.staffId"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white disabled:opacity-60"
            >
              <option v-for="f in FIELD_STATUSES" :key="f.value" :value="f.value">{{ t(f.label) }}</option>
            </AppSelect>
            <p v-if="!editForm.staffId" class="mt-1 text-[11px] text-amber-700">{{ t("Assign a staff member first.") }}</p>
            <a
              v-if="activeAppointment?.appointment.location"
              :href="mapsUrl(activeAppointment)"
              target="_blank"
              rel="noopener"
              class="mt-2 inline-block text-xs font-bold text-rose-600 underline"
            >
              {{ t("Open customer location in Google Maps") }}
            </a>
          </div>
          <div v-else>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Status") }}</label>
            <AppSelect
              v-model="editForm.status"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
            >
              <option value="PENDING">{{ t("Pending") }}</option>
              <option value="CONFIRMED">{{ t("Confirmed") }}</option>
              <option value="CHECKED_IN">{{ t("Checked-in") }}</option>
              <option value="COMPLETED">{{ t("Completed") }}</option>
              <option value="CANCELLED">{{ t("Cancelled") }}</option>
              <option value="NO_SHOW">{{ t("No-Show") }}</option>
              <option value="RESCHEDULED">{{ t("Rescheduled") }}</option>
            </AppSelect>
          </div>

          <!-- On-location: change / set the customer location -->
          <LocationInput v-if="onLocation" v-model="editForm.location" />

          <!-- Notes -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Notes") }}</label>
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
              class="ui-btn ui-btn-secondary rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {{ t("Cancel") }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="ui-btn ui-btn-primary rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? t("Saving...") : t("Update Appointment") }}
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
        <h3 class="font-display text-xl font-bold text-stone-900">{{ t("Assign Staff Member") }}</h3>
        <p class="text-xs text-stone-500">
          {{ t("Assigning a team member to {name} for {service}.", { name: `${activeAppointment.customer.firstName} ${activeAppointment.customer.lastName}`, service: activeAppointment.service.name }) }}
        </p>

        <div class="space-y-3">
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600">{{ t("Active Staff Members") }}</label>
          <AppSelect
            v-model="assignStaffId"
            class="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-medium text-stone-900 outline-none focus:border-stone-900 focus:bg-white"
          >
            <option v-for="member in staffList" :key="member.id" :value="member.id">
              {{ member.name }} ({{ member.role }})
            </option>
          </AppSelect>
        </div>

        <div class="m-sheet-actions flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            @click="showAssignModal = false"
            class="ui-btn ui-btn-secondary rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            {{ t("Cancel") }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="handleAssignStaff"
            class="ui-btn ui-btn-primary rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {{ isSubmitting ? t("Saving...") : t("Confirm") }}
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
