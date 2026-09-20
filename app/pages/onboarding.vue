<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import Button from "primevue/button";

type MeResponse = {
  user: { id: string; email: string; firstName: string; lastName: string };
  organization: {
    name: string;
    slug: string;
    description: string | null;
    phone: string | null;
    city: string | null;
  } | null;
};

const categories = [
  { label: "Hair Salon", value: "hair" },
  { label: "Barbershop", value: "barber" },
  { label: "Beauty & Nails", value: "beauty" },
  { label: "Spa & Wellness", value: "spa" },
  { label: "Massage & Therapy", value: "massage" },
  { label: "Other Services", value: "other" },
];

const revenueRanges = [
  { label: "Under €2,000", value: "<2k" },
  { label: "€2,000 - €5,000", value: "2k-5k" },
  { label: "€5,000 - €10,000", value: "5k-10k" },
  { label: "€10,000+", value: "10k+" },
];

const form = reactive({
  category: "beauty",
  revenue: "2k-5k",
  description: "",
  phone: "",
  city: "Athens",
});

const businessName = ref("");
const bookingSlug = ref("");
const saved = ref(false);
const errorMessage = ref("");
const isSubmitting = ref(false);
const isPreparing = ref(true);

const loadMe = () => $fetch<MeResponse>("/api/me");

onMounted(async () => {
  try {
    let me = await loadMe();
    if (!me.organization) {
      // First visit after email confirmation: create the workspace from the
      // details captured at signup.
      await $fetch("/api/auth/bootstrap", { method: "POST" });
      me = await loadMe();
    }
    if (me.organization) {
      businessName.value = me.organization.name;
      bookingSlug.value = me.organization.slug;
      form.description = me.organization.description ?? "";
      form.phone = me.organization.phone ?? "";
      form.city = me.organization.city ?? "Athens";
    }
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ??
      "Could not load your business profile. Please try again.";
  } finally {
    isPreparing.value = false;
  }
});

const save = async () => {
  isSubmitting.value = true;
  errorMessage.value = "";
  try {
    await $fetch("/api/onboarding", {
      method: "PATCH",
      body: {
        description: form.description.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
      },
    });
    saved.value = true;
    await navigateTo("/dashboard");
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ?? "Could not save your business details.";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-stone-100/60 px-5 py-12">
    <section
      class="w-full max-w-2xl rounded-3xl border border-stone-200/80 bg-white p-8 shadow-xl shadow-stone-900/5 lg:p-10"
    >
      <p class="text-xs font-bold uppercase tracking-wider text-rose-600">
        One-minute setup
      </p>
      <h1
        class="mt-2 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl"
      >
        Tell us about your business.
      </h1>
      <p class="mt-2 text-sm text-stone-500">
        This helps shape your workspace, service defaults, and booking page.
      </p>
      <p
        v-if="bookingSlug"
        class="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-500"
      >
        Booking page:
        <strong class="text-stone-700">/book/{{ bookingSlug }}</strong>
      </p>

      <div
        v-if="isPreparing"
        class="mt-8 text-sm text-stone-500"
        role="status"
      >
        Preparing your workspace...
      </div>

      <form v-else class="mt-8 grid gap-6" @submit.prevent="save">
        <!-- Category Selection -->
        <div class="grid gap-2">
          <label class="text-xs font-semibold text-stone-700"
            >What type of business do you operate?</label
          >
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              v-for="cat in categories"
              :key="cat.value"
              type="button"
              @click="form.category = cat.value"
              :class="[
                form.category === cat.value
                  ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50',
                'flex items-center justify-center rounded-xl border p-3 text-xs font-semibold transition-all',
              ]"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>

        <!-- Revenue Selection -->
        <div class="grid gap-2">
          <label class="text-xs font-semibold text-stone-700"
            >Estimated monthly earnings</label
          >
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              v-for="rev in revenueRanges"
              :key="rev.value"
              type="button"
              @click="form.revenue = rev.value"
              :class="[
                form.revenue === rev.value
                  ? 'border-rose-600 bg-rose-50/50 text-rose-600 ring-1 ring-rose-600'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50',
                'rounded-xl border p-3 text-center text-xs font-semibold transition-all',
              ]"
            >
              {{ rev.label }}
            </button>
          </div>
        </div>

        <!-- Short Description -->
        <div class="grid gap-1.5">
          <label class="text-xs font-semibold text-stone-700"
            >Short description</label
          >
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full rounded-xl border border-stone-200/90 bg-white p-3 text-sm text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
            placeholder="Tell customers what makes your studio special..."
          />
        </div>

        <!-- Inputs fixed with native HTML elements -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-1.5">
            <label class="text-xs font-semibold text-stone-700"
              >Business Phone</label
            >
            <input
              v-model="form.phone"
              type="text"
              placeholder="+30 210..."
              class="w-full rounded-xl border border-stone-200/90 bg-white p-3 text-sm text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
            />
          </div>
          <div class="grid gap-1.5">
            <label class="text-xs font-semibold text-stone-700">City</label>
            <input
              v-model="form.city"
              type="text"
              placeholder="Athens"
              class="w-full rounded-xl border border-stone-200/90 bg-white p-3 text-sm text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
            />
          </div>
        </div>

        <!-- Error State Banner -->
        <p
          v-if="errorMessage"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
        >
          {{ errorMessage }}
        </p>

        <!-- Submit Button -->
        <Button
          type="submit"
          :loading="isSubmitting"
          label="Finish setup"
          icon="pi pi-check"
          class="mt-2! w-full! rounded-xl! sbg-stone-900! py-3.5! text-xs! font-bold! text-white! hover:bg-stone-800! active:scale-[0.99]!"
        />
      </form>
    </section>
  </main>
</template>
