<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  ShieldAlert,
  Building2,
  CalendarCheck,
  Users,
  UserCheck,
  Sparkles,
  Plus,
  Search,
  Check,
  X,
  Eye,
  Activity,
  AlertCircle,
  ExternalLink,
  Clock,
  Phone,
  Mail,
} from "lucide-vue-next";

definePageMeta({
  layout: "admin",
});

interface PlatformStats {
  totalOrganizations: number;
  totalAppointments: number;
  totalUsers: number;
  totalCustomers: number;
  totalStaff: number;
  totalServices: number;
  systemStatus: string;
  timestamp: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  country: string;
  status: string;
  bookingActive: boolean;
  createdAt: string;
}

interface OrgInspection {
  organization: Organization;
  members: any[];
  staff: any[];
  services: any[];
  customers: any[];
  appointments: any[];
  hours: any[];
}

const { refreshUser } = useSupabaseAuth();
const isAuthorized = ref(true);
const isLoading = ref(true);
const stats = ref<PlatformStats | null>(null);
const organizations = ref<Organization[]>([]);
const searchQuery = ref("");

// Modals
const showCreateModal = ref(false);
const showInspectDrawer = ref(false);
const inspectedOrg = ref<OrgInspection | null>(null);
const isInspectLoading = ref(false);

const isSubmitting = ref(false);
const formError = ref("");

const createForm = reactive({
  name: "",
  slug: "",
  email: "",
  phone: "",
  city: "Athens",
  country: "Greece",
  description: "",
  bookingActive: true,
});

const loadAdminData = async () => {
  isLoading.value = true;
  try {
    const user = await refreshUser();
    if (!user) {
      await navigateTo("/login");
      return;
    }

    const [statsData, orgsData] = await Promise.all([
      $fetch<PlatformStats>("/api/admin/stats"),
      $fetch<Organization[]>("/api/admin/organizations"),
    ]);

    stats.value = statsData;
    organizations.value = orgsData;
    isAuthorized.value = true;
  } catch (err: any) {
    if (err?.statusCode === 403) {
      isAuthorized.value = false;
    } else {
      console.error("Admin load error", err);
    }
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadAdminData();
});

const filteredOrganizations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return organizations.value;
  return organizations.value.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      o.slug.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      (o.city && o.city.toLowerCase().includes(q)),
  );
});

const toggleStatus = async (org: Organization) => {
  const nextStatus = org.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  try {
    await $fetch(`/api/admin/organizations/${org.id}`, {
      method: "PATCH",
      body: { status: nextStatus },
    });
    org.status = nextStatus;
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to toggle status.");
  }
};

const toggleBooking = async (org: Organization) => {
  const nextActive = !org.bookingActive;
  try {
    await $fetch(`/api/admin/organizations/${org.id}`, {
      method: "PATCH",
      body: { bookingActive: nextActive },
    });
    org.bookingActive = nextActive;
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to toggle online booking.");
  }
};

const openInspect = async (org: Organization) => {
  showInspectDrawer.value = true;
  isInspectLoading.value = true;
  try {
    inspectedOrg.value = await $fetch<OrgInspection>(
      `/api/admin/organizations/${org.id}`,
    );
  } catch (err: any) {
    console.error("Failed to inspect org", err);
  } finally {
    isInspectLoading.value = false;
  }
};

const openCreate = () => {
  createForm.name = "";
  createForm.slug = "";
  createForm.email = "";
  createForm.phone = "";
  createForm.city = "Athens";
  createForm.country = "Greece";
  createForm.description = "";
  createForm.bookingActive = true;
  formError.value = "";
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (!createForm.name.trim() || !createForm.slug.trim() || !createForm.email.trim()) {
    formError.value = "Name, slug, and email are required.";
    return;
  }
  isSubmitting.value = true;
  formError.value = "";
  try {
    await $fetch("/api/admin/organizations", {
      method: "POST",
      body: {
        name: createForm.name.trim(),
        slug: createForm.slug.trim().toLowerCase(),
        email: createForm.email.trim().toLowerCase(),
        phone: createForm.phone.trim() || undefined,
        city: createForm.city.trim(),
        country: createForm.country.trim(),
        description: createForm.description.trim() || undefined,
        bookingActive: createForm.bookingActive,
      },
    });
    showCreateModal.value = false;
    await loadAdminData();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? "Failed to create business.";
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
</script>

<template>
  <div class="space-y-8 pb-16">
    <!-- Authorization Denied -->
    <div
      v-if="!isAuthorized"
      class="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center space-y-4 max-w-lg mx-auto mt-12"
    >
      <div class="grid size-14 place-items-center rounded-2xl bg-rose-500/20 text-rose-400 mx-auto">
        <ShieldAlert :size="28" />
      </div>
      <h2 class="font-display text-2xl font-bold text-white">Access Denied</h2>
      <p class="text-xs text-rose-200 leading-relaxed">
        This platform administration console is strictly restricted to SUPER_ADMIN role accounts.
      </p>
      <NuxtLink
        to="/dashboard"
        class="inline-block rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-stone-900 shadow-md hover:bg-stone-100 transition"
      >
        Return to Studio Dashboard
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Admin Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-rose-400">Platform Control</span>
          <h1 class="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">System Directory</h1>
        </div>
        <button
          type="button"
          @click="openCreate"
          class="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition shadow-lg shadow-rose-900/20 self-start sm:self-auto"
        >
          <Plus :size="16" />
          <span>Provision Business</span>
        </button>
      </div>

      <!-- Platform Aggregate Metric Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div class="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Businesses</span>
            <Building2 :size="16" class="text-rose-400" />
          </div>
          <div class="text-3xl font-bold text-white">
            {{ stats?.totalOrganizations ?? '--' }}
          </div>
          <div class="text-[11px] text-white/40">Total registered studios</div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div class="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Total Bookings</span>
            <CalendarCheck :size="16" class="text-blue-400" />
          </div>
          <div class="text-3xl font-bold text-white">
            {{ stats?.totalAppointments ?? '--' }}
          </div>
          <div class="text-[11px] text-white/40">Across all businesses</div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div class="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>Total Customers</span>
            <Users :size="16" class="text-emerald-400" />
          </div>
          <div class="text-3xl font-bold text-white">
            {{ stats?.totalCustomers ?? '--' }}
          </div>
          <div class="text-[11px] text-white/40">Client CRM records</div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div class="flex items-center justify-between text-white/50 text-xs font-semibold">
            <span>System Health</span>
            <Activity :size="16" class="text-emerald-400" />
          </div>
          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xl font-bold text-white">Operational</span>
          </div>
          <div class="text-[11px] text-white/40">Database & Edge healthy</div>
        </div>
      </div>

      <!-- Business Directory Search & Table -->
      <section class="rounded-3xl border border-white/10 bg-[#16171b] p-6 space-y-5 shadow-2xl">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <h2 class="font-display text-xl font-bold text-white">Tenants & Organizations</h2>
            <p class="text-xs text-white/50">Manage status, inspect records, and configure online access.</p>
          </div>
          <div class="relative w-full sm:w-72">
            <Search :size="14" class="absolute left-3.5 top-3 text-white/40" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search business or slug..."
              class="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-rose-500 focus:bg-white/10"
            />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-white/70">
            <thead class="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/40">
              <tr>
                <th class="py-3.5 pl-4 pr-3">Business</th>
                <th class="px-3 py-3.5">Slug / URL</th>
                <th class="px-3 py-3.5">Location</th>
                <th class="px-3 py-3.5">Tenant Status</th>
                <th class="px-3 py-3.5">Online Booking</th>
                <th class="py-3.5 pl-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 font-medium">
              <tr
                v-for="org in filteredOrganizations"
                :key="org.id"
                class="hover:bg-white/5 transition"
              >
                <!-- Name & Email -->
                <td class="py-4 pl-4 pr-3 whitespace-nowrap">
                  <div class="font-bold text-white text-sm">{{ org.name }}</div>
                  <div class="text-[11px] text-white/40">{{ org.email }}</div>
                </td>

                <!-- Slug -->
                <td class="px-3 py-4 whitespace-nowrap">
                  <span class="font-mono text-[11px] text-rose-300">/book/{{ org.slug }}</span>
                </td>

                <!-- Location -->
                <td class="px-3 py-4 whitespace-nowrap text-white/60">
                  {{ org.city ?? 'Athens' }}, {{ org.country }}
                </td>

                <!-- Status Toggle -->
                <td class="px-3 py-4 whitespace-nowrap">
                  <button
                    type="button"
                    @click="toggleStatus(org)"
                    :class="[
                      org.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
                      'rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition',
                    ]"
                  >
                    {{ org.status }}
                  </button>
                </td>

                <!-- Booking Active Toggle -->
                <td class="px-3 py-4 whitespace-nowrap">
                  <button
                    type="button"
                    @click="toggleBooking(org)"
                    :class="[
                      org.bookingActive
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-white/5 text-white/40 border-white/10',
                      'rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition',
                    ]"
                  >
                    {{ org.bookingActive ? "Live" : "Disabled" }}
                  </button>
                </td>

                <!-- Actions -->
                <td class="py-4 pl-3 pr-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-2">
                    <NuxtLink
                      :to="`/book/${org.slug}`"
                      target="_blank"
                      class="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 hover:text-white hover:bg-white/10"
                      title="Open Booking Page"
                    >
                      <ExternalLink :size="14" />
                    </NuxtLink>
                    <button
                      type="button"
                      @click="openInspect(org)"
                      class="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                    >
                      <Eye :size="13" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Inspect Organization Drawer -->
      <div
        v-if="showInspectDrawer"
        class="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
        @click="showInspectDrawer = false"
      >
        <div
          class="w-full max-w-xl bg-[#17181c] border-l border-white/10 h-full p-6 overflow-y-auto space-y-6"
          @click.stop
        >
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-widest text-rose-400">Deep Inspection</span>
              <h3 class="font-display text-2xl font-bold text-white mt-0.5">
                {{ inspectedOrg?.organization.name ?? 'Loading...' }}
              </h3>
            </div>
            <button
              type="button"
              @click="showInspectDrawer = false"
              class="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X :size="20" />
            </button>
          </div>

          <div v-if="isInspectLoading" class="py-16 text-center text-xs text-white/40 animate-pulse">
            Inspecting cross-platform entity graph...
          </div>

          <template v-else-if="inspectedOrg">
            <!-- Summary Stats -->
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
                <span class="text-xs text-white/40 block">Staff</span>
                <span class="font-bold text-white text-lg">{{ inspectedOrg.staff.length }}</span>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
                <span class="text-xs text-white/40 block">Services</span>
                <span class="font-bold text-white text-lg">{{ inspectedOrg.services.length }}</span>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
                <span class="text-xs text-white/40 block">Clients</span>
                <span class="font-bold text-white text-lg">{{ inspectedOrg.customers.length }}</span>
              </div>
            </div>

            <!-- Members / Owners -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-white/50">Organization Members</h4>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-3 divide-y divide-white/5">
                <div
                  v-for="m in inspectedOrg.members"
                  :key="m.membership.id"
                  class="flex items-center justify-between py-2 text-xs"
                >
                  <span class="text-white font-medium">{{ m.user.email }} ({{ m.user.firstName }} {{ m.user.lastName }})</span>
                  <span class="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/80 uppercase">
                    {{ m.membership.role }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Recent Appointments -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-white/50">Recent Appointments</h4>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-3 divide-y divide-white/5 max-h-60 overflow-y-auto">
                <div
                  v-for="a in inspectedOrg.appointments"
                  :key="a.appointment.id"
                  class="py-2.5 text-xs space-y-1"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-white">{{ a.customer.firstName }} {{ a.customer.lastName }}</span>
                    <span class="text-[10px] text-white/50">{{ formatDate(a.appointment.startAt) }}</span>
                  </div>
                  <div class="text-[11px] text-white/60">
                    {{ a.service.name }} · Staff: {{ a.staff?.name ?? 'Unassigned' }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Create Business Modal -->
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <div class="w-full max-w-md rounded-3xl border border-white/10 bg-[#17181c] p-6 shadow-2xl space-y-5">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="font-display text-xl font-bold text-white">Provision Business</h3>
            <button type="button" @click="showCreateModal = false" class="rounded-lg p-1.5 text-white/40 hover:bg-white/10">
              <X :size="18" />
            </button>
          </div>

          <form @submit.prevent="handleCreate" class="space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Business Name</label>
              <input
                v-model="createForm.name"
                type="text"
                required
                placeholder="Maria Beauty Studio"
                class="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">URL Slug</label>
              <input
                v-model="createForm.slug"
                type="text"
                required
                placeholder="maria-beauty-studio"
                class="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Owner / Contact Email</label>
              <input
                v-model="createForm.email"
                type="email"
                required
                placeholder="owner@example.com"
                class="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">City</label>
                <input
                  v-model="createForm.city"
                  type="text"
                  placeholder="Athens"
                  class="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Phone (Optional)</label>
                <input
                  v-model="createForm.phone"
                  type="tel"
                  placeholder="+30 210..."
                  class="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <p v-if="formError" class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-medium">
              {{ formError }}
            </p>

            <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                @click="showCreateModal = false"
                class="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {{ isSubmitting ? "Provisioning..." : "Create Organization" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </div>
</template>
