<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  UserCheck,
  Plus,
  Edit2,
  Sparkles,
  Calendar,
  Phone,
  Mail,
  Check,
  X,
  Clock,
  ShieldCheck,
  UserX,
  AlertCircle,
  Upload,
  Search,
  CalendarCheck,
} from "lucide-vue-next";
const { t, intl } = useT();
const { features } = useFeatures();

const showImport = ref(false);

definePageMeta({
  layout: "dashboard",
});

interface StaffMember {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  active: boolean;
  serviceIds: string[];
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

interface StaffAppointment {
  appointment: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  service: {
    name: string;
    durationMinutes: number;
  };
}

const staffList = ref<StaffMember[]>([]);
const services = ref<ServiceItem[]>([]);
const isLoading = ref(true);

// Modals
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showServicesModal = ref(false);
const showScheduleModal = ref(false);

const selectedStaff = ref<StaffMember | null>(null);
const staffSchedule = ref<StaffAppointment[]>([]);
const isScheduleLoading = ref(false);

const isSubmitting = ref(false);
const formError = ref("");

const staffForm = reactive({
  name: "",
  email: "",
  phone: "",
  role: "Stylist",
  active: true,
  serviceIds: [] as string[],
});

// Options for the services multi-select (name + duration)
const serviceOptions = computed(() =>
  services.value.map((s: any) => ({ value: s.id, label: s.name, hint: `${s.durationMinutes}m` })),
);

// On-location mode: staff must have a WhatsApp number (with country code)
const onLocation = ref(false);
const phoneProblem = () => {
  if (!onLocation.value) return "";
  const p = staffForm.phone.replace(/[\s\-().]/g, "");
  return /^\+[1-9]\d{6,14}$/.test(p)
    ? ""
    : t("WhatsApp phone number with country code is required (example: +923001234567).");
};

// Today's duty hours (from the weekly staff schedule, 0 = Sunday)
interface ScheduleRow {
  staffId: string;
  dayOfWeek: number;
  isOff: boolean;
  startTime: string;
  endTime: string;
}
const schedules = ref<ScheduleRow[]>([]);
const todayDuty = (staffId: string) => {
  const today = new Date().getDay();
  const row = schedules.value.find(
    (r) => r.staffId === staffId && r.dayOfWeek === today,
  );
  if (!row) return "";
  return row.isOff ? t("Off today") : t("Today {from}–{to}", { from: row.startTime, to: row.endTime });
};

// Call / WhatsApp straight from the staff card
const telHref = (phone?: string | null) =>
  phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";
const waHref = (phone?: string | null) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
};
const waTarget = useExternalLinkTarget();

const loadData = async () => {
  isLoading.value = true;
  try {
    try {
      const org = await $fetch<{ onLocationEnabled?: boolean }>("/api/organization");
      onLocation.value = org.onLocationEnabled === true;
    } catch {}
    const [staffData, serviceData, scheduleData, apptData] = await Promise.all([
      $fetch<StaffMember[]>("/api/staff"),
      $fetch<ServiceItem[]>("/api/services"),
      $fetch<ScheduleRow[]>("/api/staff-schedules").catch(() => [] as ScheduleRow[]),
      $fetch<any[]>("/api/appointments").catch(() => [] as any[]),
    ]);
    todayBookings.value = countToday(apptData);
    staffList.value = staffData;
    services.value = serviceData;
    schedules.value = scheduleData;
  } catch (err: any) {
    console.error("Failed to load staff data", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadData();
});

const openCreate = () => {
  staffForm.name = "";
  staffForm.email = "";
  staffForm.phone = "";
  staffForm.role = "Senior Specialist";
  staffForm.active = true;
  staffForm.serviceIds = services.value.filter((s) => s.active).map((s) => s.id);
  formError.value = "";
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (!staffForm.name.trim() || !staffForm.role.trim()) {
    formError.value = t("Name and role are required.");
    return;
  }
  if (phoneProblem()) {
    formError.value = phoneProblem();
    return;
  }
  isSubmitting.value = true;
  formError.value = "";
  try {
    await $fetch("/api/staff", {
      method: "POST",
      body: {
        name: staffForm.name.trim(),
        email: staffForm.email.trim() || undefined,
        phone: staffForm.phone.trim() || undefined,
        role: staffForm.role.trim(),
        active: staffForm.active,
        serviceIds: staffForm.serviceIds,
      },
    });
    showCreateModal.value = false;
    await loadData();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? t(t("Failed to create staff member."));
  } finally {
    isSubmitting.value = false;
  }
};

const openEdit = (member: StaffMember) => {
  selectedStaff.value = member;
  staffForm.name = member.name;
  staffForm.email = member.email ?? "";
  staffForm.phone = member.phone ?? "";
  staffForm.role = member.role;
  staffForm.active = member.active;
  staffForm.serviceIds = [...member.serviceIds];
  formError.value = "";
  showEditModal.value = true;
};

const handleEdit = async () => {
  if (!selectedStaff.value) return;
  if (phoneProblem()) {
    formError.value = phoneProblem();
    return;
  }
  isSubmitting.value = true;
  formError.value = "";
  try {
    await $fetch(`/api/staff/${selectedStaff.value.id}`, {
      method: "PATCH",
      body: {
        name: staffForm.name.trim(),
        email: staffForm.email.trim() || undefined,
        phone: staffForm.phone.trim() || undefined,
        role: staffForm.role.trim(),
        active: staffForm.active,
        serviceIds: staffForm.serviceIds,
      },
    });
    showEditModal.value = false;
    await loadData();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? t(t("Failed to update staff member."));
  } finally {
    isSubmitting.value = false;
  }
};

const toggleActive = async (member: StaffMember) => {
  try {
    await $fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      body: { active: !member.active },
    });
    await loadData();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? t(t("Failed to toggle status.")));
  }
};

const openServicesAssign = (member: StaffMember) => {
  selectedStaff.value = member;
  staffForm.serviceIds = [...member.serviceIds];
  showServicesModal.value = true;
};

const handleSaveServices = async () => {
  if (!selectedStaff.value) return;
  isSubmitting.value = true;
  try {
    await $fetch(`/api/staff/${selectedStaff.value.id}`, {
      method: "PATCH",
      body: { serviceIds: staffForm.serviceIds },
    });
    showServicesModal.value = false;
    await loadData();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? t("Failed to save assigned services."));
  } finally {
    isSubmitting.value = false;
  }
};

const openSchedule = async (member: StaffMember) => {
  selectedStaff.value = member;
  showScheduleModal.value = true;
  isScheduleLoading.value = true;
  try {
    staffSchedule.value = await $fetch<StaffAppointment[]>(
      `/api/staff/${member.id}/appointments`,
    );
  } catch (err: any) {
    console.error("Failed to load schedule", err);
  } finally {
    isScheduleLoading.value = false;
  }
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString(intl.value, { hour: "2-digit", minute: "2-digit", hour12: false });
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString(intl.value, { weekday: "short", month: "short", day: "numeric" });
};
// Design-system table: tabs, search, optional columns
const STAFF_TABS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const;
const staffTab = ref<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
const staffSearch = ref("");
const staffCounts = computed(() => ({
  ALL: staffList.value.length,
  ACTIVE: staffList.value.filter((m) => m.active).length,
  INACTIVE: staffList.value.filter((m) => !m.active).length,
}));
const filteredStaff = computed(() => {
  const q = staffSearch.value.trim().toLowerCase();
  return staffList.value.filter(
    (m) =>
      (staffTab.value === "ALL" || (staffTab.value === "ACTIVE") === m.active) &&
      (!q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || (m.phone ?? "").includes(q)),
  );
});
// Today's bookings per staff member (cancelled / no-show not counted)
const todayBookings = ref<Record<string, number>>({});
const countToday = (rows: any[]) => {
  const now = new Date();
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const out: Record<string, number> = {};
  for (const r of rows ?? []) {
    const a = r?.appointment;
    if (!a?.staffId || ["CANCELLED", "NO_SHOW"].includes(a.status)) continue;
    if (key(new Date(a.startAt)) !== key(now)) continue;
    out[a.staffId] = (out[a.staffId] ?? 0) + 1;
  }
  return out;
};
const serviceNames = (m: StaffMember) =>
  (m.serviceIds ?? []).map((id) => services.value.find((s) => s.id === id)?.name).filter(Boolean) as string[];
const table = useDataTable("staff_table_cols", [
  { key: "today", label: "Today", on: true },
  { key: "services", label: "Services", on: true },
  { key: "email", label: "Email", on: false },
]);
</script>

<template>
  <div class="space-y-5 pb-16">
    <!-- Header -->
    <div class="ds-page-head">
      <div class="min-w-0">
        <h1 class="ds-page-title">{{ t("Staff") }}</h1>
        <p class="ds-page-sub">{{ t("Your team, what they do and when they work. Switch someone off to stop new bookings for them.") }}</p>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <button v-if="features.import" type="button" class="ui-btn ui-btn-secondary flex-1 sm:flex-none" @click="showImport = true">
          <Upload :size="16" />
          <span>{{ t("Import Excel") }}</span>
        </button>
        <button type="button" class="ui-btn ui-btn-primary flex-1 sm:flex-none" @click="openCreate">
          <Plus :size="16" />
          <span>{{ t("Add Staff Member") }}</span>
        </button>
      </div>
    </div>

    <div class="ds-card">
      <!-- Tabs -->
      <div class="ds-tabs" role="tablist">
        <button
          v-for="tab in STAFF_TABS"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="staffTab === tab.value"
          :class="['ds-tab', staffTab === tab.value ? 'is-active' : '']"
          @click="staffTab = tab.value"
        >
          {{ t(tab.label) }}
          <span class="count">{{ staffCounts[tab.value] }}</span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="ds-toolbar">
        <div class="relative min-w-0 flex-1 md:max-w-sm">
          <Search :size="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input v-model="staffSearch" type="search" enterkeyhint="search" :placeholder="t('Search by name, role, phone...')" class="w-full ps-9 pe-3" />
        </div>
        <div class="ms-auto hidden lg:block">
          <ColumnPicker :columns="table.columns" :visible="table.visible" @toggle="table.toggle" @reset="table.reset" />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-2 p-4">
        <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-stone-100"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="staffList.length === 0" class="px-4 py-16 text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-stone-100 text-stone-500">
          <UserCheck :size="22" />
        </span>
        <h3 class="mt-3 text-base font-semibold text-stone-900">{{ t("No team members added yet") }}</h3>
        <p class="mx-auto mt-1 max-w-sm text-sm text-stone-500">
          {{ t("Add your staff specialists to assign incoming appointments and manage individual schedules.") }}
        </p>
        <button type="button" class="ui-btn ui-btn-primary mt-4" @click="openCreate">
          <Plus :size="16" />
          <span>{{ t("Add First Staff Member") }}</span>
        </button>
      </div>

      <div v-else-if="filteredStaff.length === 0" class="px-4 py-12 text-center text-sm text-stone-500">
        {{ t("No staff match this search.") }}
      </div>

      <template v-else>
        <!-- Desktop: data table -->
        <div
          :ref="(el) => (table.wrap.value = el as HTMLElement | null)"
          :class="['ds-table-wrap hidden lg:block', table.scrolledX.value ? 'is-scrolled-x' : '', table.canScrollX.value ? 'can-scroll-x' : '']"
          @scroll="table.onScroll"
        >
          <table class="ds-table">
            <thead>
              <tr>
                <th class="sticky-start">{{ t("Staff member") }}</th>
                <th>{{ t("Phone") }}</th>
                <th v-if="table.visible.email">{{ t("Email") }}</th>
                <th v-if="table.visible.today">{{ t("Today") }}</th>
                <th v-if="table.visible.services">{{ t("Services") }}</th>
                <th>{{ t("Available") }}</th>
                <th class="sticky-end text-end">{{ t("Actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in filteredStaff" :key="member.id" :class="member.active ? '' : 'opacity-60'">
                <td class="sticky-start">
                  <div class="flex items-center gap-3">
                    <span class="ds-avatar">{{ initialsOf(member.name.split(' ')[0], member.name.split(' ')[1]) }}</span>
                    <div class="min-w-0">
                      <div class="is-strong max-w-[14rem] truncate">{{ member.name }}</div>
                      <div class="text-xs text-stone-500">{{ member.role }}</div>
                    </div>
                  </div>
                </td>
                <td class="num">
                  <a v-if="member.phone" :href="telHref(member.phone)" class="text-stone-800 hover:text-rose-700"><bdi dir="ltr">{{ member.phone }}</bdi></a>
                  <span v-else class="text-stone-400">—</span>
                </td>
                <td v-if="table.visible.email" class="max-w-[16rem] truncate">{{ member.email || "—" }}</td>
                <td v-if="table.visible.today">
                  <NuxtLink
                    :to="`/dashboard/appointments?range=today&staffId=${member.id}`"
                    class="font-semibold hover:text-rose-700"
                    :class="todayBookings[member.id] ? 'text-stone-900' : 'text-stone-400'"
                  >
                    {{ todayBookings[member.id] === 1 ? t("1 booking") : t("{n} bookings", { n: todayBookings[member.id] ?? 0 }) }}
                  </NuxtLink>
                  <div v-if="todayDuty(member.id)" class="text-xs text-stone-500">{{ todayDuty(member.id) }}</div>
                </td>
                <td v-if="table.visible.services">
                  <button
                    type="button"
                    class="flex max-w-[16rem] flex-wrap items-center gap-1 text-start"
                    :title="serviceNames(member).join(', ')"
                    @click="openServicesAssign(member)"
                  >
                    <template v-if="serviceNames(member).length">
                      <span v-for="n in serviceNames(member).slice(0, 2)" :key="n" class="ds-tag max-w-[7rem] truncate">{{ n }}</span>
                      <span v-if="serviceNames(member).length > 2" class="ds-tag">+{{ serviceNames(member).length - 2 }}</span>
                    </template>
                    <span v-else class="text-xs font-semibold text-amber-700 hover:underline">{{ t("Assign Services") }}</span>
                  </button>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <AppSwitch :model-value="member.active" :label="t('Active (available for bookings)')" @update:model-value="toggleActive(member)" />
                    <span class="text-xs" :class="member.active ? 'text-emerald-700' : 'text-stone-500'">{{ member.active ? t("Active") : t("Inactive") }}</span>
                  </div>
                </td>
                <td class="sticky-end">
                  <div class="flex items-center justify-end gap-1.5">
                    <a
                      v-if="member.phone"
                      :href="waHref(member.phone)"
                      :target="waTarget"
                      rel="noopener"
                      class="ui-btn ui-btn-sm ui-btn-secondary"
                      :title="t('WhatsApp')"
                    >
                      <WhatsAppIcon :size="16" /> {{ t("WhatsApp") }}
                    </a>
                    <a
                      v-if="member.phone"
                      :href="telHref(member.phone)"
                      class="ui-btn ui-btn-sm ui-btn-secondary ui-btn-icon"
                      :title="t('Call')"
                      :aria-label="t('Call')"
                    >
                      <Phone :size="14" />
                    </a>
                    <button type="button" class="ui-btn ui-btn-sm ui-btn-soft" @click="openSchedule(member)">
                      <Calendar :size="14" /> {{ t("Schedule") }}
                    </button>
                    <RowActionMenu :label="t('More actions')">
                      <button type="button" class="ds-menu-item" role="menuitem" @click="openEdit(member)">
                        <Edit2 :size="16" /> {{ t("Edit Staff") }}
                      </button>
                      <button type="button" class="ds-menu-item" role="menuitem" @click="openServicesAssign(member)">
                        <Sparkles :size="16" /> {{ t("Assign Services") }}
                      </button>
                    </RowActionMenu>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Phones / tablets: cards -->
        <div class="grid gap-3 p-3 sm:grid-cols-2 lg:hidden">
          <article
            v-for="member in filteredStaff"
            :key="member.id"
            :class="['rounded-xl border border-stone-200 bg-white p-4', member.active ? '' : 'bg-stone-50']"
          >
            <div class="flex items-center gap-3">
              <span class="ds-avatar !size-11 !text-sm">{{ initialsOf(member.name.split(' ')[0], member.name.split(' ')[1]) }}</span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-base font-semibold text-stone-900">{{ member.name }}</div>
                <div class="text-[13px] text-stone-500">{{ member.role }}</div>
              </div>
              <AppSwitch :model-value="member.active" :label="t('Active (available for bookings)')" @update:model-value="toggleActive(member)" />
            </div>
            <div class="mt-3 grid gap-1.5 text-[13px] text-stone-600">
              <div class="flex items-center gap-2">
                <CalendarCheck :size="14" class="text-stone-400" />
                {{ todayBookings[member.id] === 1 ? t("1 booking") : t("{n} bookings", { n: todayBookings[member.id] ?? 0 }) }} · {{ t("Today") }}
                <span v-if="todayDuty(member.id)" class="text-stone-400">({{ todayDuty(member.id) }})</span>
              </div>
              <div class="flex items-start gap-2">
                <Sparkles :size="14" class="mt-0.5 shrink-0 text-stone-400" />
                <span>{{ serviceNames(member).length ? serviceNames(member).join(", ") : t("No services assigned") }}</span>
              </div>
            </div>
            <div class="mt-3 flex gap-2 border-t border-stone-100 pt-3">
              <a v-if="member.phone" :href="telHref(member.phone)" class="ui-btn ui-btn-secondary ui-btn-icon" :aria-label="t('Call')"><Phone :size="16" /></a>
              <a v-if="member.phone" :href="waHref(member.phone)" :target="waTarget" rel="noopener" class="ui-btn ui-btn-secondary ui-btn-icon" :aria-label="t('WhatsApp')"><WhatsAppIcon :size="18" /></a>
              <button type="button" class="ui-btn ui-btn-soft flex-1" @click="openSchedule(member)">
                <Calendar :size="16" /> {{ t("Schedule") }}
              </button>
              <RowActionMenu :label="t('More actions')" size="md">
                <button type="button" class="ds-menu-item" @click="openEdit(member)">
                  <Edit2 :size="16" /> {{ t("Edit Staff") }}
                </button>
                <button type="button" class="ds-menu-item" @click="openServicesAssign(member)">
                  <Sparkles :size="16" /> {{ t("Assign Services") }}
                </button>
              </RowActionMenu>
            </div>
          </article>
        </div>
      </template>
    </div>

    <!-- Create Staff Modal -->
    <div
      v-if="showCreateModal"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="m-sheet-panel w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 class="font-display text-xl font-bold text-stone-900">{{ t("Add Staff Member") }}</h3>
          <button type="button" @click="showCreateModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleCreate" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Full Name") }}</label>
            <input
              v-model="staffForm.name"
              type="text"
              required
              :placeholder="t('e.g. Maria Papadaki')"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Role / Position") }}</label>
            <input
              v-model="staffForm.role"
              type="text"
              required
              :placeholder="t('e.g. Master Barber, Senior Stylist')"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div class="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div>
              <label class="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-stone-600">
                <span class="truncate">{{ onLocation ? t("WhatsApp phone") : t("Phone (Optional)") }}</span>
                <span v-if="onLocation" class="text-rose-600" :title="t('Required')">*</span>
              </label>
              <input
                v-model="staffForm.phone"
                type="tel"
                :required="onLocation"
                placeholder="+30 69..."
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Email (Optional)") }}</label>
              <input
                v-model="staffForm.email"
                type="email"
                :placeholder="t('staff@example.com')"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <!-- Services this person can do (multi-select with tags) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600">{{ t("Assign Services Offered") }}</label>
            <TagMultiSelect
              v-model="staffForm.serviceIds"
              :options="serviceOptions"
              placeholder="Choose services…"
              empty-text="No services yet"
            />
          </div>

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
              {{ isSubmitting ? t("Creating...") : t("Save Member") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Staff Modal -->
    <div
      v-if="showEditModal && selectedStaff"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="m-sheet-panel w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 class="font-display text-xl font-bold text-stone-900">{{ t("Edit Staff Member") }}</h3>
          <button type="button" @click="showEditModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleEdit" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Full Name") }}</label>
            <input
              v-model="staffForm.name"
              type="text"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Role / Position") }}</label>
            <input
              v-model="staffForm.role"
              type="text"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Phone") }}</label>
              <input
                v-model="staffForm.phone"
                type="tel"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Email") }}</label>
              <input
                v-model="staffForm.email"
                type="email"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <SettingToggle v-model="staffForm.active" :title="t('Active (available for bookings)')" />

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
              {{ isSubmitting ? t("Saving...") : t("Save Changes") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Assign Services Modal -->
    <div
      v-if="showServicesModal && selectedStaff"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="m-sheet-panel w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 class="font-display text-xl font-bold text-stone-900">{{ t("Assign Services") }}</h3>
            <p class="text-xs text-stone-500">{{ t("Select services that {name} can perform.", { name: selectedStaff.name }) }}</p>
          </div>
          <button type="button" @click="showServicesModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <TagMultiSelect
          v-model="staffForm.serviceIds"
          :options="serviceOptions"
          placeholder="Choose services…"
          empty-text="No services yet"
        />

        <div class="m-sheet-actions flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
          <button
            type="button"
            @click="showServicesModal = false"
            class="ui-btn ui-btn-secondary rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            {{ t("Cancel") }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="handleSaveServices"
            class="ui-btn ui-btn-primary rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {{ isSubmitting ? t("Saving...") : t("Save Assigned Services") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Staff Schedule Viewer Modal -->
    <div
      v-if="showScheduleModal && selectedStaff"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="m-sheet-panel w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600">{{ t("Individual Schedule") }}</span>
            <h3 class="font-display text-xl font-bold text-stone-900">{{ selectedStaff.name }}</h3>
          </div>
          <button type="button" @click="showScheduleModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <div v-if="isScheduleLoading" class="py-12 text-center text-xs text-stone-400 animate-pulse">
          {{ t("Loading assigned appointments...") }}
        </div>

        <div
          v-else-if="staffSchedule.length === 0"
          class="py-12 text-center text-xs text-stone-500 italic"
        >
          {{ t("No appointments currently assigned to {name}.", { name: selectedStaff.name }) }}
        </div>

        <div v-else class="max-h-80 overflow-y-auto space-y-2.5 pe-1">
          <div
            v-for="item in staffSchedule"
            :key="item.appointment.id"
            class="rounded-2xl border border-stone-200 bg-stone-50/50 p-3.5 space-y-1 text-xs"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-stone-900">{{ formatDate(item.appointment.startAt) }} · {{ formatTime(item.appointment.startAt) }}</span>
              <span class="rounded bg-stone-200/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-stone-700">
                {{ t(statusText(item.appointment.status)) }}
              </span>
            </div>
            <div class="font-semibold text-stone-800">
              {{ item.customer.firstName }} {{ item.customer.lastName }} (<bdi dir="ltr">{{ item.customer.phone }}</bdi>)
            </div>
            <div class="text-[11px] text-stone-500">
              {{ item.service.name }} ({{ item.service.durationMinutes }}m)
            </div>
          </div>
        </div>

        <div class="m-sheet-actions flex justify-end pt-3 border-t border-stone-100">
          <button
            type="button"
            @click="showScheduleModal = false"
            class="ui-btn ui-btn-secondary rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            {{ t("Close") }}
          </button>
        </div>
      </div>
    </div>

    <ImportSheetModal
      v-if="showImport"
      kind="staff"
      @close="showImport = false"
      @done="loadData()"
    />
  </div>
</template>
