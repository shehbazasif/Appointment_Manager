<script setup lang="ts">
// First visit for someone who signed up with Google (no business yet):
// name the business and pick its type, then the workspace is created.
import { Loader2, AlertCircle, Check } from "lucide-vue-next";
import { BUSINESS_TYPES, businessTypeOf, type BusinessType } from "~/utils/businessTypes";

definePageMeta({ layout: false });
const { t } = useT();
useLocaleHead();
useHead({ title: () => t("Welcome") });
useBrandTheme(() => null);

const { supabase, user, signOut } = useSupabaseAuth();
const businessName = ref("");
const businessType = ref<BusinessType>("general");
const saving = ref(false);
const error = ref("");

const meta = computed(() => (user.value?.user_metadata ?? {}) as Record<string, any>);
const displayName = computed(() => String(meta.value.full_name || meta.value.name || "").trim());

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return navigateTo("/login", { replace: true });
  try {
    const me = await $fetch<{ organization: unknown; loginCodeRequired?: boolean }>("/api/me");
    if (me.loginCodeRequired) return navigateTo("/verify-login", { replace: true });
    if (me.organization) return navigateTo("/dashboard", { replace: true }); // already set up
  } catch {}
});

const create = async () => {
  error.value = "";
  if (businessName.value.trim().length < 2) {
    error.value = t("Enter your business name.");
    return;
  }
  saving.value = true;
  try {
    const [first, ...rest] = displayName.value.split(/\s+/).filter(Boolean);
    await $fetch("/api/auth/bootstrap", {
      method: "POST",
      body: {
        businessName: businessName.value.trim(),
        ...(first ? { firstName: first } : {}),
        ...(rest.length ? { lastName: rest.join(" ") } : {}),
      },
    });
    // apply the chosen type's recommended settings
    const p = businessTypeOf(businessType.value).settings;
    await $fetch("/api/organization", {
      method: "PATCH",
      body: {
        businessType: businessType.value,
        tokensEnabled: p.tokensEnabled,
        showTokenToCustomer: p.showTokenToCustomer,
        onLocationEnabled: p.onLocationEnabled,
        slotStepMinutes: p.slotStepMinutes,
      },
    }).catch(() => null); // the business exists; settings can be changed later
    await navigateTo("/dashboard", { replace: true });
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? t("Could not create your business. Please try again.");
  } finally {
    saving.value = false;
  }
};

const useOtherAccount = async () => {
  await signOut();
  await navigateTo("/login");
};
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-[#f5f7fa] px-4 py-10 text-[#111827]">
    <section class="ds-card w-full max-w-xl p-6 sm:p-8">
      <h1 class="text-xl font-bold">{{ displayName ? t("Welcome, {name}!", { name: displayName.split(" ")[0] }) : t("Welcome!") }}</h1>
      <p class="mt-1 text-[13px] text-stone-600">{{ t("Two quick questions and your booking page is ready.") }}</p>

      <form class="mt-6 space-y-5" @submit.prevent="create">
        <div>
          <label for="welcome-name" class="ds-label">{{ t("Business name") }}</label>
          <input
            id="welcome-name"
            v-model="businessName"
            type="text"
            maxlength="120"
            :placeholder="t('e.g. Little Stars Children Clinic')"
            class="w-full px-3"
            required
          />
          <p class="ds-help">{{ t("Customers see this on your booking page. You can change it later.") }}</p>
        </div>

        <div>
          <div class="ds-label">{{ t("What kind of business is it?") }}</div>
          <div class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="b in BUSINESS_TYPES"
              :key="b.id"
              type="button"
              class="rounded-lg border p-3 text-start transition"
              :class="businessType === b.id ? 'border-rose-600 bg-rose-50 ring-1 ring-rose-600' : 'border-stone-200 hover:border-stone-300'"
              :aria-pressed="businessType === b.id"
              @click="businessType = b.id"
            >
              <span class="flex items-center justify-between gap-2 text-sm font-semibold text-stone-900">
                {{ t(b.name) }}
                <Check v-if="businessType === b.id" :size="16" class="text-rose-600" />
              </span>
              <span class="mt-0.5 block text-xs text-stone-500">{{ t(b.description) }}</span>
            </button>
          </div>
        </div>

        <p v-if="error" class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          <AlertCircle :size="16" class="mt-0.5 shrink-0" /><span>{{ error }}</span>
        </p>
        <button type="submit" class="ui-btn ui-btn-primary w-full" :disabled="saving">
          <Loader2 v-if="saving" :size="16" class="animate-spin" />
          <span>{{ t("Create my business") }}</span>
        </button>
      </form>

      <div class="mt-6 border-t border-stone-200 pt-4 text-center text-[13px] text-stone-500">
        {{ t("Signed in as {email}.", { email: user?.email ?? "" }) }}
        <button type="button" class="font-medium text-stone-700 hover:text-stone-900 hover:underline" @click="useOtherAccount">
          {{ t("Use a different account") }}
        </button>
      </div>
    </section>
  </main>
</template>
