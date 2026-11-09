<script setup lang="ts">
import { reactive, ref } from "vue";
import { Mail, MessageSquare, LifeBuoy, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-vue-next";
import { contactSchema, CONTACT_TOPICS } from "#shared/schemas/contact";

definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/contactus",
  title: "Contact",
  description: "Questions about plans, setup or your account? Send us a message — a real person will answer.",
});

const form = reactive({ name: "", email: "", business: "", topic: CONTACT_TOPICS[0] as string, message: "", website: "" });
const errors = ref<Record<string, string>>({});
const status = ref<"idle" | "sending" | "sent" | "error">("idle");
const serverError = ref("");

const submit = async () => {
  errors.value = {};
  serverError.value = "";
  const parsed = contactSchema.safeParse(form);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors.value[key] ??= issue.message;
    }
    return;
  }
  status.value = "sending";
  try {
    await $fetch("/api/contact", { method: "POST", body: parsed.data });
    status.value = "sent";
  } catch (e: any) {
    status.value = "error";
    serverError.value = e?.data?.statusMessage || e?.statusMessage || `Something went wrong. Please email ${BRAND.email}.`;
  }
};

const reset = () => {
  Object.assign(form, { name: "", email: "", business: "", topic: CONTACT_TOPICS[0], message: "", website: "" });
  status.value = "idle";
};

const NuxtLinkComp = resolveComponent("NuxtLink");

const field =
  "block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100";
const label = "mb-1.5 block text-sm font-semibold text-stone-800";
</script>

<template>
  <div>
    <SitePageHero eyebrow="Contact" title="We'd love to hear from you." subtitle="Questions about plans, setup or moving from another app? Send a message and a real person will reply." />

    <section class="mx-auto grid max-w-6xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:gap-12">
      <aside class="space-y-4">
        <div v-for="(c, i) in [
          { icon: Mail, title: 'Email', text: BRAND.email, href: `mailto:${BRAND.email}` },
          { icon: LifeBuoy, title: 'Getting started', text: 'Step-by-step setup guide', href: '/help' },
          { icon: MessageSquare, title: 'Quick answers', text: 'Read the FAQ', href: '/faq' },
        ]" :key="c.title" v-reveal="i * 70">
          <component
            :is="c.href.startsWith('/') ? NuxtLinkComp : 'a'"
            :to="c.href.startsWith('/') ? c.href : undefined"
            :href="c.href.startsWith('/') ? undefined : c.href"
            class="flex items-center gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><component :is="c.icon" :size="20" /></span>
            <span>
              <span class="block text-sm font-bold text-stone-900">{{ c.title }}</span>
              <span class="block break-all text-sm text-stone-500">{{ c.text }}</span>
            </span>
          </component>
        </div>
      </aside>

      <div v-reveal="100" class="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8">
        <div v-if="status === 'sent'" class="py-10 text-center" role="status">
          <CheckCircle2 :size="48" class="mx-auto text-emerald-600" />
          <h2 class="mt-4 font-display text-3xl text-stone-900">Message sent!</h2>
          <p class="mt-2 text-stone-600">Thanks, {{ form.name.split(" ")[0] }}. We'll reply to <b>{{ form.email }}</b> as soon as we can.</p>
          <button type="button" class="mt-6 inline-flex min-h-11 items-center rounded-2xl border border-stone-200 px-5 font-semibold text-stone-900 hover:bg-stone-50" @click="reset">
            Send another message
          </button>
        </div>

        <form v-else novalidate class="space-y-5" @submit.prevent="submit">
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="c-name" :class="label">Your name</label>
              <input id="c-name" v-model="form.name" type="text" autocomplete="name" :class="field" :aria-invalid="!!errors.name" aria-describedby="c-name-err" />
              <p v-if="errors.name" id="c-name-err" class="mt-1.5 text-sm text-rose-700">{{ errors.name }}</p>
            </div>
            <div>
              <label for="c-email" :class="label">Email</label>
              <input id="c-email" v-model="form.email" type="email" inputmode="email" autocomplete="email" :class="field" :aria-invalid="!!errors.email" aria-describedby="c-email-err" />
              <p v-if="errors.email" id="c-email-err" class="mt-1.5 text-sm text-rose-700">{{ errors.email }}</p>
            </div>
          </div>
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="c-business" :class="label">Business name <span class="font-normal text-stone-400">(optional)</span></label>
              <input id="c-business" v-model="form.business" type="text" autocomplete="organization" :class="field" />
            </div>
            <div>
              <label for="c-topic" :class="label">Topic</label>
              <select id="c-topic" v-model="form.topic" :class="field">
                <option v-for="t in CONTACT_TOPICS" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div>
            <label for="c-message" :class="label">Message</label>
            <textarea id="c-message" v-model="form.message" rows="6" :class="field" placeholder="Tell us about your business and how we can help…" :aria-invalid="!!errors.message" aria-describedby="c-message-err" />
            <p v-if="errors.message" id="c-message-err" class="mt-1.5 text-sm text-rose-700">{{ errors.message }}</p>
          </div>
          <!-- Honeypot: hidden from people, bots fill it in -->
          <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label for="c-website">Website</label>
            <input id="c-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
          </div>

          <p v-if="status === 'error'" class="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            <AlertCircle :size="18" class="mt-0.5 shrink-0" /> {{ serverError }}
          </p>

          <button
            type="submit"
            :disabled="status === 'sending'"
            class="site-btn inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 text-base font-semibold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-700 disabled:opacity-70 sm:w-auto"
          >
            <Loader2 v-if="status === 'sending'" :size="18" class="animate-spin" />
            <Send v-else :size="18" />
            {{ status === "sending" ? "Sending…" : "Send message" }}
          </button>
          <p class="text-xs text-stone-500">
            By sending this form you agree that we use your details to answer you, as described in our
            <NuxtLink to="/privacy" class="underline underline-offset-2">Privacy Policy</NuxtLink>.
          </p>
        </form>
      </div>
    </section>
  </div>
</template>
