<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import {
  House,
  CalendarCheck,
  CalendarDays,
  Users,
  UserCheck,
  Sparkles,
  Clock,
  Settings,
  Share2,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  ChevronLeft,
  Ellipsis,
  ScanLine,
} from "lucide-vue-next";
const { t } = useT();
useLocaleHead();

type MeResponse = {
  user: { id: string; email: string; firstName: string; lastName: string };
  organization: {
    id: string;
    name: string;
    slug: string;
    bookingActive: boolean;
    isBranch?: boolean;
    logoUrl?: string | null;
    city?: string;
    currency?: string;
    language?: string;
    themeColor?: string | null;
  } | null;
  role: string | null;
  isHeadOffice?: boolean;
  viewingBranch?: boolean;
  homeBusiness?: { id: string; name: string } | null;
};

const route = useRoute();
const { user, signOut } = useSupabaseAuth();
const me = ref<MeResponse | null>(null);
// business colour theme (Settings → Theme)
useBrandTheme(() => me.value?.organization?.themeColor);
const isLoading = ref(true);
const copied = ref(false);

// Sidebar: grouped like the design system's SidebarNav
const navGroups = [
  {
    label: "Main",
    items: [
      { name: "Home", to: "/dashboard", icon: House },
      { name: "Appointments", to: "/dashboard/appointments", icon: CalendarCheck },
      { name: "Calendar", to: "/dashboard/calendar", icon: CalendarDays },
      { name: "Customers", to: "/dashboard/customers", icon: Users },
    ],
  },
  {
    label: "Team",
    items: [
      { name: "Staff", to: "/dashboard/staff", icon: UserCheck },
      { name: "Attendance", to: "/dashboard/attendance", icon: ScanLine },
    ],
  },
  {
    label: "Business",
    items: [
      { name: "Services", to: "/dashboard/services", icon: Sparkles },
      { name: "Working Hours", to: "/dashboard/hours", icon: Clock },
      { name: "Share Booking Link", to: "/dashboard/managebookinglink", icon: Share2 },
      { name: "Settings", to: "/dashboard/settings", icon: Settings },
    ],
  },
];
const allNavItems = navGroups.flatMap((g) => g.items);
// Pages a business has no access to (admin switched the feature off) are hidden
const FEATURE_PAGES: Record<string, string> = { "/dashboard/attendance": "attendance" };
const navVisible = (item: { to: string }) => {
  // no online booking: no booking link to share
  if (item.to === "/dashboard/managebookinglink" && !me.value?.organization?.bookingActive) return false;
  const key = FEATURE_PAGES[item.to];
  return !key || me.value?.organization?.features?.[key as "attendance"] !== false;
};
const currentTitle = computed(() => {
  const hit = [...allNavItems].reverse().find((i) => isActive(i.to));
  return hit?.name ?? "Home";
});
const userName = computed(() =>
  user.value?.user_metadata?.first_name
    ? `${user.value.user_metadata.first_name} ${user.value?.user_metadata?.last_name ?? ""}`.trim()
    : (user.value?.email ?? t("User")),
);
const userInitials = computed(
  () =>
    userName.value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U",
);
const roleLabel = computed(() =>
  me.value?.role ? me.value.role.charAt(0).toUpperCase() + me.value.role.slice(1).toLowerCase() : "Owner",
);


// Phone-style bottom tabs: shown on small screens (Android app and phone browsers).
const moreOpen = ref(false);
const bottomTabs = [
  { name: "Home", to: "/dashboard", icon: House },
  { name: "Bookings", to: "/dashboard/appointments", icon: CalendarCheck },
  { name: "Calendar", to: "/dashboard/calendar", icon: CalendarDays },
  { name: "Customers", to: "/dashboard/customers", icon: Users },
];
const moreItems = [
  { name: "Staff", to: "/dashboard/staff", icon: UserCheck },
  { name: "Attendance", to: "/dashboard/attendance", icon: ScanLine },
  { name: "Services", to: "/dashboard/services", icon: Sparkles },
  { name: "Hours", to: "/dashboard/hours", icon: Clock },
  { name: "Share link", to: "/dashboard/managebookinglink", icon: Share2 },
  { name: "Settings", to: "/dashboard/settings", icon: Settings },
];
const isActive = (to: string) =>
  route.path === to || (to !== "/dashboard" && route.path.startsWith(to));
const isMoreActive = computed(() => moreItems.some((i) => isActive(i.to)));

// Branches (head office only): list for the "Working in" switcher
const branchList = ref<{ id: string; name: string }[]>([]);
const loadBranches = async () => {
  try {
    const r = await $fetch<{ head: { id: string; name: string }; branches: { id: string; name: string }[] }>("/api/branches");
    branchList.value = [r.head, ...r.branches];
  } catch {
    branchList.value = [];
  }
};
const switchTo = (id: string) => {
  if (!me.value?.homeBusiness) return;
  openBranch(id === me.value.homeBusiness.id ? null : id, route.path);
};

// 2-step login: the emailed code is still needed (also after going Back)
const needsLoginCode = ref(false);
// /api/me could not be reached (no internet, server down) — not "no business"
const meLoadFailed = ref(false);
watch(
  () => route.fullPath,
  () => {
    if (needsLoginCode.value) navigateTo("/verify-login", { replace: true });
  },
);
const loadMe = async () => {
  try {
    const res = await $fetch<MeResponse & { loginCodeRequired?: boolean }>("/api/me");
    // 2-step login: confirm the emailed code first (new device / 2 days away)
    if (res.loginCodeRequired) {
      needsLoginCode.value = true;
      await navigateTo("/verify-login", { replace: true });
      return;
    }
    needsLoginCode.value = false;
    meLoadFailed.value = false;
    me.value = res;
    // a branch choice the server did not accept is forgotten
    if (!res.viewingBranch && getSelectedBranch()) clearSelectedBranch();
    if (res.isHeadOffice) loadBranches();
    // show the dashboard in the business language (unless this person picked one)
    await applyLocale(me.value?.organization?.language);
  } catch (error: any) {
    if (error?.statusCode === 401) {
      await navigateTo("/login", { replace: true });
    } else {
      meLoadFailed.value = true;
    }
  } finally {
    isLoading.value = false;
  }
};

// Self-healing: if the user has no workspace yet (e.g. signup happened over
// email confirmation), provisioning happens here automatically.
// The platform admin account has no business: never create one for it
const isPlatformAdminLogin = computed(() => (user.value as any)?.app_metadata?.platform_role === "SUPER_ADMIN");
const ensureWorkspace = async () => {
  if (!me.value) await loadMe();
  if (me.value?.organization) return;
  if (meLoadFailed.value || needsLoginCode.value) return; // never create a business on a failed check
  // invited team member (signed up from an invitation): join that business
  const inviteToken = (user.value as any)?.user_metadata?.invite_token;
  if (inviteToken) {
    try {
      await $fetch("/api/team/accept", { method: "POST", body: { token: inviteToken } });
      await loadMe();
      if (me.value?.organization) return;
    } catch {
      // invitation no longer valid: fall through
    }
    if ((user.value as any)?.user_metadata?.invited) {
      await navigateTo("/join?token=" + encodeURIComponent(inviteToken), { replace: true });
      return;
    }
  }
  if (isPlatformAdminLogin.value) return;
  if (!me.value) return; // not loaded (e.g. sent to the login-code page)
  try {
    await $fetch("/api/auth/bootstrap", { method: "POST", body: {} });
    await loadMe();
  } catch (e: any) {
    // Signed up with Google: no business name yet -> ask for it
    if (e?.data?.data?.code === "MISSING_BUSINESS_DETAILS") await navigateTo("/welcome", { replace: true });
    // otherwise the banner offers a manual retry
  }
};

const retryBootstrap = async () => {
  try {
    await $fetch("/api/auth/bootstrap", { method: "POST", body: {} });
    await loadMe();
  } catch {
    // Banner stays visible
  }
};

onMounted(() => {
  ensureWorkspace();
});

const bookingUrl = computed(() => {
  if (!me.value?.organization?.slug) return "";
  if (import.meta.client) {
    return `${getSiteOrigin()}/book/${me.value.organization.slug}`;
  }
  return `/book/${me.value.organization.slug}`;
});

const copyBookingLink = async () => {
  if (!bookingUrl.value) return;
  try {
    await navigator.clipboard.writeText(bookingUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error("Failed to copy", e);
  }
};

const handleSignOut = async () => {
  await signOut();
  await navigateTo("/login");
};

// Back arrow (phones / home-screen app have no browser back button)
const router = useRouter();
const goBack = () => {
  if (import.meta.client && window.history.length > 1) router.back();
  else navigateTo("/dashboard");
};

// Hide the bottom tab bar while the on-screen keyboard is open (iOS Safari
// otherwise pushes/jumps fixed bars when an input is focused).
const keyboardOpen = ref(false);
const isTypingTarget = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t || !t.tagName) return false;
  if (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return true;
  if (t.tagName !== "INPUT") return false;
  const type = (t as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "file", "range", "color"].includes(type);
};
const onFocusIn = (e: FocusEvent) => {
  if (window.innerWidth < 1024 && isTypingTarget(e.target)) keyboardOpen.value = true;
};
const onFocusOut = () => {
  setTimeout(() => {
    keyboardOpen.value = isTypingTarget(document.activeElement) && window.innerWidth < 1024;
  }, 50);
};
onMounted(() => {
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
});
onBeforeUnmount(() => {
  document.removeEventListener("focusin", onFocusIn);
  document.removeEventListener("focusout", onFocusOut);
});
watch(
  () => route.fullPath,
  () => {
    moreOpen.value = false;
  },
);

// Provide tenant context to child pages
provide("businessProfile", me);
// Child pages can trigger a header refresh (e.g. after logo/email changes)
provide("refreshBusinessProfile", loadMe);
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-[#f5f7fa] text-[#111827] antialiased">
    <!-- Sidebar (desktop): design system SidebarNav -->
    <aside class="hidden w-[248px] shrink-0 flex-col border-e border-stone-200 bg-white lg:flex">
      <!-- Business -->
      <NuxtLink to="/dashboard" class="flex h-16 shrink-0 items-center gap-3 border-b border-stone-200 px-5">
        <img
          v-if="me?.organization?.logoUrl"
          :src="me.organization.logoUrl"
          :alt="me.organization.name"
          class="size-9 shrink-0 rounded-lg border border-stone-200 object-cover"
        />
        <span v-else class="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-600 text-white">
          <CalendarCheck :size="18" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-[15px] font-bold leading-5 text-stone-900">{{ me?.organization?.name ?? BRAND.name }}</span>
          <span v-if="me?.organization?.isBranch" class="flex items-center gap-1.5 text-xs text-stone-500">
            <span class="size-1.5 rounded-full bg-sky-500"></span>
            {{ t("Branch") }}
          </span>
          <span v-else class="flex items-center gap-1.5 text-xs text-stone-500">
            <span :class="['size-1.5 rounded-full', me?.organization?.bookingActive ? 'bg-emerald-500' : 'bg-amber-500']"></span>
            {{ me?.organization?.bookingActive ? t("Booking is live") : t("Booking paused") }}
          </span>
        </span>
      </NuxtLink>

      <nav class="min-h-0 flex-1 overflow-y-auto px-3 pb-4" :aria-label="t('Main menu')">
        <template v-for="group in navGroups" :key="group.label">
          <div class="ds-nav-group">{{ t(group.label) }}</div>
          <div class="grid gap-0.5">
            <NuxtLink
              v-for="item in group.items.filter(navVisible)"
              :key="item.to"
              :to="item.to"
              :class="['ds-nav-item', isActive(item.to) ? 'is-active' : '']"
              :aria-current="isActive(item.to) ? 'page' : undefined"
            >
              <component :is="item.icon" :size="18" />
              <span class="truncate">{{ t(item.name) }}</span>
            </NuxtLink>
          </div>
        </template>
      </nav>

      <!-- Signed-in person -->
      <div class="flex shrink-0 items-center gap-3 border-t border-stone-200 px-4 py-3">
        <span class="ds-avatar">{{ userInitials }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-stone-900">{{ userName }}</span>
          <span class="block text-xs text-stone-500">{{ t(roleLabel) }}</span>
        </span>
        <button
          type="button"
          class="ui-btn ui-btn-ghost ui-btn-icon"
          :title="t('Sign out')"
          :aria-label="t('Sign out')"
          @click="handleSignOut"
        >
          <LogOut :size="16" />
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Top bar -->
      <header
        class="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 lg:px-6"
        style="padding-top: env(safe-area-inset-top, 0px); min-height: calc(4rem + env(safe-area-inset-top, 0px))"
      >
        <div class="flex min-w-0 items-center gap-2">
          <!-- Phones: back arrow on inner pages -->
          <button
            v-if="route.path !== '/dashboard'"
            type="button"
            class="flex size-11 shrink-0 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100 lg:hidden"
            :aria-label="t('Back')"
            @click="goBack"
          >
            <ChevronLeft :size="24" />
          </button>
          <!-- Phones: business mark + name -->
          <NuxtLink to="/dashboard" class="flex min-w-0 items-center gap-2.5 lg:hidden">
            <img
              v-if="me?.organization?.logoUrl"
              :src="me.organization.logoUrl"
              :alt="me.organization.name"
              class="size-9 shrink-0 rounded-lg border border-stone-200 object-cover"
            />
            <span v-else class="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-600 text-white">
              <CalendarCheck :size="18" />
            </span>
            <span class="truncate text-base font-bold text-stone-900">{{ me?.organization?.name ?? BRAND.name }}</span>
          </NuxtLink>
          <!-- Desktop: where you are -->
          <div class="hidden min-w-0 items-center gap-2 text-sm lg:flex">
            <span class="truncate text-stone-500">{{ me?.organization?.name ?? BRAND.name }}</span>
            <span class="text-stone-300">/</span>
            <span class="truncate font-semibold text-stone-900">{{ t(currentTitle) }}</span>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <template v-if="me?.organization?.slug && me.organization.bookingActive">
            <button
              type="button"
              class="ui-btn ui-btn-secondary"
              :class="copied ? '!border-emerald-300 !bg-emerald-50 !text-emerald-700' : ''"
              :title="bookingUrl"
              :aria-label="copied ? t('Copied!') : t('Copy booking link')"
              @click="copyBookingLink"
            >
              <Check v-if="copied" :size="16" />
              <Copy v-else :size="16" />
              <span class="hidden sm:inline">{{ copied ? t("Copied!") : t("Copy booking link") }}</span>
            </button>
            <span class="hidden sm:inline-flex">
              <NuxtLink
                :to="`/book/${me.organization.slug}`"
                target="_blank"
                class="ui-btn ui-btn-secondary ui-btn-icon"
                :title="t('Preview')"
                :aria-label="t('Preview')"
              >
                <ExternalLink :size="16" />
              </NuxtLink>
            </span>
          </template>
          <LanguageSwitcher compact :business-language="me?.organization?.language ?? null" />
        </div>
      </header>

      <!-- Head office: which branch you are working in (branches never see this) -->
      <div
        v-if="me?.isHeadOffice && branchList.length > 1"
        :class="[
          'flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 text-[13px] lg:px-6',
          me.viewingBranch ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-stone-200 bg-white text-stone-600',
        ]"
      >
        <span class="font-medium">{{ t("Working in") }}</span>
        <AppSelect :model-value="me.organization?.id" class="w-full max-w-xs sm:w-72" @update:model-value="switchTo">
          <option v-for="b in branchList" :key="b.id" :value="b.id">{{ b.name }}</option>
        </AppSelect>
        <button
          v-if="me.viewingBranch && me.homeBusiness"
          type="button"
          class="ui-btn ui-btn-sm ui-btn-secondary"
          @click="openBranch(null)"
        >
          {{ t("Back to head office") }}
        </button>
      </div>

      <!-- Signed in with the platform admin account (it has no business) -->
      <div
        v-if="!isLoading && !me?.organization && isPlatformAdminLogin"
        class="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900"
      >
        <span>You are signed in with the <b>platform admin</b> account, which has no business. Sign out and sign in with a business account, or open the admin panel.</span>
        <span class="flex gap-2">
          <NuxtLink to="/admin" class="ui-btn ui-btn-sm ui-btn-secondary">Admin panel</NuxtLink>
          <button type="button" class="ui-btn ui-btn-sm ui-btn-primary" @click="handleSignOut">Sign out</button>
        </span>
      </div>

      <!-- Code from the email still needed -->
      <div
        v-else-if="needsLoginCode"
        class="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900"
      >
        <span>{{ t("Confirm the code we emailed you to open your business.") }}</span>
        <NuxtLink to="/verify-login" class="ui-btn ui-btn-sm ui-btn-primary">{{ t("Enter code") }}</NuxtLink>
      </div>

      <!-- Could not reach the server -->
      <div
        v-else-if="meLoadFailed"
        class="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800"
      >
        <span>{{ t("Could not reach the server. Check your internet connection.") }}</span>
        <button type="button" class="ui-btn ui-btn-sm ui-btn-secondary" @click="loadMe">{{ t("Retry") }}</button>
      </div>

      <!-- Workspace pending banner -->
      <div
        v-else-if="!isLoading && !me?.organization"
        class="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800"
      >
        <div class="flex items-center gap-2">
          <span class="inline-flex size-2 animate-pulse rounded-full bg-amber-500"></span>
          <span>{{ t("Your business workspace is being set up. Retrying automatically...") }}</span>
        </div>
        <button type="button" class="ms-4 shrink-0 font-semibold text-amber-900 underline" @click="retryBootstrap">
          {{ t("Retry now") }}
        </button>
      </div>

      <!-- Page content (the only scrolling region) -->
      <main class="dash-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 sm:py-6">
          <slot />
        </div>
      </main>

      <!-- Phones: "More" sheet -->
      <div v-if="moreOpen" class="fixed inset-0 z-40 bg-stone-900/40 lg:hidden" @click="moreOpen = false"></div>
      <div
        v-if="moreOpen"
        class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-stone-200 bg-white px-4 pt-3 shadow-2xl lg:hidden"
        style="padding-bottom: calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 5.5rem)"
      >
        <div class="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-200"></div>
        <div class="grid grid-cols-3 gap-2">
          <NuxtLink
            v-for="item in moreItems.filter(navVisible)"
            :key="item.to"
            :to="item.to"
            :class="[
              isActive(item.to) ? 'bg-rose-50 text-rose-700' : 'bg-stone-50 text-stone-700',
              'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3.5 text-xs font-semibold',
            ]"
            @click="moreOpen = false"
          >
            <component :is="item.icon" :size="22" />
            <span>{{ t(item.name) }}</span>
          </NuxtLink>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button v-if="me?.organization?.bookingActive" type="button" class="ui-btn ui-btn-secondary w-full" @click="copyBookingLink">
            <Check v-if="copied" :size="16" class="text-emerald-600" />
            <Copy v-else :size="16" />
            <span>{{ copied ? t("Copied!") : t("Copy booking link") }}</span>
          </button>
          <button type="button" :class="['ui-btn ui-btn-secondary w-full !text-red-700', me?.organization?.bookingActive ? '' : 'col-span-2']" @click="handleSignOut">
            <LogOut :size="16" />
            <span>{{ t("Sign out") }}</span>
          </button>
        </div>
      </div>

      <!-- Phones: bottom tab bar -->
      <nav
        v-show="!keyboardOpen"
        class="relative z-50 shrink-0 border-t border-stone-200 bg-white lg:hidden"
        style="padding-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))"
      >
        <div class="grid grid-cols-5">
          <NuxtLink
            v-for="tab in bottomTabs"
            :key="tab.to"
            :to="tab.to"
            :aria-current="isActive(tab.to) && !moreOpen ? 'page' : undefined"
            :class="[
              isActive(tab.to) && !moreOpen ? 'text-rose-700' : 'text-stone-500',
              'tab-item relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold',
            ]"
            @click="moreOpen = false"
          >
            <span
              :class="[
                isActive(tab.to) && !moreOpen ? 'bg-rose-50' : '',
                'flex h-7 w-12 items-center justify-center rounded-full transition',
              ]"
            >
              <component :is="tab.icon" :size="21" />
            </span>
            <span>{{ t(tab.name) }}</span>
          </NuxtLink>
          <button
            type="button"
            :aria-expanded="moreOpen"
            :class="[
              moreOpen || isMoreActive ? 'text-rose-700' : 'text-stone-500',
              'tab-item relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold',
            ]"
            @click="moreOpen = !moreOpen"
          >
            <span
              :class="[
                moreOpen || isMoreActive ? 'bg-rose-50' : '',
                'flex h-7 w-12 items-center justify-center rounded-full transition',
              ]"
            >
              <Ellipsis :size="21" />
            </span>
            <span>{{ t("More") }}</span>
          </button>
        </div>
      </nav>
    </div>
  </div>
</template>
