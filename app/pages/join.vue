<script setup lang="ts">
// Invitation link: join a business (or branch) as a team member.
import { Loader2, AlertCircle, Users, Eye, EyeOff, MailCheck } from "lucide-vue-next";

definePageMeta({ layout: false });
const { t } = useT();
useLocaleHead();
useHead({ title: () => t("Join the team"), meta: [{ name: "robots", content: "noindex" }] });
useBrandTheme(() => null);

const route = useRoute();
const { supabase, signOut } = useSupabaseAuth();
const token = computed(() => String(route.query.token ?? ""));

const state = ref<"loading" | "invalid" | "signup" | "join" | "check-email">("loading");
const preview = ref<{ businessName: string; email: string; valid: boolean; accepted: boolean; hasAccount?: boolean } | null>(null);
const sessionEmail = ref("");
const error = ref("");
const busy = ref(false);

const name = ref("");
const password = ref("");
const showPassword = ref(false);
const mode = ref<"create" | "signin">("create");
/** the account already exists (e.g. back from the confirmation email): just sign in */
const accountReady = ref(false);

const decide = async () => {
  const { data } = await supabase.auth.getSession();
  sessionEmail.value = data.session?.user?.email ?? "";
  state.value = sessionEmail.value ? "join" : "signup";
};

onMounted(async () => {
  if (!token.value) {
    state.value = "invalid";
    return;
  }
  try {
    preview.value = await $fetch("/api/team/preview", { query: { token: token.value } });
    if (!preview.value?.valid) {
      setPendingInvite(null);
      state.value = "invalid";
      return;
    }
    setPendingInvite({ token: token.value, business: preview.value.businessName, email: preview.value.email });
  } catch {
    state.value = "invalid";
    return;
  }
  // coming back from the confirmation email (?code=…): open the session first
  const fromEmail = !!(route.query.code || route.query.token_hash || route.query.error || route.query.error_description);
  if (String(route.query.code ?? "")) await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => null);
  await decide();
  // The account was already made (the email link opened in another browser,
  // e.g. inside Gmail): show "sign in", not "create account" again.
  if (state.value === "signup" && (preview.value?.hasAccount || preview.value?.accepted || fromEmail)) {
    mode.value = "signin";
    accountReady.value = true;
  }
});

const join = async () => {
  busy.value = true;
  error.value = "";
  try {
    const r = await $fetch<{ businessId?: string }>("/api/team/accept", {
      method: "POST",
      body: { token: token.value, name: name.value.trim() || undefined },
    });
    // open the invited business (the person may also have a business of their own)
    rememberBusiness(r?.businessId ?? null);
    setPendingInvite(null);
    await navigateTo("/dashboard", { replace: true });
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? t("Could not join. Please try again.");
  } finally {
    busy.value = false;
  }
};

const createAccount = async () => {
  error.value = "";
  if (password.value.length < 8) {
    error.value = t("Choose a password with at least 8 characters.");
    return;
  }
  busy.value = true;
  try {
    const [first, ...rest] = name.value.trim().split(/\s+/).filter(Boolean);
    const { data, error: e } = await supabase.auth.signUp({
      email: preview.value!.email,
      password: password.value,
      options: {
        // the confirmation email brings them back here to finish joining
        emailRedirectTo: `${getSiteOrigin()}/join?token=${encodeURIComponent(token.value)}`,
        // the invite travels with the account: whichever page the confirmation
        // link opens, the dashboard finishes joining instead of creating a business
        data: { first_name: first ?? "", last_name: rest.join(" "), invited: true, invite_token: token.value },
      },
    });
    if (e) throw e;
    if (data.session) await join();
    else state.value = "check-email";
  } catch (e: any) {
    error.value = /registered|already/i.test(e?.message ?? "")
      ? t("This email already has an account. Sign in instead.")
      : (e?.message ?? t("Could not create the account."));
    if (/registered|already/i.test(e?.message ?? "")) mode.value = "signin";
  } finally {
    busy.value = false;
  }
};

const signIn = async () => {
  error.value = "";
  busy.value = true;
  try {
    const { error: e } = await supabase.auth.signInWithPassword({ email: preview.value!.email, password: password.value });
    if (e) throw e;
    await join();
  } catch (e: any) {
    error.value = e?.message === "Invalid login credentials" ? t("Wrong password.") : (e?.message ?? t("Could not sign in."));
  } finally {
    busy.value = false;
  }
};

const switchAccount = async () => {
  await signOut();
  // this tab is still accepting the invitation
  if (preview.value) setPendingInvite({ token: token.value, business: preview.value.businessName, email: preview.value.email });
  await decide();
  // the invited email already has an account: go straight to "sign in"
  if (preview.value?.hasAccount) {
    mode.value = "signin";
    accountReady.value = true;
  }
};
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-[#f5f7fa] px-4 py-10 text-[#111827]">
    <section class="ds-card w-full max-w-sm p-6 sm:p-8">
      <div v-if="state === 'loading'" class="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 :size="18" class="animate-spin" /> {{ t("Checking your invitation…") }}
      </div>

      <div v-else-if="state === 'invalid'" class="text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-700"><AlertCircle :size="22" /></span>
        <h1 class="mt-3 text-lg font-bold">{{ t("This invitation is not valid") }}</h1>
        <p class="mt-1 text-[13px] text-stone-600">{{ t("It may have expired or been cancelled. Ask for a new invitation.") }}</p>
      </div>

      <div v-else-if="state === 'check-email'" class="text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><MailCheck :size="22" /></span>
        <h1 class="mt-3 text-lg font-bold">{{ t("Check your email") }}</h1>
        <p class="mt-1 text-[13px] text-stone-600">{{ t("We sent a confirmation link to {email}. Open it to finish joining {business}.", { email: preview?.email ?? "", business: preview?.businessName ?? "" }) }}</p>
      </div>

      <template v-else>
        <span class="grid size-11 place-items-center rounded-lg bg-rose-50 text-rose-700"><Users :size="22" /></span>
        <h1 class="mt-4 text-xl font-bold">{{ t("Join {business}", { business: preview?.businessName ?? "" }) }}</h1>
        <p class="mt-1 text-[13px] text-stone-600">{{ t("You were invited as {email}.", { email: preview?.email ?? "" }) }}</p>

        <!-- already signed in -->
        <div v-if="state === 'join'" class="mt-6 space-y-3">
          <p v-if="sessionEmail.toLowerCase() !== (preview?.email ?? '').toLowerCase()" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
            {{ t("You are signed in as {email}. Sign in with the invited email to join.", { email: sessionEmail }) }}
          </p>
          <button
            v-if="sessionEmail.toLowerCase() === (preview?.email ?? '').toLowerCase()"
            type="button"
            class="ui-btn ui-btn-primary w-full"
            :disabled="busy"
            @click="join"
          >
            <Loader2 v-if="busy" :size="16" class="animate-spin" />
            <span>{{ t("Join {business}", { business: preview?.businessName ?? "" }) }}</span>
          </button>
          <button type="button" class="ui-btn ui-btn-ghost w-full" @click="switchAccount">{{ t("Use a different account") }}</button>
        </div>

        <!-- not signed in -->
        <form v-else class="mt-6 space-y-3" @submit.prevent="mode === 'create' ? createAccount() : signIn()">
          <p v-if="accountReady && mode === 'signin'" class="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-900">
            <MailCheck :size="16" class="mt-0.5 shrink-0" />
            <span>{{ t("Your account is ready. Sign in with the password you chose to open {business}.", { business: preview?.businessName ?? "" }) }}</span>
          </p>
          <div v-if="mode === 'create'">
            <label for="join-name" class="ds-label">{{ t("Your name") }}</label>
            <input id="join-name" v-model="name" type="text" autocomplete="name" class="w-full px-3" />
          </div>
          <div>
            <label for="join-email" class="ds-label">{{ t("Email") }}</label>
            <input id="join-email" :value="preview?.email" type="email" readonly class="w-full bg-stone-50 px-3" />
          </div>
          <div>
            <label for="join-password" class="ds-label">{{ mode === "create" ? t("Choose a password") : t("Password") }}</label>
            <div class="relative">
              <input
                id="join-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="mode === 'create' ? 'new-password' : 'current-password'"
                required
                class="w-full ps-3 pe-11"
              />
              <button
                type="button"
                class="absolute end-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-stone-500"
                :aria-label="showPassword ? t('Hide password') : t('Show password')"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="16" /><Eye v-else :size="16" />
              </button>
            </div>
          </div>
          <p v-if="error" class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
            <AlertCircle :size="16" class="mt-0.5 shrink-0" /><span>{{ error }}</span>
          </p>
          <button type="submit" class="ui-btn ui-btn-primary w-full" :disabled="busy">
            <Loader2 v-if="busy" :size="16" class="animate-spin" />
            <span>{{ mode === "create" ? t("Create account and join") : t("Sign in and join") }}</span>
          </button>
          <NuxtLink v-if="mode === 'signin'" to="/forgot-password" class="block text-center text-[13px] font-medium text-rose-700">{{ t("Forgot password?") }}</NuxtLink>
          <button v-if="!accountReady" type="button" class="ui-btn ui-btn-ghost w-full" @click="mode = mode === 'create' ? 'signin' : 'create'; error = ''">
            {{ mode === "create" ? t("I already have an account") : t("Create a new account") }}
          </button>
        </form>
      </template>
    </section>
  </main>
</template>
