<script setup lang="ts">
// Platform admin: every business, its numbers, and which features it may use.
import { ref, reactive, computed, onMounted, watch } from "vue";
import {
  Building2,
  CalendarCheck,
  Users,
  UserCheck,
  Search,
  ExternalLink,
  X,
  ShieldAlert,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Ticket,
  MapPin,
  ScanLine,
  Upload,
  Palette,
  Network,
} from "lucide-vue-next";
import { BUSINESS_TYPES, businessTypeOf } from "~/utils/businessTypes";

definePageMeta({ layout: "admin" });
useHead({ title: "Platform admin" });

type FeatureKey = "tokens" | "onLocation" | "attendance" | "import" | "theme" | "branches";
/** Features a business only gets when the admin switches them on. */
const OFF_BY_DEFAULT: FeatureKey[] = ["branches"];
const isAllowed = (a: Partial<Record<FeatureKey, boolean>> | undefined, k: FeatureKey) =>
  OFF_BY_DEFAULT.includes(k) ? a?.[k] === true : a?.[k] !== false;

interface Stats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalAppointments: number;
  appointmentsLast30: number;
  totalCustomers: number;
  totalStaff: number;
}
interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  email: string;
  city?: string | null;
  country?: string | null;
  status: string;
  createdAt: string;
  businessType: string;
  bookingActive: boolean;
  allowedFeatures: Partial<Record<FeatureKey, boolean>>;
  appointments: number;
  appointments30: number;
  customers: number;
  staff: number;
  lastBookingAt?: string | null;
  ownerEmail?: string | null;
}
interface BusinessDetail extends Omit<BusinessRow, "appointments" | "appointments30" | "customers" | "staff" | "lastBookingAt" | "ownerEmail"> {
  phone?: string | null;
  logoUrl?: string | null;
  tokensEnabled: boolean;
  showTokenToCustomer: boolean;
  onLocationEnabled: boolean;
  language: string;
  timezone: string;
  counts: { appointments: number; appointments30: number; customers: number; staff: number; services: number };
  members: { role: string; status: string; email: string | null; name: string; lastSignInAt: string | null }[];
  recentAppointments: { startAt: string; status: string; source: string; customer: string; service: string }[];
}

const FEATURES: { key: FeatureKey; title: string; description: string; icon: any }[] = [
  { key: "tokens", title: "Token system", description: "Queue numbers, printed tickets and the token on the booking page.", icon: Ticket },
  { key: "onLocation", title: "On-location service", description: "Customer shares their location; staff are sent to them.", icon: MapPin },
  { key: "attendance", title: "Staff attendance", description: "QR check-in and staff working days.", icon: ScanLine },
  { key: "import", title: "Excel import", description: "Import customers and staff from a spreadsheet.", icon: Upload },
  { key: "theme", title: "Theme colour", description: "Own brand colour on the dashboard and booking page.", icon: Palette },
  { key: "branches", title: "Branches", description: "Head office with several branches: branch switcher, branch overview, team per branch, shared drivers. Off for new businesses.", icon: Network },
];

const { init, adminFetch, isAdminUser, mfaStep } = useAdminAuth();
const isAuthorized = ref(true);
const isLoading = ref(true);
const loadError = ref("");
const stats = ref<Stats | null>(null);
const businesses = ref<BusinessRow[]>([]);
const search = ref("");
const statusTab = ref<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

const load = async () => {
  isLoading.value = true;
  loadError.value = "";
  try {
    // the admin panel has its own login (separate from the business login)
    const user = await init();
    // admin needs the password AND the authenticator app code
    if (!isAdminUser(user) || (await mfaStep()) !== "done") {
      await navigateTo("/admin/login", { replace: true });
      return;
    }
    const [s, list] = await Promise.all([
      adminFetch<Stats>("/api/admin/stats"),
      adminFetch<BusinessRow[]>("/api/admin/organizations"),
    ]);
    stats.value = s;
    businesses.value = list;
    isAuthorized.value = true;
  } catch (err: any) {
    if (err?.statusCode === 403 || err?.statusCode === 401) isAuthorized.value = false;
    else loadError.value = err?.data?.statusMessage ?? "Could not load the admin data.";
  } finally {
    isLoading.value = false;
  }
};
onMounted(load);

const counts = computed(() => ({
  ALL: businesses.value.length,
  ACTIVE: businesses.value.filter((b) => b.status === "ACTIVE").length,
  INACTIVE: businesses.value.filter((b) => b.status !== "ACTIVE").length,
}));
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return businesses.value.filter(
    (b) =>
      (statusTab.value === "ALL" || (statusTab.value === "ACTIVE") === (b.status === "ACTIVE")) &&
      (!q ||
        [b.name, b.slug, b.email, b.city, b.ownerEmail].some((v) => (v ?? "").toLowerCase().includes(q))),
  );
});
const pager = usePager(filtered, "admin_page_size");

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";
const restrictedCount = (b: { allowedFeatures: Partial<Record<FeatureKey, boolean>> }) =>
  // switched-off features (extras that are off by default do not count)
  Object.entries(b.allowedFeatures ?? {}).filter(([k, v]) => v === false && !OFF_BY_DEFAULT.includes(k as FeatureKey)).length;

// ---- Detail drawer ----
const open = ref<BusinessDetail | null>(null);
const openLoading = ref(false);
const openFailed = ref("");
const tab = ref<"overview" | "features" | "members">("overview");
const saving = ref(false);
const saveError = ref("");
const saveOk = ref(false);
const draft = reactive({
  status: "ACTIVE",
  bookingActive: true,
  businessType: "general",
  allowed: { tokens: true, onLocation: true, attendance: true, import: true, theme: true, branches: false } as Record<FeatureKey, boolean>,
});
const fillDraft = (d: BusinessDetail) => {
  draft.status = d.status;
  draft.bookingActive = d.bookingActive;
  draft.businessType = d.businessType;
  for (const f of FEATURES) draft.allowed[f.key] = isAllowed(d.allowedFeatures, f.key);
};
const isDirty = computed(() => {
  const d = open.value;
  // nothing to compare until the business has really loaded
  if (!d || !d.counts) return false;
  return (
    draft.status !== d.status ||
    draft.bookingActive !== d.bookingActive ||
    draft.businessType !== d.businessType ||
    FEATURES.some((f) => draft.allowed[f.key] !== isAllowed(d.allowedFeatures, f.key))
  );
});

const openBusiness = async (id: string, startTab: typeof tab.value = "overview") => {
  tab.value = startTab;
  saveError.value = "";
  saveOk.value = false;
  openFailed.value = "";
  openLoading.value = true;
  open.value = { id } as BusinessDetail;
  try {
    const d = await adminFetch<BusinessDetail>(`/api/admin/organizations/${id}`);
    open.value = d;
    fillDraft(d);
  } catch (err: any) {
    openFailed.value = err?.data?.statusMessage ?? "Could not open this business.";
  } finally {
    openLoading.value = false;
  }
};
const close = () => {
  if (isDirty.value && !confirm("You have unsaved changes. Close anyway?")) return;
  open.value = null;
};
const save = async () => {
  if (!open.value) return;
  saving.value = true;
  saveError.value = "";
  saveOk.value = false;
  try {
    const d = await adminFetch<BusinessDetail>(`/api/admin/organizations/${open.value.id}`, {
      method: "PATCH",
      body: {
        status: draft.status,
        bookingActive: draft.bookingActive,
        businessType: draft.businessType,
        allowedFeatures: { ...draft.allowed },
      },
    });
    open.value = d;
    fillDraft(d);
    saveOk.value = true;
    // keep the list in step
    const row = businesses.value.find((b) => b.id === d.id);
    if (row) Object.assign(row, { status: d.status, bookingActive: d.bookingActive, businessType: d.businessType, allowedFeatures: d.allowedFeatures });
    setTimeout(() => (saveOk.value = false), 2500);
  } catch (err: any) {
    saveError.value = err?.data?.statusMessage ?? "Could not save.";
  } finally {
    saving.value = false;
  }
};
watch(open, (v) => {
  if (import.meta.client) document.documentElement.style.overflow = v ? "hidden" : "";
});
const ownerSwitch = (key: FeatureKey) => {
  const d = open.value;
  if (!d) return null;
  if (key === "tokens") return d.tokensEnabled;
  if (key === "onLocation") return d.onLocationEnabled;
  return null;
};
const statusPill = (s: string) =>
  ({ CONFIRMED: "ds-pill--success", PENDING: "ds-pill--warning", CHECKED_IN: "ds-pill--info", COMPLETED: "ds-pill--neutral", CANCELLED: "ds-pill--danger", NO_SHOW: "ds-pill--danger" })[s] ??
  "ds-pill--neutral";
</script>

<template>
  <div class="space-y-5 pb-16">
    <!-- Not an admin -->
    <div v-if="!isLoading && !isAuthorized" class="ds-card mx-auto mt-10 max-w-md p-8 text-center">
      <span class="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-700"><ShieldAlert :size="22" /></span>
      <h1 class="mt-3 text-lg font-semibold">Access restricted</h1>
      <p class="mt-1 text-sm text-stone-600">This page is only for the platform admin. Sign in with the admin account.</p>
      <NuxtLink to="/admin/login" class="ui-btn ui-btn-primary mt-4">Admin sign in</NuxtLink>
    </div>

    <template v-else>
      <div class="ds-page-head">
        <div class="min-w-0">
          <h1 class="ds-page-title">Businesses</h1>
          <p class="ds-page-sub">Every business on {{ BRAND.name }}. Open one to change its type or which features it can use.</p>
        </div>
      </div>

      <p v-if="loadError" class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle :size="16" /> {{ loadError }}
      </p>

      <!-- Stat strip -->
      <div class="ds-card grid grid-cols-2 divide-stone-200 overflow-hidden sm:grid-cols-4 sm:divide-x rtl:divide-x-reverse">
        <div v-for="s in [
          { label: 'Businesses', value: stats ? `${stats.activeOrganizations} / ${stats.totalOrganizations}` : '—', sub: 'active / total', icon: Building2 },
          { label: 'Bookings (30 days)', value: stats?.appointmentsLast30 ?? '—', sub: `${stats?.totalAppointments ?? 0} in total`, icon: CalendarCheck },
          { label: 'Customers', value: stats?.totalCustomers ?? '—', sub: 'all businesses', icon: Users },
          { label: 'Staff', value: stats?.totalStaff ?? '—', sub: 'all businesses', icon: UserCheck },
        ]" :key="s.label" class="grid gap-1.5 p-4 sm:p-5">
          <span class="flex items-center gap-2 text-[13px] text-stone-500"><component :is="s.icon" :size="16" class="text-stone-400" /> {{ s.label }}</span>
          <span class="text-2xl font-semibold tabular-nums tracking-tight text-stone-900 sm:text-[30px] sm:leading-9">{{ s.value }}</span>
          <span class="text-xs text-stone-500">{{ s.sub }}</span>
        </div>
      </div>

      <!-- Business table -->
      <div class="ds-card">
        <div class="ds-tabs" role="tablist">
          <button
            v-for="tb in (['ALL', 'ACTIVE', 'INACTIVE'] as const)"
            :key="tb"
            type="button"
            role="tab"
            :aria-selected="statusTab === tb"
            :class="['ds-tab', statusTab === tb ? 'is-active' : '']"
            @click="statusTab = tb"
          >
            {{ tb === "ALL" ? "All" : tb === "ACTIVE" ? "Active" : "Inactive" }}
            <span class="count">{{ counts[tb] }}</span>
          </button>
        </div>
        <div class="ds-toolbar">
          <div class="relative min-w-0 flex-1 md:max-w-sm">
            <Search :size="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input v-model="search" type="search" placeholder="Search name, slug, email, owner, city…" class="w-full ps-9 pe-3" />
          </div>
        </div>

        <div v-if="isLoading" class="space-y-2 p-4">
          <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-md bg-stone-100"></div>
        </div>
        <div v-else-if="!filtered.length" class="px-4 py-12 text-center text-sm text-stone-500">No businesses match.</div>
        <template v-else>
          <div class="ds-table-wrap">
            <table class="ds-table">
              <thead>
                <tr>
                  <th class="sticky-start">Business</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th class="text-end">Bookings 30d</th>
                  <th class="text-end">Customers</th>
                  <th>Last booking</th>
                  <th>Status</th>
                  <th class="sticky-end text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in pager.rows" :key="b.id" class="cursor-pointer" @click="openBusiness(b.id)">
                  <td class="sticky-start">
                    <div class="flex items-center gap-3">
                      <span class="ds-avatar">{{ initialsOf(b.name.split(" ")[0], b.name.split(" ")[1]) }}</span>
                      <div class="min-w-0">
                        <div class="is-strong max-w-[16rem] truncate">{{ b.name }}</div>
                        <div class="text-xs text-stone-500">/book/{{ b.slug }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="ds-tag">{{ businessTypeOf(b.businessType).name }}</span>
                    <span v-if="restrictedCount(b)" class="ms-1 text-xs text-amber-700">{{ restrictedCount(b) }} off</span>
                  </td>
                  <td class="max-w-[14rem] truncate">{{ b.ownerEmail || "—" }}</td>
                  <td class="num text-end text-stone-900">{{ b.appointments30 }}</td>
                  <td class="num text-end">{{ b.customers }}</td>
                  <td class="num">{{ fmtDate(b.lastBookingAt) }}</td>
                  <td>
                    <span :class="['ds-pill', b.status === 'ACTIVE' ? 'ds-pill--success' : 'ds-pill--neutral']">{{ b.status === "ACTIVE" ? "Active" : "Inactive" }}</span>
                    <span v-if="!b.bookingActive" class="ms-1 text-xs text-stone-500">booking paused</span>
                  </td>
                  <td class="sticky-end" @click.stop>
                    <div class="flex items-center justify-end gap-1.5">
                      <button type="button" class="ui-btn ui-btn-sm ui-btn-secondary" @click="openBusiness(b.id, 'features')">Features</button>
                      <button type="button" class="ui-btn ui-btn-sm ui-btn-soft" @click="openBusiness(b.id)">Open</button>
                      <a :href="`/book/${b.slug}`" target="_blank" rel="noopener" class="ui-btn ui-btn-sm ui-btn-ghost ui-btn-icon" title="Open booking page" aria-label="Open booking page">
                        <ExternalLink :size="15" />
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <TablePager :pager="pager" />
        </template>
      </div>
    </template>

    <!-- Detail drawer -->
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end bg-stone-900/40" @click.self="close">
      <aside class="flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" :aria-label="open.name">
        <div class="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <div class="min-w-0">
            <h2 class="truncate text-lg font-semibold text-stone-900">{{ open.name || (openFailed ? "Business" : "Loading…") }}</h2>
            <p v-if="open.slug" class="text-[13px] text-stone-500">/book/{{ open.slug }} · since {{ fmtDate(open.createdAt) }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn-ghost ui-btn-icon" aria-label="Close" @click="close"><X :size="18" /></button>
        </div>

        <div class="ds-tabs !px-5">
          <button
            v-for="tb in (['overview', 'features', 'members'] as const)"
            :key="tb"
            type="button"
            :class="['ds-tab', tab === tb ? 'is-active' : '']"
            @click="tab = tb"
          >
            {{ tb === "overview" ? "Overview" : tb === "features" ? "Type & features" : "Members" }}
          </button>
        </div>

        <div v-if="openLoading" class="space-y-2 p-5">
          <div v-for="i in 5" :key="i" class="h-10 animate-pulse rounded-md bg-stone-100"></div>
        </div>

        <div v-else-if="openFailed" class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span class="grid size-12 place-items-center rounded-full bg-red-50 text-red-700"><AlertCircle :size="22" /></span>
          <p class="text-sm font-medium text-stone-900">This business could not be loaded.</p>
          <p class="max-w-sm text-[13px] text-stone-500">{{ openFailed }}</p>
          <button type="button" class="ui-btn ui-btn-secondary" @click="openBusiness(open.id, tab)">Try again</button>
        </div>

        <div v-else class="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <!-- Overview -->
          <template v-if="tab === 'overview' && open.counts">
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div v-for="c in [
                { label: 'Bookings (30 days)', value: open.counts.appointments30 },
                { label: 'All bookings', value: open.counts.appointments },
                { label: 'Customers', value: open.counts.customers },
                { label: 'Staff', value: open.counts.staff },
                { label: 'Services', value: open.counts.services },
              ]" :key="c.label" class="rounded-lg border border-stone-200 p-3">
                <div class="text-xs text-stone-500">{{ c.label }}</div>
                <div class="text-xl font-semibold tabular-nums text-stone-900">{{ c.value }}</div>
              </div>
            </div>
            <dl class="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-[13px]">
              <dt class="text-stone-500">Type</dt><dd class="text-stone-900">{{ businessTypeOf(open.businessType).name }}</dd>
              <dt class="text-stone-500">Email</dt><dd class="break-all text-stone-900">{{ open.email || "—" }}</dd>
              <dt class="text-stone-500">Phone</dt><dd class="text-stone-900"><bdi dir="ltr">{{ open.phone || "—" }}</bdi></dd>
              <dt class="text-stone-500">Location</dt><dd class="text-stone-900">{{ [open.city, open.country].filter(Boolean).join(", ") || "—" }}</dd>
              <dt class="text-stone-500">Language</dt><dd class="text-stone-900">{{ open.language }} · {{ open.timezone }}</dd>
              <dt class="text-stone-500">Online booking</dt><dd class="text-stone-900">{{ open.bookingActive ? "On" : "Paused" }}</dd>
            </dl>
            <div>
              <h3 class="ds-section-title !text-[15px]">Latest bookings</h3>
              <ul v-if="open.recentAppointments.length" class="mt-2 divide-y divide-stone-200 rounded-lg border border-stone-200">
                <li v-for="(a, i) in open.recentAppointments" :key="i" class="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                  <span class="min-w-0">
                    <span class="block truncate font-medium text-stone-900">{{ a.customer || "—" }}</span>
                    <span class="block truncate text-xs text-stone-500">{{ a.service }} · {{ fmtDateTime(a.startAt) }}</span>
                  </span>
                  <span :class="['ds-pill shrink-0', statusPill(a.status)]">{{ a.status.replace("_", " ").toLowerCase() }}</span>
                </li>
              </ul>
              <p v-else class="mt-2 text-[13px] text-stone-500">No bookings yet.</p>
            </div>
          </template>

          <!-- Type & features -->
          <template v-else-if="tab === 'features'">
            <section class="space-y-3">
              <h3 class="ds-section-title !text-[15px]">Account</h3>
              <SettingToggle
                :model-value="draft.status === 'ACTIVE'"
                title="Business active"
                description="Off = the business is switched off on the platform."
                @update:model-value="(v) => (draft.status = v ? 'ACTIVE' : 'INACTIVE')"
              />
              <SettingToggle v-model="draft.bookingActive" title="Online booking" description="Customers can book on the public booking page." />
              <div>
                <label class="ds-label" for="adm-type">Business type</label>
                <AppSelect id="adm-type" v-model="draft.businessType" class="w-full sm:max-w-xs">
                  <option v-for="bt in BUSINESS_TYPES" :key="bt.id" :value="bt.id">{{ bt.name }}</option>
                </AppSelect>
                <p class="ds-help">Changes the label only. The owner applies the recommended settings in their Settings.</p>
              </div>
            </section>

            <section class="space-y-3">
              <div>
                <h3 class="ds-section-title !text-[15px]">Feature access</h3>
                <p class="ds-section-sub">Switch a feature off and it disappears from this business's dashboard and booking page.</p>
              </div>
              <SettingToggle
                v-for="f in FEATURES"
                :key="f.key"
                v-model="draft.allowed[f.key]"
                :title="f.title"
                :description="f.description"
              >
                <template #icon>
                  <span class="grid size-9 shrink-0 place-items-center rounded-md bg-stone-100 text-stone-600"><component :is="f.icon" :size="18" /></span>
                </template>
                <span v-if="ownerSwitch(f.key) !== null" class="mt-1 inline-block text-xs text-stone-500">
                  Owner's own switch: <b :class="ownerSwitch(f.key) ? 'text-emerald-700' : 'text-stone-600'">{{ ownerSwitch(f.key) ? "On" : "Off" }}</b>
                </span>
              </SettingToggle>
            </section>
          </template>

          <!-- Members -->
          <template v-else-if="tab === 'members'">
            <ul v-if="open.members?.length" class="divide-y divide-stone-200 rounded-lg border border-stone-200">
              <li v-for="(m, i) in open.members" :key="i" class="flex items-center gap-3 px-3 py-2.5">
                <span class="ds-avatar">{{ initialsOf(m.name.split(" ")[0] || m.email, m.name.split(" ")[1]) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[13px] font-medium text-stone-900">{{ m.name || m.email }}</span>
                  <span class="block truncate text-xs text-stone-500">{{ m.email }} · last sign-in {{ fmtDateTime(m.lastSignInAt) }}</span>
                </span>
                <span class="ds-tag">{{ m.role.toLowerCase() }}</span>
              </li>
            </ul>
            <p v-else class="text-[13px] text-stone-500">No members.</p>
          </template>
        </div>

        <!-- Save bar -->
        <div v-if="tab === 'features' && !openLoading && !openFailed" class="flex items-center justify-between gap-3 border-t border-stone-200 px-5 py-3">
          <p v-if="saveError" class="flex items-center gap-1.5 text-[13px] font-medium text-red-700"><AlertCircle :size="15" /> {{ saveError }}</p>
          <p v-else-if="saveOk" class="flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"><Check :size="15" /> Saved</p>
          <p v-else class="text-[13px] text-stone-500">{{ isDirty ? "You have unsaved changes." : "No changes." }}</p>
          <button type="button" class="ui-btn ui-btn-primary" :disabled="saving || !isDirty" @click="save">
            <Loader2 v-if="saving" :size="16" class="animate-spin" />
            <Save v-else :size="16" />
            <span>Save</span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>
