<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Share2,
  CalendarPlus,
} from "lucide-vue-next";

const route = useRoute();
const slug = computed(() => route.params.businessSlug as string);

interface PublicBusinessData {
  business: {
    name: string;
    slug: string;
    description?: string | null;
    city?: string | null;
    country: string;
    phone?: string | null;
    email: string;
    timezone: string;
    currency: string;
    bookingActive: boolean;
  };
  services: Array<{
    id: string;
    name: string;
    description?: string | null;
    category: string;
    durationMinutes: number;
    priceCents: number;
    accent: string;
  }>;
  hours: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    enabled: boolean;
  }>;
}

interface AvailableSlot {
  time: string;
  startAt: string;
}

const businessData = ref<PublicBusinessData | null>(null);
const isLoading = ref(true);
const pageError = ref("");

// Booking Wizard State
const step = ref<1 | 2 | 3 | 4>(1); // 1: Service, 2: Date & Slot, 3: Details, 4: Confirmed
const selectedService = ref<PublicBusinessData["services"][0] | null>(null);
const selectedDate = ref<Date>(new Date());
const selectedSlot = ref<AvailableSlot | null>(null);

const availableSlots = ref<AvailableSlot[]>([]);
const isSlotsLoading = ref(false);

const customerForm = reactive({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  notes: "",
});

const isBooking = ref(false);
const bookingError = ref("");
const confirmedBooking = ref<any>(null);

// Load business and active services
const loadBusiness = async () => {
  isLoading.value = true;
  pageError.value = "";
  try {
    const data = await $fetch<PublicBusinessData>(`/api/public/${slug.value}`);
    businessData.value = data;
    if (data.services.length > 0) {
      selectedService.value = data.services[0] ?? null;
    }
  } catch (err: any) {
    pageError.value =
      err?.data?.statusMessage ?? "This booking page is currently unavailable.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadBusiness();
});

// Calculate next 14 bookable days
const nextDays = computed(() => {
  const days = [];
  const start = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
});

// Fetch time slots when service or date changes
const loadSlots = async () => {
  if (!selectedService.value || !selectedDate.value || !businessData.value) return;
  isSlotsLoading.value = true;
  selectedSlot.value = null;
  try {
    const dateStr = selectedDate.value.toISOString().slice(0, 10);
    const slots = await $fetch<AvailableSlot[]>(
      `/api/public/${slug.value}/availability`,
      {
        query: {
          date: dateStr,
          serviceId: selectedService.value.id,
        },
      },
    );
    availableSlots.value = slots;
  } catch (err: any) {
    console.error("Failed to load availability slots", err);
    availableSlots.value = [];
  } finally {
    isSlotsLoading.value = false;
  }
};

watch([selectedService, selectedDate], () => {
  if (step.value === 2) {
    loadSlots();
  }
});

const selectServiceAndContinue = (service: any) => {
  selectedService.value = service;
  step.value = 2;
  loadSlots();
};

const selectSlotAndContinue = (slot: AvailableSlot) => {
  selectedSlot.value = slot;
  step.value = 3;
};

const submitBooking = async () => {
  if (!customerForm.firstName.trim() || !customerForm.phone.trim() || !customerForm.email.trim()) {
    bookingError.value = "Please provide your first name, phone number, and email.";
    return;
  }
  if (!selectedSlot.value || !selectedService.value) {
    bookingError.value = "Missing service or time selection.";
    return;
  }

  isBooking.value = true;
  bookingError.value = "";

  try {
    const res = await $fetch(`/api/public/${slug.value}/book`, {
      method: "POST",
      body: {
        serviceId: selectedService.value.id,
        startAt: selectedSlot.value.startAt,
        firstName: customerForm.firstName.trim(),
        lastName: customerForm.lastName.trim() || "Customer",
        email: customerForm.email.trim().toLowerCase(),
        phone: customerForm.phone.trim(),
        notes: customerForm.notes.trim() || undefined,
      },
    });

    confirmedBooking.value = res;
    step.value = 4;
  } catch (err: any) {
    bookingError.value =
      err?.data?.statusMessage ?? "Failed to finalize booking. Please pick another slot.";
  } finally {
    isBooking.value = false;
  }
};

const isDaySelected = (d: Date) => {
  return (
    d.getDate() === selectedDate.value.getDate() &&
    d.getMonth() === selectedDate.value.getMonth() &&
    d.getFullYear() === selectedDate.value.getFullYear()
  );
};

const formatDateDisplay = (d: Date) => {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatTimeDisplay = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const shareViaWhatsApp = () => {
  if (!businessData.value) return;
  const text = encodeURIComponent(
    `Book an appointment at ${businessData.value.business.name}: ${window.location.href}`,
  );
  window.open(`https://wa.me/?text=${text}`, "_blank");
};
</script>

<template>
  <div class="min-h-screen bg-[#faf9f6] text-[#24262d] flex flex-col justify-between antialiased">
    <!-- Clean Public Header -->
    <header class="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-5 py-3.5">
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="flex size-8 items-center justify-center rounded-xl bg-stone-900 text-white font-bold">
            <Sparkles :size="16" />
          </div>
          <span class="font-display font-bold text-stone-900 text-base tracking-tight">RantevouOS</span>
        </NuxtLink>

        <button
          type="button"
          @click="shareViaWhatsApp"
          class="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
        >
          <Share2 :size="13" />
          <span>Share</span>
        </button>
      </div>
    </header>

    <main class="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
      <!-- Loading State -->
      <div v-if="isLoading" class="py-24 text-center space-y-4">
        <div class="size-10 rounded-full border-2 border-stone-900 border-t-transparent animate-spin mx-auto"></div>
        <p class="text-xs font-semibold text-stone-500 uppercase tracking-wider">Loading booking studio...</p>
      </div>

      <!-- Page Error / Studio Inactive -->
      <div v-else-if="pageError || !businessData" class="py-20 text-center max-w-md mx-auto space-y-4">
        <div class="grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 mx-auto">
          <AlertCircle :size="28" />
        </div>
        <h1 class="font-display text-2xl font-bold text-stone-900">Studio Unavailable</h1>
        <p class="text-xs text-stone-500 leading-relaxed">
          {{ pageError || "This business booking page is currently paused or does not exist." }}
        </p>
        <NuxtLink
          to="/"
          class="inline-block rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm"
        >
          Return Home
        </NuxtLink>
      </div>

      <!-- Main Booking Wizard Flow -->
      <div v-else class="space-y-8">
        <!-- Business Header Banner -->
        <section v-if="step !== 4" class="text-center sm:text-left sm:flex sm:items-end sm:justify-between border-b border-stone-200/80 pb-6">
          <div class="space-y-1">
            <span class="text-[11px] font-bold uppercase tracking-wider text-rose-600">Online Appointments</span>
            <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              {{ businessData.business.name }}
            </h1>
            <p v-if="businessData.business.description" class="text-xs text-stone-500 max-w-xl">
              {{ businessData.business.description }}
            </p>
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-stone-500 pt-1">
              <span v-if="businessData.business.city" class="flex items-center gap-1.5">
                <MapPin :size="13" class="text-stone-400" />
                {{ businessData.business.city }}, {{ businessData.business.country }}
              </span>
              <span v-if="businessData.business.phone" class="flex items-center gap-1.5">
                <Phone :size="13" class="text-stone-400" />
                {{ businessData.business.phone }}
              </span>
            </div>
          </div>

          <!-- Wizard Step Indicator -->
          <div class="hidden sm:flex items-center gap-2 mt-4 sm:mt-0">
            <div
              v-for="s in [1, 2, 3]"
              :key="s"
              :class="[
                step === s ? 'bg-stone-900 text-white font-bold' : step > s ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500',
                'size-7 rounded-full grid place-items-center text-xs transition',
              ]"
            >
              <Check v-if="step > s" :size="13" />
              <span v-else>{{ s }}</span>
            </div>
          </div>
        </section>

        <!-- STEP 1: Select Service -->
        <section v-if="step === 1" class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-display text-xl font-bold text-stone-900">1. Select a Service</h2>
              <p class="text-xs text-stone-500">Choose the treatment or session you wish to book.</p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="service in businessData.services"
              :key="service.id"
              type="button"
              @click="selectServiceAndContinue(service)"
              class="flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 text-left transition hover:border-stone-400 hover:shadow-md space-y-3 group"
            >
              <div class="space-y-1.5 w-full">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span
                      class="size-3 rounded-full shrink-0 shadow-2xs"
                      :style="{ backgroundColor: service.accent || '#ca7481' }"
                    ></span>
                    <h3 class="font-bold text-stone-900 text-sm group-hover:text-rose-600 transition">{{ service.name }}</h3>
                  </div>
                  <span class="font-bold text-stone-900 text-sm">
                    {{ (service.priceCents / 100).toFixed(2) }} €
                  </span>
                </div>
                <p v-if="service.description" class="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  {{ service.description }}
                </p>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500 w-full">
                <span class="flex items-center gap-1 font-semibold text-stone-700">
                  <Clock3 :size="13" />
                  {{ service.durationMinutes }} minutes
                </span>
                <span class="font-bold text-rose-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                  Select Time →
                </span>
              </div>
            </button>
          </div>
        </section>

        <!-- STEP 2: Select Date & Available Slot -->
        <section v-else-if="step === 2" class="space-y-6">
          <div class="flex items-center justify-between">
            <button
              type="button"
              @click="step = 1"
              class="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900"
            >
              <ChevronLeft :size="16" />
              <span>Back to Services</span>
            </button>

            <span v-if="selectedService" class="rounded-full bg-stone-200/70 px-3 py-1 text-xs font-semibold text-stone-800">
              {{ selectedService.name }} · {{ selectedService.durationMinutes }}m · {{ (selectedService.priceCents / 100).toFixed(2) }} €
            </span>
          </div>

          <!-- Date Selector Ribbon -->
          <div class="space-y-2">
            <h2 class="font-display text-xl font-bold text-stone-900">2. Choose Date</h2>
            <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                v-for="d in nextDays"
                :key="d.toISOString()"
                type="button"
                @click="selectedDate = d"
                :class="[
                  isDaySelected(d)
                    ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                  'flex min-w-20 shrink-0 flex-col items-center justify-center rounded-2xl border py-3 px-2 text-center transition cursor-pointer',
                ]"
              >
                <span class="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {{ d.toLocaleDateString(undefined, { weekday: "short" }) }}
                </span>
                <span class="text-base font-bold my-0.5">{{ d.getDate() }}</span>
                <span class="text-[10px] opacity-80">
                  {{ d.toLocaleDateString(undefined, { month: "short" }) }}
                </span>
              </button>
            </div>
          </div>

          <!-- Available Time Slots -->
          <div class="space-y-3 pt-2">
            <h3 class="font-display text-lg font-bold text-stone-900">
              Available Times on {{ formatDateDisplay(selectedDate) }}
            </h3>

            <!-- Slot Loading State -->
            <div v-if="isSlotsLoading" class="py-12 text-center text-xs text-stone-400 animate-pulse">
              Checking available openings...
            </div>

            <!-- No slots open -->
            <div
              v-else-if="availableSlots.length === 0"
              class="py-12 text-center rounded-3xl border border-dashed border-stone-200 bg-white p-6"
            >
              <Clock3 :size="32" class="mx-auto text-stone-400" />
              <p class="mt-2 text-xs font-semibold text-stone-600">No time slots available on this date</p>
              <p class="mt-1 text-[11px] text-stone-400">Please choose another day from the calendar above.</p>
            </div>

            <!-- Slots Grid -->
            <div v-else class="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              <button
                v-for="slot in availableSlots"
                :key="slot.startAt"
                type="button"
                @click="selectSlotAndContinue(slot)"
                class="rounded-2xl border border-stone-200 bg-white py-3 text-center text-xs font-bold text-stone-800 hover:border-stone-900 hover:bg-stone-900 hover:text-white transition shadow-2xs"
              >
                {{ slot.time }}
              </button>
            </div>
          </div>
        </section>

        <!-- STEP 3: Customer Details Form -->
        <section v-else-if="step === 3" class="max-w-lg mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <button
              type="button"
              @click="step = 2"
              class="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900"
            >
              <ChevronLeft :size="16" />
              <span>Back to Time Selection</span>
            </button>
          </div>

          <!-- Summary Pill -->
          <div class="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-1 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-stone-900 text-sm">{{ selectedService?.name }}</span>
              <span class="font-bold text-stone-900">{{ ((selectedService?.priceCents ?? 0) / 100).toFixed(2) }} €</span>
            </div>
            <div class="text-stone-500 flex items-center gap-2">
              <span>{{ formatDateDisplay(selectedDate) }} at {{ selectedSlot?.time }}</span>
              <span>·</span>
              <span>{{ selectedService?.durationMinutes }} minutes</span>
            </div>
          </div>

          <!-- Form Details -->
          <form @submit.prevent="submitBooking" class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h2 class="font-display text-xl font-bold text-stone-900">3. Your Contact Details</h2>
              <p class="text-xs text-stone-500">We will send your confirmation and reminders to this email.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">First Name</label>
                <input
                  v-model="customerForm.firstName"
                  type="text"
                  required
                  placeholder="Eleni"
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
                placeholder="+30 6912345678"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Email Address</label>
              <input
                v-model="customerForm.email"
                type="email"
                required
                placeholder="eleni@example.com"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Notes (Optional)</label>
              <textarea
                v-model="customerForm.notes"
                rows="2"
                placeholder="Any special requests or allergies..."
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              ></textarea>
            </div>

            <p v-if="bookingError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {{ bookingError }}
            </p>

            <button
              type="submit"
              :disabled="isBooking"
              class="w-full rounded-xl bg-stone-900 py-3.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition shadow-sm"
            >
              {{ isBooking ? "Confirming Booking..." : `Confirm ${selectedSlot?.time} Appointment` }}
            </button>
          </form>
        </section>

        <!-- STEP 4: Success / Confirmation Screen -->
        <section v-else-if="step === 4" class="max-w-md mx-auto text-center py-10 space-y-6">
          <div class="grid size-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-700 mx-auto shadow-sm">
            <Check :size="32" />
          </div>

          <div class="space-y-2">
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">Booking Confirmed</span>
            <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              See you soon!
            </h1>
            <p class="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
              Your appointment has been registered. We've sent a confirmation email to <strong>{{ customerForm.email }}</strong>.
            </p>
          </div>

          <!-- Confirmation Card -->
          <div class="rounded-3xl border border-stone-200 bg-white p-6 text-left shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span class="text-[10px] text-stone-400 uppercase tracking-wider">Business</span>
                <h3 class="font-bold text-stone-900 text-base">{{ businessData.business.name }}</h3>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-stone-400 uppercase tracking-wider">Price</span>
                <span class="block font-bold text-stone-900 text-sm">
                  {{ ((selectedService?.priceCents ?? 0) / 100).toFixed(2) }} €
                </span>
              </div>
            </div>

            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-stone-500">Service</span>
                <span class="font-bold text-stone-900">{{ selectedService?.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-stone-500">Date & Time</span>
                <span class="font-bold text-stone-900">{{ formatDateDisplay(selectedDate) }} at {{ selectedSlot?.time }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-stone-500">Client</span>
                <span class="font-bold text-stone-900">{{ customerForm.firstName }} {{ customerForm.lastName }}</span>
              </div>
              <div v-if="businessData.business.city" class="flex items-center justify-between">
                <span class="text-stone-500">Location</span>
                <span class="font-bold text-stone-900">{{ businessData.business.city }}, {{ businessData.business.country }}</span>
              </div>
            </div>
          </div>

          <div class="pt-4 flex flex-col gap-2">
            <button
              type="button"
              @click="shareViaWhatsApp"
              class="w-full rounded-xl border border-stone-200 bg-white py-3 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs flex items-center justify-center gap-2"
            >
              <Share2 :size="14" />
              <span>Share Appointment on WhatsApp</span>
            </button>
            <NuxtLink
              to="/"
              class="text-xs font-semibold text-stone-500 hover:text-stone-900 pt-2"
            >
              Return to Studio Home
            </NuxtLink>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-stone-200/80 bg-white py-6 text-center text-xs text-stone-400">
      <div class="max-w-4xl mx-auto px-4">
        <span>Powered by <strong>RantevouOS</strong> · Instant Appointment Management</span>
      </div>
    </footer>
  </div>
</template>
