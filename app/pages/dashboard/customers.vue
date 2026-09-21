<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  MessageSquare,
  Sparkles,
  X,
  History,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-vue-next";

definePageMeta({
  layout: "dashboard",
});

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface CustomerDetailResponse {
  customer: Customer;
  appointments: Array<{
    appointment: {
      id: string;
      startAt: string;
      endAt: string;
      status: string;
      source: string;
      notes?: string | null;
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
    } | null;
  }>;
  totalAppointments: number;
  completedAppointments: number;
}

const customers = ref<Customer[]>([]);
const isLoading = ref(true);
const searchQuery = ref("");

// Modals
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDetailDrawer = ref(false);
const showCommModal = ref(false);
const showAnonymizeConfirm = ref(false);

const selectedCustomer = ref<Customer | null>(null);
const customerDetail = ref<CustomerDetailResponse | null>(null);
const isDetailLoading = ref(false);
const isSubmitting = ref(false);
const formError = ref("");

const customerForm = reactive({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  notes: "",
});

const loadCustomers = async () => {
  isLoading.value = true;
  try {
    customers.value = await $fetch<Customer[]>("/api/customers");
  } catch (err: any) {
    console.error("Failed to load customers", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadCustomers();
});

const filteredCustomers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return customers.value;
  return customers.value.filter(
    (c) =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)),
  );
});

const openDetail = async (c: Customer) => {
  selectedCustomer.value = c;
  showDetailDrawer.value = true;
  isDetailLoading.value = true;
  try {
    customerDetail.value = await $fetch<CustomerDetailResponse>(
      `/api/customers/${c.id}`,
    );
  } catch (err: any) {
    console.error("Failed to fetch customer detail", err);
  } finally {
    isDetailLoading.value = false;
  }
};

const openCreate = () => {
  customerForm.firstName = "";
  customerForm.lastName = "";
  customerForm.phone = "";
  customerForm.email = "";
  customerForm.notes = "";
  formError.value = "";
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (!customerForm.firstName.trim() || !customerForm.phone.trim()) {
    formError.value = "First name and phone number are required.";
    return;
  }
  isSubmitting.value = true;
  formError.value = "";
  try {
    await $fetch("/api/customers", {
      method: "POST",
      body: {
        firstName: customerForm.firstName.trim(),
        lastName: customerForm.lastName.trim() || "Customer",
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim() || null,
        notes: customerForm.notes.trim() || null,
      },
    });
    showCreateModal.value = false;
    await loadCustomers();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? "Failed to create customer.";
  } finally {
    isSubmitting.value = false;
  }
};

const openEdit = (c: Customer) => {
  selectedCustomer.value = c;
  customerForm.firstName = c.firstName;
  customerForm.lastName = c.lastName;
  customerForm.phone = c.phone;
  customerForm.email = c.email ?? "";
  customerForm.notes = c.notes ?? "";
  formError.value = "";
  showEditModal.value = true;
};

const handleEdit = async () => {
  if (!selectedCustomer.value) return;
  isSubmitting.value = true;
  formError.value = "";
  try {
    await $fetch(`/api/customers/${selectedCustomer.value.id}`, {
      method: "PATCH",
      body: {
        firstName: customerForm.firstName.trim(),
        lastName: customerForm.lastName.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim() || null,
        notes: customerForm.notes.trim() || null,
      },
    });
    showEditModal.value = false;
    await loadCustomers();
    if (showDetailDrawer.value && selectedCustomer.value) {
      await openDetail(selectedCustomer.value);
    }
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? "Failed to update customer.";
  } finally {
    isSubmitting.value = false;
  }
};

const handleAnonymize = async () => {
  if (!selectedCustomer.value) return;
  isSubmitting.value = true;
  try {
    await $fetch(`/api/customers/${selectedCustomer.value.id}`, {
      method: "DELETE",
    });
    showAnonymizeConfirm.value = false;
    showDetailDrawer.value = false;
    await loadCustomers();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to anonymize customer.");
  } finally {
    isSubmitting.value = false;
  }
};

const openMessage = (c: Customer) => {
  selectedCustomer.value = c;
  showCommModal.value = true;
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">Customer CRM</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Clients Directory</h1>
      </div>
      <button
        type="button"
        @click="openCreate"
        class="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm self-start sm:self-auto"
      >
        <Plus :size="16" />
        <span>Add Customer</span>
      </button>
    </div>

    <!-- Search Bar -->
    <div class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div class="relative max-w-md">
        <Search :size="15" class="absolute left-3.5 top-3 text-stone-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name, phone number, email..."
          class="w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-9 pr-3 py-2 text-xs outline-none focus:border-stone-900 focus:bg-white"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 rounded-2xl bg-stone-200/60 animate-pulse"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredCustomers.length === 0"
      class="py-16 text-center rounded-3xl border border-dashed border-stone-200 bg-white"
    >
      <Users :size="36" class="mx-auto text-stone-400" />
      <h3 class="mt-3 font-display text-lg font-bold text-stone-900">No customers found</h3>
      <p class="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
        Add your first client profile or accept online bookings to automatically build your CRM.
      </p>
      <button
        type="button"
        @click="openCreate"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white"
      >
        <Plus :size="14" />
        <span>Add Customer</span>
      </button>
    </div>

    <!-- Customers Table -->
    <div v-else class="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-stone-600">
          <thead class="bg-stone-50/80 border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            <tr>
              <th class="py-3.5 pl-6 pr-3">Name</th>
              <th class="px-3 py-3.5">Contact Phone</th>
              <th class="px-3 py-3.5">Email Address</th>
              <th class="px-3 py-3.5">Notes</th>
              <th class="py-3.5 pl-3 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100 font-medium">
            <tr
              v-for="c in filteredCustomers"
              :key="c.id"
              class="hover:bg-stone-50/60 transition cursor-pointer"
              @click="openDetail(c)"
            >
              <!-- Name -->
              <td class="py-4 pl-6 pr-3 whitespace-nowrap">
                <div class="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <div class="grid size-7 place-items-center rounded-full bg-stone-900 text-[11px] font-bold text-white">
                    {{ c.firstName.charAt(0) }}{{ c.lastName.charAt(0) }}
                  </div>
                  <span>{{ c.firstName }} {{ c.lastName }}</span>
                </div>
              </td>

              <!-- Phone -->
              <td class="px-3 py-4 whitespace-nowrap">
                <span class="flex items-center gap-1.5 text-stone-800 font-semibold">
                  <Phone :size="13" class="text-stone-400" />
                  {{ c.phone }}
                </span>
              </td>

              <!-- Email -->
              <td class="px-3 py-4 whitespace-nowrap">
                <span v-if="c.email" class="flex items-center gap-1.5 text-stone-600">
                  <Mail :size="13" class="text-stone-400" />
                  {{ c.email }}
                </span>
                <span v-else class="text-stone-300 italic">No email provided</span>
              </td>

              <!-- Notes -->
              <td class="px-3 py-4 max-w-xs truncate text-stone-500">
                {{ c.notes || '—' }}
              </td>

              <!-- Actions -->
              <td class="py-4 pl-3 pr-6 text-right whitespace-nowrap" @click.stop>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    @click="openMessage(c)"
                    class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
                    title="Send Email / SMS"
                  >
                    <MessageSquare :size="15" />
                  </button>
                  <button
                    type="button"
                    @click="openEdit(c)"
                    class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
                    title="Edit Profile"
                  >
                    <Edit2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Customer Detail Slideover / Modal -->
    <div
      v-if="showDetailDrawer && selectedCustomer"
      class="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-xs"
      @click="showDetailDrawer = false"
    >
      <div
        class="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
        @click.stop
      >
        <div class="space-y-6">
          <!-- Drawer Header -->
          <div class="flex items-center justify-between border-b border-stone-100 pb-4">
            <div class="flex items-center gap-3">
              <div class="grid size-12 place-items-center rounded-2xl bg-stone-900 text-base font-bold text-white shadow-sm">
                {{ selectedCustomer.firstName.charAt(0) }}{{ selectedCustomer.lastName.charAt(0) }}
              </div>
              <div>
                <h3 class="font-display text-2xl font-bold text-stone-900">
                  {{ selectedCustomer.firstName }} {{ selectedCustomer.lastName }}
                </h3>
                <p class="text-xs text-stone-500">Client profile & booking history</p>
              </div>
            </div>
            <button type="button" @click="showDetailDrawer = false" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
              <X :size="20" />
            </button>
          </div>

          <!-- Contact Details Card -->
          <div class="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-stone-500 font-medium">Phone Number</span>
              <span class="font-bold text-stone-900">{{ selectedCustomer.phone }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-stone-500 font-medium">Email Address</span>
              <span class="font-bold text-stone-900">{{ selectedCustomer.email || 'None' }}</span>
            </div>
            <div v-if="selectedCustomer.notes" class="text-xs pt-2 border-t border-stone-200/60">
              <span class="block text-stone-500 font-semibold mb-1">Notes:</span>
              <p class="text-stone-700 leading-relaxed">{{ selectedCustomer.notes }}</p>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="openMessage(selectedCustomer)"
              class="flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition"
            >
              <MessageSquare :size="14" />
              <span>Send Message</span>
            </button>
            <button
              type="button"
              @click="openEdit(selectedCustomer)"
              class="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
            >
              <Edit2 :size="14" />
              <span>Edit Details</span>
            </button>
          </div>

          <!-- Appointment History Timeline -->
          <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-stone-100 pb-2">
              <div class="flex items-center gap-2">
                <History :size="16" class="text-rose-600" />
                <h4 class="font-display text-base font-bold text-stone-900">Appointment History</h4>
              </div>
              <span v-if="customerDetail" class="text-xs text-stone-500 font-medium">
                {{ customerDetail.totalAppointments }} total
              </span>
            </div>

            <div v-if="isDetailLoading" class="py-8 text-center text-xs text-stone-400 animate-pulse">
              Loading appointment history...
            </div>

            <div
              v-else-if="!customerDetail?.appointments || customerDetail.appointments.length === 0"
              class="py-8 text-center text-xs text-stone-400 italic"
            >
              No past or upcoming appointments recorded for this client.
            </div>

            <div v-else class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              <div
                v-for="item in customerDetail.appointments"
                :key="item.appointment.id"
                class="rounded-xl border border-stone-200/80 bg-white p-3.5 space-y-1.5 hover:border-stone-300 transition text-xs"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-stone-900">{{ formatDate(item.appointment.startAt) }} · {{ formatTime(item.appointment.startAt) }}</span>
                  <span class="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-stone-700">
                    {{ item.appointment.status }}
                  </span>
                </div>
                <div class="font-medium text-stone-700 flex items-center gap-2">
                  <span class="size-2 rounded-full" :style="{ backgroundColor: item.service.accent || '#ca7481' }"></span>
                  <span>{{ item.service.name }}</span>
                  <span class="text-stone-400">·</span>
                  <span class="font-bold text-stone-900">{{ (item.service.priceCents / 100).toFixed(2) }} €</span>
                </div>
                <div class="text-[11px] text-stone-500">
                  Staff: {{ item.staff?.name ?? 'Unassigned' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Anonymize / Soft Delete Action -->
        <div class="pt-6 border-t border-stone-100">
          <button
            type="button"
            @click="showAnonymizeConfirm = true"
            class="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
          >
            <Trash2 :size="14" />
            <span>Anonymize & Remove Client PII</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Create Customer Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 class="font-display text-xl font-bold text-stone-900">Add New Client</h3>
          <button type="button" @click="showCreateModal = false" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleCreate" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">First Name</label>
              <input
                v-model="customerForm.firstName"
                type="text"
                required
                placeholder="Maria"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Last Name</label>
              <input
                v-model="customerForm.lastName"
                type="text"
                placeholder="Georgiou"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Phone Number</label>
            <input
              v-model="customerForm.phone"
              type="tel"
              required
              placeholder="+30 69..."
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Email Address</label>
            <input
              v-model="customerForm.email"
              type="email"
              placeholder="client@example.com"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Notes</label>
            <textarea
              v-model="customerForm.notes"
              rows="2"
              placeholder="Preferences, allergies, notes..."
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            ></textarea>
          </div>

          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
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
              {{ isSubmitting ? "Creating..." : "Save Client" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Customer Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 class="font-display text-xl font-bold text-stone-900">Edit Client Profile</h3>
          <button type="button" @click="showEditModal = false" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleEdit" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">First Name</label>
              <input
                v-model="customerForm.firstName"
                type="text"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Last Name</label>
              <input
                v-model="customerForm.lastName"
                type="text"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Phone Number</label>
            <input
              v-model="customerForm.phone"
              type="tel"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Email Address</label>
            <input
              v-model="customerForm.email"
              type="email"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Notes</label>
            <textarea
              v-model="customerForm.notes"
              rows="2"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            ></textarea>
          </div>

          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
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
              {{ isSubmitting ? "Updating..." : "Save Changes" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Anonymize Confirmation Modal -->
    <div
      v-if="showAnonymizeConfirm && selectedCustomer"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-rose-600">
          <AlertCircle :size="24" />
          <h3 class="font-display text-lg font-bold text-stone-900">Anonymize Customer Data?</h3>
        </div>
        <p class="text-xs text-stone-600 leading-relaxed">
          This will wipe personal information (Name, Email, Phone) for <strong>{{ selectedCustomer.firstName }} {{ selectedCustomer.lastName }}</strong> to comply with privacy requests. Past appointments will remain preserved in historical statistics.
        </p>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
          <button
            type="button"
            @click="showAnonymizeConfirm = false"
            class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="handleAnonymize"
            class="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {{ isSubmitting ? "Processing..." : "Confirm Anonymize" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Communication Modal -->
    <CommunicationModal
      v-model="showCommModal"
      :customer="selectedCustomer"
    />
  </div>
</template>
