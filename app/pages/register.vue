<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

const form = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  businessName: "",
  businessSlug: "",
});

const errors = reactive<Record<string, string>>({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  businessName: "",
  businessSlug: "",
});

const touched = reactive<Record<string, boolean>>({
  firstName: false,
  lastName: false,
  email: false,
  password: false,
  businessName: false,
  businessSlug: false,
});

const loading = ref(false);
const errorMessage = ref("");
const confirmationMessage = ref("");
const showPassword = ref(false);
const { supabase } = useSupabaseAuth();

// Auto-generate slug from business name if user hasn't edited slug manually
watch(
  () => form.businessName,
  (newName) => {
    if (!touched.businessSlug) {
      form.businessSlug = newName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }
  },
);

const validateField = (field: keyof typeof form) => {
  touched[field] = true;
  const val = form[field]?.trim() ?? "";

  if (!val) {
    errors[field] = "This field is required.";
    return false;
  }

  if (field === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      errors[field] = "Please enter a valid email address.";
      return false;
    }
  }

  if (field === "password" && val.length < 10) {
    errors[field] = "Password must be at least 10 characters.";
    return false;
  }

  if (field === "businessSlug") {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(val)) {
      errors[field] = "Use lowercase letters, numbers, and hyphens only.";
      return false;
    }
  }

  errors[field] = "";
  return true;
};

const validateAll = () => {
  let isValid = true;
  (Object.keys(form) as Array<keyof typeof form>).forEach((field) => {
    const fieldValid = validateField(field);
    if (!fieldValid) isValid = false;
  });
  return isValid;
};

const register = async () => {
  if (!validateAll()) return;

  loading.value = true;
  errorMessage.value = "";
  confirmationMessage.value = "";
  try {
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        // Send the confirmation link back to the app's callback page.
        emailRedirectTo: `${window.location.origin}/confirm`,
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          pending_business_name: form.businessName.trim(),
          pending_business_slug: form.businessSlug.trim(),
        },
      },
    });
    if (error) throw error;
    if (data.session) {
      // Provision the tenant workspace (user row, organization, OWNER
      // membership) with the verified Supabase session.
      try {
        await $fetch("/api/auth/bootstrap", {
          method: "POST",
          body: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            businessName: form.businessName.trim(),
            businessSlug: form.businessSlug.trim(),
          },
        });
      } catch (bootstrapError: any) {
        errorMessage.value =
          bootstrapError?.data?.statusMessage ??
          "Your account was created, but the business workspace could not be set up. Contact support so we can finish it for you.";
        return;
      }
      await navigateTo("/dashboard");
      return;
    }
    confirmationMessage.value =
      "Check your email to confirm your account, then sign in to finish setting up your business.";
  } catch (error: any) {
    errorMessage.value = error?.message ?? "Unable to create your account.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Navbar />
  <main
    class="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_80%_0%,#f8eee9_0,transparent_32rem),#fbfaf8] px-5 py-12"
  >
    <section
      class="surface w-full max-w-lg rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8"
    >
      <!-- Brand Header -->
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-stone-900"
      >
        <span
          class="grid size-8 place-items-center rounded-lg bg-ink text-sm font-black text-white shadow-sm"
        >
          R
        </span>
        <span>rantevou<span class="text-rose">OS</span></span>
      </NuxtLink>

      <!-- Section Title -->
      <div class="mt-8">
        <p
          class="eyebrow text-xs font-semibold uppercase tracking-wider text-rose"
        >
          Business setup
        </p>
        <h1
          class="mt-1 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl"
        >
          Create your Business account.
        </h1>
        <p class="mt-2 text-sm text-stone-500">
          You will become the owner of this business.
        </p>
      </div>

      <!-- Registration Form -->
      <form class="mt-7 space-y-4" novalidate @submit.prevent="register">
        <!-- Name Fields Row -->
        <div class="grid gap-4 sm:grid-cols-2">
          <!-- First Name -->
          <div class="space-y-1.5">
            <label
              for="first-name"
              class="block text-xs font-bold uppercase tracking-wider text-stone-600"
            >
              First name
            </label>
            <InputText
              id="first-name"
              v-model="form.firstName"
              autocomplete="given-name"
              :class="[
                'w-full !rounded-xl !border !px-3.5 !py-2.5 !text-stone-900 placeholder:!text-stone-400 focus:!outline-none',
                errors.firstName
                  ? '!border-rose-400 !bg-rose-50/20 focus:!border-rose-600 focus:!ring-1 focus:!ring-rose-600'
                  : '!border-stone-300 !bg-stone-50/50 focus:!border-stone-900 focus:!bg-white focus:!ring-1 focus:!ring-stone-900',
              ]"
              @blur="validateField('firstName')"
            />
            <p
              v-if="errors.firstName"
              class="text-xs font-medium text-rose-600"
            >
              {{ errors.firstName }}
            </p>
          </div>

          <!-- Last Name -->
          <div class="space-y-1.5">
            <label
              for="last-name"
              class="block text-xs font-bold uppercase tracking-wider text-stone-600"
            >
              Last name
            </label>
            <InputText
              id="last-name"
              v-model="form.lastName"
              autocomplete="family-name"
              :class="[
                'w-full !rounded-xl !border !px-3.5 !py-2.5 !text-stone-900 placeholder:!text-stone-400 focus:!outline-none',
                errors.lastName
                  ? '!border-rose-400 !bg-rose-50/20 focus:!border-rose-600 focus:!ring-1 focus:!ring-rose-600'
                  : '!border-stone-300 !bg-stone-50/50 focus:!border-stone-900 focus:!bg-white focus:!ring-1 focus:!ring-stone-900',
              ]"
              @blur="validateField('lastName')"
            />
            <p v-if="errors.lastName" class="text-xs font-medium text-rose-600">
              {{ errors.lastName }}
            </p>
          </div>
        </div>

        <!-- Email Field -->
        <div class="space-y-1.5">
          <label
            for="register-email"
            class="block text-xs font-bold uppercase tracking-wider text-stone-600"
          >
            Email address
          </label>
          <InputText
            id="register-email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            :class="[
              'w-full !rounded-xl !border !px-3.5 !py-2.5 !text-stone-900 placeholder:!text-stone-400 focus:!outline-none',
              errors.email
                ? '!border-rose-400 !bg-rose-50/20 focus:!border-rose-600 focus:!ring-1 focus:!ring-rose-600'
                : '!border-stone-300 !bg-stone-50/50 focus:!border-stone-900 focus:!bg-white focus:!ring-1 focus:!ring-stone-900',
            ]"
            @blur="validateField('email')"
          />
          <p v-if="errors.email" class="text-xs font-medium text-rose-600">
            {{ errors.email }}
          </p>
        </div>

        <!-- Password Field -->
        <div class="space-y-1.5">
          <label
            for="register-password"
            class="block text-xs font-bold uppercase tracking-wider text-stone-600"
          >
            Password
          </label>
          <div class="relative w-full">
            <input
              id="register-password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Use at least 10 characters"
              :class="[
                'w-full rounded-xl border px-3.5 py-2.5 pr-10 text-stone-900 placeholder-stone-400 focus:outline-none',
                errors.password
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-1 focus:ring-rose-600'
                  : 'border-stone-300 bg-stone-50/50 focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900',
              ]"
              @blur="validateField('password')"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 focus:outline-none"
              aria-label="Toggle password visibility"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="!showPassword"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <svg
                v-else
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            </button>
          </div>
          <p v-if="errors.password" class="text-xs font-medium text-rose-600">
            {{ errors.password }}
          </p>
        </div>

        <!-- Business Name -->
        <div class="space-y-1.5">
          <label
            for="business-name"
            class="block text-xs font-bold uppercase tracking-wider text-stone-600"
          >
            Business name
          </label>
          <InputText
            id="business-name"
            v-model="form.businessName"
            placeholder="Maria Beauty Studio"
            :class="[
              'w-full !rounded-xl !border !px-3.5 !py-2.5 !text-stone-900 placeholder:!text-stone-400 focus:!outline-none',
              errors.businessName
                ? '!border-rose-400 !bg-rose-50/20 focus:!border-rose-600 focus:!ring-1 focus:!ring-rose-600'
                : '!border-stone-300 !bg-stone-50/50 focus:!border-stone-900 focus:!bg-white focus:!ring-1 focus:!ring-stone-900',
            ]"
            @blur="validateField('businessName')"
          />
          <p
            v-if="errors.businessName"
            class="text-xs font-medium text-rose-600"
          >
            {{ errors.businessName }}
          </p>
        </div>

        <!-- Booking Slug -->
        <div class="space-y-1.5">
          <label
            for="business-slug"
            class="block text-xs font-bold uppercase tracking-wider text-stone-600"
          >
            Booking slug
          </label>
          <InputText
            id="business-slug"
            v-model="form.businessSlug"
            placeholder="maria-beauty-studio"
            :class="[
              'w-full !rounded-xl !border !px-3.5 !py-2.5 !text-stone-900 placeholder:!text-stone-400 focus:!outline-none',
              errors.businessSlug
                ? '!border-rose-400 !bg-rose-50/20 focus:!border-rose-600 focus:!ring-1 focus:!ring-rose-600'
                : '!border-stone-300 !bg-stone-50/50 focus:!border-stone-900 focus:!bg-white focus:!ring-1 focus:!ring-stone-900',
            ]"
            @blur="validateField('businessSlug')"
          />
          <p
            v-if="errors.businessSlug"
            class="text-xs font-medium text-rose-600"
          >
            {{ errors.businessSlug }}
          </p>
          <p v-else class="text-xs text-stone-400">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        <!-- Global API Error -->
        <div
          v-if="errorMessage"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
        >
          {{ errorMessage }}
        </div>
        <div
          v-if="confirmationMessage"
          class="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-700"
        >
          {{ confirmationMessage }}
        </div>

        <!-- Submit Button -->
        <Button
          type="submit"
          label="Create business"
          icon="pi pi-arrow-right"
          iconPos="right"
          severity="contrast"
          :loading="loading"
          class="!mt-7 !w-full !justify-center !rounded-xl !bg-stone-900 !py-3 !font-semibold !text-white hover:!bg-stone-800 transition-all active:scale-[0.99]"
        />
      </form>

      <!-- Footer Link -->
      <div
        class="mt-8 border-t border-stone-100 pt-6 text-center text-sm text-stone-500"
      >
        Already registered?
        <NuxtLink
          to="/login"
          class="font-semibold text-rose-600 hover:text-rose-700 hover:underline"
        >
          Sign in
        </NuxtLink>
      </div>
    </section>
  </main>
  <Footer />
</template>
