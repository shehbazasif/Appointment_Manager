<script setup lang="ts">
// Settings > Team (head office only): who can sign in to the head office and to
// each branch, open invitations, and inviting someone by email to one of them.
import { Loader2, Mail, Send, Trash2, X, AlertCircle, Check, Copy, Building2, Store } from "lucide-vue-next";
const { t, intl } = useT();

interface Member { userId: string; role: string; email: string | null; name: string; lastSignInAt: string | null; isYou: boolean }
interface Invite { id: string; email: string; role: string; createdAt: string; expiresAt: string }
interface Place { id: string; name: string; isHead: boolean; members: Member[]; invites: Invite[] }

const loading = ref(true);
const loadError = ref("");
const places = ref<Place[]>([]);
const hasBranches = computed(() => places.value.length > 1);
const target = ref("");
const targetName = computed(() => places.value.find((p) => p.id === target.value)?.name ?? "");

const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const r = await $fetch<{ places: Place[] }>("/api/team");
    places.value = r.places;
    // invite to a branch by default: that is what the head office mostly does
    if (!r.places.some((p) => p.id === target.value)) target.value = (r.places.find((p) => !p.isHead) ?? r.places[0])?.id ?? "";
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage ?? t("Could not load the team.");
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const email = ref("");
const sending = ref(false);
const notice = ref("");
const fallbackLink = ref("");
const sendError = ref("");
const invite = async () => {
  sendError.value = notice.value = fallbackLink.value = "";
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    sendError.value = t("Enter a valid email address.");
    return;
  }
  sending.value = true;
  try {
    const r = await $fetch<{ emailSent: boolean; link?: string }>("/api/team/invites", {
      method: "POST",
      body: { email: email.value.trim(), businessId: target.value || undefined },
    });
    if (r.emailSent) notice.value = t("Invitation sent to {email}.", { email: email.value.trim() });
    else {
      notice.value = t("The email could not be sent. Send this link to them yourself (e.g. on WhatsApp):");
      fallbackLink.value = r.link ?? "";
    }
    email.value = "";
    await load();
  } catch (e: any) {
    sendError.value = e?.data?.statusMessage ?? t("Could not send the invitation.");
  } finally {
    sending.value = false;
  }
};

const copied = ref(false);
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(fallbackLink.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {}
};

const cancelInvite = async (i: Invite) => {
  await $fetch(`/api/team/invites/${i.id}`, { method: "DELETE" }).catch(() => null);
  await load();
};
const removeMember = async (p: Place, m: Member) => {
  if (!confirm(t("Remove {name}? They will not be able to sign in to {business} any more.", { name: m.name || m.email || "", business: p.name }))) return;
  try {
    await $fetch(`/api/team/members/${m.userId}`, { method: "DELETE", query: { businessId: p.id } });
    await load();
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? t("Could not remove this person."));
  }
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(intl.value, { day: "numeric", month: "short", year: "numeric" }) : t("Never");
const initials = (m: Member) => initialsOf((m.name || m.email || "?").split(/[\s@]/)[0], m.name.split(/\s+/)[1]);
</script>

<template>
  <div class="space-y-5">
    <!-- Invite -->
    <div class="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div class="ds-label">
        {{ hasBranches ? t("Invite someone") : t("Invite someone to {business}", { business: targetName || "…" }) }}
      </div>
      <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div :class="['grid gap-2', hasBranches ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]' : '']">
          <input
            v-model="email"
            type="email"
            autocomplete="off"
            :placeholder="t('Their email address')"
            class="min-w-0 px-3"
            @keydown.enter.prevent="invite"
          />
          <AppSelect v-if="hasBranches" v-model="target" :aria-label="t('Works at')" class="w-full">
            <option v-for="p in places" :key="p.id" :value="p.id">{{ p.isHead ? `${p.name} · ${t("Head office")}` : p.name }}</option>
          </AppSelect>
        </div>
        <button type="button" class="ui-btn ui-btn-primary" :disabled="sending" @click="invite">
          <Loader2 v-if="sending" :size="16" class="animate-spin" />
          <Send v-else :size="16" />
          <span>{{ t("Send invitation") }}</span>
        </button>
      </div>
      <p class="ds-help">
        {{
          hasBranches
            ? t("They get an email with a link and choose their own password. Branch people see only their branch.")
            : t("They get an email with a link. They choose their own password and see only this business.")
        }}
      </p>
      <p v-if="sendError" class="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-red-700"><AlertCircle :size="15" /> {{ sendError }}</p>
      <div v-if="notice" class="mt-2 space-y-2 text-[13px] text-emerald-800">
        <p class="flex items-center gap-1.5 font-medium"><Check :size="15" /> {{ notice }}</p>
        <div v-if="fallbackLink" class="flex gap-2">
          <input :value="fallbackLink" readonly class="min-w-0 flex-1 px-3 text-xs" />
          <button type="button" class="ui-btn ui-btn-secondary" @click="copyLink">
            <Check v-if="copied" :size="16" /><Copy v-else :size="16" />
            <span>{{ copied ? t("Copied!") : t("Copy") }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-12 animate-pulse rounded-md bg-stone-100"></div>
    </div>
    <p v-else-if="loadError" class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
      <AlertCircle :size="16" /> {{ loadError }}
    </p>
    <template v-else>
      <section v-for="p in places" :key="p.id">
        <h3 class="flex items-center gap-2 text-[15px] font-semibold text-stone-900">
          <component :is="p.isHead ? Building2 : Store" :size="17" class="text-stone-500" />
          <span class="truncate">{{ hasBranches ? p.name : t("People with access") }}</span>
          <span v-if="hasBranches && p.isHead" class="ds-tag">{{ t("Head office") }}</span>
        </h3>
        <p v-if="hasBranches && p.isHead" class="mt-0.5 text-xs text-stone-500">{{ t("See and manage every branch.") }}</p>

        <ul class="mt-2 divide-y divide-stone-200 rounded-lg border border-stone-200">
          <li v-for="m in p.members" :key="m.userId" class="flex items-center gap-3 px-3 py-2.5">
            <span class="ds-avatar">{{ initials(m) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-stone-900">
                {{ m.name || m.email }} <span v-if="m.isYou" class="text-xs font-normal text-stone-500">({{ t("you") }})</span>
              </span>
              <span class="block truncate text-xs text-stone-500">{{ m.email }} · {{ t("Last sign-in") }}: {{ fmt(m.lastSignInAt) }}</span>
            </span>
            <span class="ds-tag">{{ m.role === "OWNER" ? t("Owner") : t("Manager") }}</span>
            <button
              v-if="!m.isYou && m.role !== 'OWNER'"
              type="button"
              class="ui-btn ui-btn-ghost ui-btn-icon !text-red-700"
              :aria-label="t('Remove')"
              :title="t('Remove')"
              @click="removeMember(p, m)"
            >
              <Trash2 :size="16" />
            </button>
          </li>
          <li v-for="i in p.invites" :key="i.id" class="flex items-center gap-3 px-3 py-2.5">
            <span class="grid size-8 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700"><Mail :size="16" /></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-stone-900">{{ i.email }}</span>
              <span class="block text-xs text-amber-800">
                {{ t("Invited, not joined yet") }} · {{ t("Sent {date} · valid until {until}", { date: fmt(i.createdAt), until: fmt(i.expiresAt) }) }}
              </span>
            </span>
            <button type="button" class="ui-btn ui-btn-ghost ui-btn-sm" @click="cancelInvite(i)">
              <X :size="14" /> {{ t("Cancel") }}
            </button>
          </li>
          <li v-if="!p.members.length && !p.invites.length" class="px-3 py-3 text-[13px] text-stone-500">
            {{ t("Nobody yet. Invite someone above.") }}
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
