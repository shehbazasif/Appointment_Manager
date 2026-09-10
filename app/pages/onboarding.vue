<script setup lang="ts">
import { ref, reactive } from "vue";
import Button from "primevue/button";

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

const saved = ref(false);
const isSubmitting = ref(false);

const save = async () => {
  isSubmitting.value = true;
  setTimeout(() => {
    isSubmitting.value = false;
    saved.value = true;
  }, 800);
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

      <form class="mt-8 grid gap-6" @submit.prevent="save">
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
              class="w-full rounded-xl border border-stone-200/90 bg-white p-3 text-sm text-stone-400 outline-none transition-all placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <Button
          type="submit"
          :loading="isSubmitting"
          label="Finish setup"
          icon="pi pi-check"
          class="!mt-2 !w-full !rounded-xl !bg-stone-900 !py-3.5 !text-xs !font-bold !text-white hover:!bg-stone-800 active:!scale-[0.99]"
        />
      </form>
    </section>
  </main>
</template>
