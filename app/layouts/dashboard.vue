<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import {
  LayoutDashboard,
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
  Menu,
  X,
  Building2,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Ellipsis,
  ScanLine,
} from "lucide-vue-next";

type MeResponse = {
  user: { id: string; email: string; firstName: string; lastName: string };
  organization: {
    id: string;
    name: string;
    slug: string;
    bookingActive: boolean;
    logoUrl?: string | null;
    city?: string;
    currency?: string;
  } | null;
  role: string | null;
};

const route = useRoute();
const { user, signOut } = useSupabaseAuth();
const me = ref<MeResponse | null>(null);
const isLoading = ref(true);
const mobileMenuOpen = ref(false);
const copied = ref(false);

const navItems = [
  { name: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { name: "Appointments", to: "/dashboard/appointments", icon: CalendarCheck },
  { name: "Calendar", to: "/dashboard/calendar", icon: CalendarDays },
  { name: "Customers", to: "/dashboard/customers", icon: Users },
  { name: "Staff", to: "/dashboard/staff", icon: UserCheck },
  { name: "Attendance", to: "/dashboard/attendance", icon: ScanLine },
  { name: "Services", to: "/dashboard/services", icon: Sparkles },
  { name: "Working Hours", to: "/dashboard/hours", icon: Clock },
  { name: "Share Booking Link", to: "/dashboard/managebookinglink", icon: Share2 },
];

const settingsLink = "/dashboard/settings";

// Phone-style bottom tabs: shown on small screens (Android app and phone browsers).
const moreOpen = ref(false);
const bottomTabs = [
  { name: "Home", to: "/dashboard", icon: LayoutDashboard },
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

const loadMe = async () => {
  try {
    me.value = await $fetch<MeResponse>("/api/me");
  } catch (error: any) {
    if (error?.statusCode === 401) {
      await navigateTo("/login", { replace: true });
    }
  } finally {
    isLoading.value = false;
  }
};

// Self-healing: if the user has no workspace yet (e.g. signup happened over
// email confirmation), provisioning happens here automatically.
const ensureWorkspace = async () => {
  if (!me.value) await loadMe();
  if (me.value?.organization) return;
  try {
    await $fetch("/api/auth/bootstrap", { method: "POST", body: {} });
    await loadMe();
  } catch {
    // Banner offers a manual retry
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
  <div
    class="h-dvh overflow-hidden bg-[#faf9f6] text-[#24262d] flex flex-col antialiased"
  >
    <!-- Top Bar for Mobile & Desktop -->
    <header
      class="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-4 backdrop-blur-md lg:px-8"
      style="padding-top: env(safe-area-inset-top, 0px); min-height: calc(4rem + env(safe-area-inset-top, 0px))"
    >
      <div class="flex min-w-0 items-center gap-2 sm:gap-3">
        <!-- Phones / home-screen app: visible way back on inner pages -->
        <button
          v-if="route.path !== '/dashboard'"
          type="button"
          class="flex size-11 shrink-0 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 lg:hidden"
          aria-label="Back"
          @click="goBack"
        >
          <ChevronLeft :size="24" />
        </button>
        <!-- Old hamburger menu: replaced by the bottom tab bar's "More" sheet -->
        <button
          type="button"
          class="hidden size-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <Menu v-if="!mobileMenuOpen" :size="20" />
          <X v-else :size="20" />
        </button>

        <NuxtLink to="/dashboard" class="flex min-w-0 items-center gap-2.5">
          <!-- Business logo when set, platform mark otherwise -->
          <img
            v-if="me?.organization?.logoUrl"
            :src="me.organization.logoUrl"
            :alt="me.organization.name"
            class="size-9 shrink-0 rounded-xl object-cover border border-stone-200 shadow-sm"
          />
          <div
            v-else
            class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#24262d] to-[#40434f] text-white shadow-sm"
          >
            <CalendarCheck :size="20" />
          </div>
          <div class="min-w-0">
            <span
              class="font-display text-lg font-bold tracking-tight text-stone-900 block leading-none truncate"
            >
              {{ me?.organization?.name ?? BRAND.name }}
            </span>
            <span
              class="text-[10px] font-semibold text-rose-600 uppercase tracking-wider block mt-0.5 truncate"
            >
              {{
                me?.organization?.slug
                  ? `/book/${me.organization.slug}`
                  : "Studio Hub"
              }}
            </span>
          </div>
        </NuxtLink>

        <!-- Business Name Tag -->
        <div
          v-if="me?.organization"
          class="hidden items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs sm:flex ml-4"
        >
          <span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="font-semibold text-stone-800">{{
            me.organization.name
          }}</span>
        </div>
      </div>

      <!-- Header Actions -->
      <div class="flex items-center gap-2.5">
        <!-- Public Booking Link Controls -->
        <div
          v-if="me?.organization?.slug"
          class="hidden sm:flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/80 p-1"
        >
          <button
            type="button"
            @click="copyBookingLink"
            class="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-2xs border border-stone-200/60 hover:bg-stone-50 hover:text-stone-900 transition"
            :title="bookingUrl"
          >
            <Check v-if="copied" :size="13" class="text-emerald-600" />
            <Copy v-else :size="13" class="text-stone-400" />
            <span>{{ copied ? "Copied!" : "Copy booking link" }}</span>
          </button>

          <NuxtLink
            :to="`/book/${me.organization.slug}`"
            target="_blank"
            class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 transition"
          >
            <ExternalLink :size="13" />
            <span>Preview</span>
          </NuxtLink>
        </div>

        <!-- User Profile & Sign Out -->
        <div class="flex items-center gap-2 pl-2 border-l border-stone-200">
          <div class="hidden text-right text-xs md:block">
            <div class="font-semibold text-stone-900">
              {{
                user?.user_metadata?.first_name
                  ? `${user.user_metadata.first_name} ${user?.user_metadata?.last_name ?? ""}`
                  : (user?.email ?? "User")
              }}
            </div>
            <div class="text-[10px] text-stone-400 uppercase tracking-wider">
              {{ me?.role ?? "Owner" }}
            </div>
          </div>
          <button
            type="button"
            @click="handleSignOut"
            class="hidden lg:flex size-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 transition"
            title="Sign out"
          >
            <LogOut :size="16" />
          </button>
        </div>
      </div>
    </header>

    <!-- Workspace Pending Banner (bootstrap failed or pending email confirmation) -->
    <div
      v-if="!isLoading && !me?.organization"
      class="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between backdrop-blur-sm"
    >
      <div class="flex items-center gap-2">
        <span
          class="inline-flex size-2 rounded-full bg-amber-500 animate-pulse"
        ></span>
        <span
          >Your business workspace is being set up. Retrying
          automatically...</span
        >
      </div>
      <button
        type="button"
        class="font-semibold text-amber-900 underline hover:text-amber-950 ml-4 shrink-0"
        @click="retryBootstrap"
      >
        Retry now
      </button>
    </div>

    <div class="flex flex-1 min-h-0">
      <!-- Sidebar Desktop -->
      <aside
        class="hidden w-64 shrink-0 flex-col justify-between border-r border-stone-200 bg-white p-4 lg:flex min-h-0 overflow-y-auto"
      >
        <div class="flex flex-col min-h-0">
          <nav class="space-y-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              :class="[
                route.path === item.to ||
                (item.to !== '/dashboard' && route.path.startsWith(item.to))
                  ? 'bg-stone-900 text-white shadow-sm font-semibold'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-medium',
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition',
              ]"
            >
              <component :is="item.icon" :size="18" />
              <span>{{ item.name }}</span>
            </NuxtLink>
          </nav>

          <!-- Pinned Settings shortcut (bottom of the nav group) -->
          <div class="mt-auto pt-4">
            <NuxtLink
              :to="settingsLink"
              :class="[
                route.path === settingsLink
                  ? 'bg-stone-900 text-white shadow-sm font-semibold'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-medium',
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition border-t border-stone-100',
              ]"
            >
              <Settings :size="18" />
              <span>Settings</span>
              <ChevronRight
                :size="14"
                class="ml-auto opacity-50"
              />
            </NuxtLink>
          </div>
        </div>

        <!-- Sidebar Footer -->
        <div
          class="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 text-xs mt-4"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold text-stone-800">Booking status</span>
            <span
              :class="[
                me?.organization?.bookingActive
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200',
                'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              ]"
            >
              {{ me?.organization?.bookingActive ? "Live" : "Paused" }}
            </span>
          </div>
          <p class="mt-2 text-stone-500 text-[11px] leading-relaxed">
            Customers can book appointments directly via your public link.
          </p>
          <NuxtLink
            :to="settingsLink"
            class="mt-3 block text-center rounded-lg bg-white border border-stone-200 py-1.5 font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
          >
            Settings
          </NuxtLink>
        </div>
      </aside>

      <!-- Mobile Navigation Drawer -->
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden"
        @click="mobileMenuOpen = false"
      ></div>

      <aside
        v-if="mobileMenuOpen"
        class="fixed inset-y-0 left-0 z-50 w-72 flex-col justify-between border-r border-stone-200 bg-white p-5 shadow-2xl flex lg:hidden"
      >
        <div class="space-y-6 flex flex-col min-h-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <img
                v-if="me?.organization?.logoUrl"
                :src="me.organization.logoUrl"
                :alt="me.organization.name"
                class="size-8 rounded-xl object-cover border border-stone-200"
              />
              <div
                v-else
                class="flex size-8 items-center justify-center rounded-xl bg-stone-900 text-white"
              >
                <CalendarCheck :size="18" />
              </div>
              <span class="font-display font-bold text-stone-900 text-lg">
                {{ me?.organization?.name ?? BRAND.name }}
              </span>
            </div>
            <button
              type="button"
              class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"
              @click="mobileMenuOpen = false"
            >
              <X :size="20" />
            </button>
          </div>

          <nav class="space-y-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              @click="mobileMenuOpen = false"
              :class="[
                route.path === item.to ||
                (item.to !== '/dashboard' && route.path.startsWith(item.to))
                  ? 'bg-stone-900 text-white shadow-sm font-semibold'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-medium',
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition',
              ]"
            >
              <component :is="item.icon" :size="18" />
              <span>{{ item.name }}</span>
            </NuxtLink>

            <!-- Settings pinned at the bottom of the mobile drawer -->
            <NuxtLink
              :to="settingsLink"
              @click="mobileMenuOpen = false"
              :class="[
                route.path === settingsLink
                  ? 'bg-stone-900 text-white shadow-sm font-semibold'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-medium',
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition mt-2 border-t border-stone-100 pt-4',
              ]"
            >
              <Settings :size="18" />
              <span>Settings</span>
            </NuxtLink>
          </nav>
        </div>

        <div class="space-y-3 pt-6 border-t border-stone-100">
          <button
            type="button"
            @click="copyBookingLink"
            class="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-semibold text-stone-700"
          >
            <Copy :size="14" />
            <span>{{
              copied ? "Copied Booking Link!" : "Copy Booking Link"
            }}</span>
          </button>
          <button
            type="button"
            @click="handleSignOut"
            class="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-100 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <LogOut :size="14" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area (the only scrolling region) -->
      <main
        class="dash-main flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-5 pb-10 sm:px-6 sm:py-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <slot />
      </main>
    </div>

    <!-- Phone layout: bottom tab bar + "More" sheet (hidden on desktop) -->
      <div
        v-if="moreOpen"
        class="fixed inset-0 z-40 bg-stone-900/40 lg:hidden"
        @click="moreOpen = false"
      ></div>

      <div
        v-if="moreOpen"
        class="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-stone-200 bg-white px-4 pt-3 shadow-2xl lg:hidden"
        style="padding-bottom: calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 5.5rem)"
      >
        <div class="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-200"></div>
        <div class="grid grid-cols-3 gap-2">
          <NuxtLink
            v-for="item in moreItems"
            :key="item.to"
            :to="item.to"
            @click="moreOpen = false"
            :class="[
              isActive(item.to)
                ? 'bg-stone-900 text-white'
                : 'bg-stone-50 text-stone-700',
              'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-xs font-semibold',
            ]"
          >
            <component :is="item.icon" :size="22" />
            <span>{{ item.name }}</span>
          </NuxtLink>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="copyBookingLink"
            class="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-3 text-xs font-semibold text-stone-700"
          >
            <Check v-if="copied" :size="14" class="text-emerald-600" />
            <Copy v-else :size="14" />
            <span>{{ copied ? "Copied!" : "Copy booking link" }}</span>
          </button>
          <button
            type="button"
            @click="handleSignOut"
            class="flex items-center justify-center gap-2 rounded-xl bg-rose-50 py-3 text-xs font-semibold text-rose-600"
          >
            <LogOut :size="14" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

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
            @click="moreOpen = false"
            :aria-current="isActive(tab.to) && !moreOpen ? 'page' : undefined"
            :class="[
              isActive(tab.to) && !moreOpen ? 'text-rose-600' : 'text-stone-400',
              'tab-item relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold',
            ]"
          >
            <span
              v-if="isActive(tab.to) && !moreOpen"
              class="absolute inset-x-4 top-0 h-0.5 rounded-full bg-rose-600"
            ></span>
            <span
              :class="[
                isActive(tab.to) && !moreOpen ? 'bg-rose-50' : '',
                'flex h-7 w-12 items-center justify-center rounded-full transition',
              ]"
            >
              <component :is="tab.icon" :size="22" />
            </span>
            <span>{{ tab.name }}</span>
          </NuxtLink>
          <button
            type="button"
            @click="moreOpen = !moreOpen"
            :aria-expanded="moreOpen"
            :class="[
              moreOpen || isMoreActive ? 'text-rose-600' : 'text-stone-400',
              'tab-item relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold',
            ]"
          >
            <span
              v-if="moreOpen || isMoreActive"
              class="absolute inset-x-4 top-0 h-0.5 rounded-full bg-rose-600"
            ></span>
            <span
              :class="[
                moreOpen || isMoreActive ? 'bg-rose-50' : '',
                'flex h-7 w-12 items-center justify-center rounded-full transition',
              ]"
            >
              <Ellipsis :size="22" />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>
  </div>
</template>
