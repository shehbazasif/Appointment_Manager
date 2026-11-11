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
  MessageCircle,
} from "lucide-vue-next";
const { t, intl } = useT();

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
    const [staffData, serviceData, scheduleData] = await Promise.all([
      $fetch<StaffMember[]>("/api/staff"),
      $fetch<ServiceItem[]>("/api/services"),
      $fetch<ScheduleRow[]>("/api/staff-schedules").catch(() => [] as ScheduleRow[]),
    ]);
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
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Header -->
    <div class="page-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">{{ t("Team & Providers") }}</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">{{ t("Staff Members") }}</h1>
      </div>
      <div class="page-head-actions flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          @click="showImport = true"
          class="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-sm"
        >
          <Upload :size="16" />
          <span>{{ t("Import Excel") }}</span>
        </button>
        <button
          type="button"
          @click="openCreate"
          class="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm"
        >
          <Plus :size="16" />
          <span>{{ t("Add Staff Member") }}</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-44 rounded-3xl bg-stone-200/60 animate-pulse"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="staffList.length === 0"
      class="py-16 text-center rounded-3xl border border-dashed border-stone-200 bg-white"
    >
      <UserCheck :size="36" class="mx-auto text-stone-400" />
      <h3 class="mt-3 font-display text-lg font-bold text-stone-900">{{ t("No team members added yet") }}</h3>
      <p class="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
        {{ t("Add your staff specialists to assign incoming appointments and manage individual schedules.") }}
      </p>
      <button
        type="button"
        @click="openCreate"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white"
      >
        <Plus :size="14" />
        <span>{{ t("Add First Staff Member") }}</span>
      </button>
    </div>

    <!-- Staff Cards Grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="member in staffList"
        :key="member.id"
        :class="[
          member.active ? 'border-stone-200 bg-white' : 'border-stone-200/60 bg-stone-100/60 opacity-75',
          'rounded-3xl border p-5 shadow-sm space-y-4 transition flex flex-col justify-between',
        ]"
      >
        <div class="space-y-3">
          <!-- Member Top Row -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                :class="[
                  member.active ? 'bg-stone-900 text-white' : 'bg-stone-400 text-white',
                  'grid size-11 place-items-center rounded-2xl text-sm font-bold shadow-2xs',
                ]"
              >
                {{ member.name.charAt(0) }}
              </div>
              <div>
                <h3 class="font-bold text-stone-900 text-base leading-snug">{{ member.name }}</h3>
                <p class="text-xs text-rose-600 font-semibold">{{ member.role }}</p>
              </div>
            </div>

            <!-- Active Status Badge -->
            <button
              type="button"
              @click="toggleActive(member)"
              :class="[
                member.active
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-stone-200 text-stone-600 border-stone-300 hover:bg-stone-300',
                'rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition',
              ]"
              :title="member.active ? 'Click to deactivate' : 'Click to activate'"
            >
              {{ member.active ? t("Active") : t("Inactive") }}
            </button>
          </div>

          <!-- Contact info -->
          <div class="space-y-1.5 text-xs text-stone-500 pt-1">
            <div v-if="member.phone" class="flex items-center gap-2 text-stone-700">
              <Phone :size="13" class="text-stone-400" />
              <span><bdi dir="ltr">{{ member.phone }}</bdi></span>
            </div>
            <div v-if="member.email" class="flex min-w-0 items-center gap-2 text-stone-700">
              <Mail :size="13" class="shrink-0 text-stone-400" />
              <span class="truncate">{{ member.email }}</span>
            </div>
            <div v-if="todayDuty(member.id)" class="flex items-center gap-2 text-stone-700">
              <Clock :size="13" class="text-stone-400" />
              <span class="font-semibold">{{ todayDuty(member.id) }}</span>
            </div>
          </div>

          <!-- Call / WhatsApp -->
          <div v-if="member.phone" class="grid grid-cols-2 gap-2">
            <a
              :href="telHref(member.phone)"
              class="tap inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 text-xs font-bold text-stone-800 hover:bg-stone-50"
            >
              <Phone :size="14" />
              <span>{{ t("Call") }}</span>
            </a>
            <a
              :href="waHref(member.phone)"
              :target="waTarget"
              rel="noopener"
              class="tap inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageCircle :size="14" />
              <span>{{ t("WhatsApp") }}</span>
            </a>
          </div>

          <!-- Assigned Services Count -->
          <div class="rounded-xl bg-stone-50 p-2.5 text-xs flex items-center justify-between border border-stone-200/60">
            <span class="text-stone-500 font-medium">{{ t("Assigned Services") }}</span>
            <span class="font-bold text-stone-900">{{ t("{n} services", { n: member.serviceIds?.length ?? 0 }) }}</span>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="grid grid-cols-3 gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            @click="openServicesAssign(member)"
            class="tap flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white py-2 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
            :title="t('Assign Services')"
          >
            <Sparkles :size="12" />
            <span>{{ t("Services") }}</span>
          </button>

          <button
            type="button"
            @click="openSchedule(member)"
            class="tap flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white py-2 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
            :title="t('View Schedule')"
          >
            <Calendar :size="12" />
            <span>{{ t("Schedule") }}</span>
          </button>

          <button
            type="button"
            @click="openEdit(member)"
            class="tap flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white py-2 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
            :title="t('Edit Staff')"
          >
            <Edit2 :size="12" />
            <span>{{ t("Edit") }}</span>
          </button>
        </div>
      </div>
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
              class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {{ t("Cancel") }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
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

          <div class="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="activeCheckbox"
              v-model="staffForm.active"
              class="rounded border-stone-300 text-stone-900"
            />
            <label for="activeCheckbox" class="text-xs font-semibold text-stone-700 cursor-pointer">
              {{ t("Active (available for bookings)") }}
            </label>
          </div>

          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="m-sheet-actions flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              @click="showEditModal = false"
              class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {{ t("Cancel") }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
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
            class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            {{ t("Cancel") }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="handleSaveServices"
            class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
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
            class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
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
