<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { Mail, MessageSquare, Phone, Send, Check, X, Sparkles } from "lucide-vue-next";

const props = defineProps<{
  modelValue: boolean;
  customer?: {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
  } | null;
  appointmentId?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "sent"): void;
}>();

const activeChannel = ref<"EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
const isSubmitting = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const form = reactive({
  recipient: "",
  subject: "",
  message: "",
});

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      errorMsg.value = "";
      successMsg.value = "";
      updateRecipient();
      if (!form.message) {
        form.message = `Hello ${props.customer?.firstName ?? "there"},\n\nRegarding your appointment at our studio...`;
      }
      if (!form.subject) {
        form.subject = "Your appointment update";
      }
    }
  },
  { immediate: true },
);

const updateRecipient = () => {
  if (activeChannel.value === "EMAIL") {
    form.recipient = props.customer?.email ?? "";
  } else {
    form.recipient = props.customer?.phone ?? "";
  }
};

watch(activeChannel, () => {
  updateRecipient();
});

// Digits-only phone for wa.me / sms links (e.g. +30 69... -> 3069...)
const digitsOnly = (phone: string) => phone.replace(/[^0-9]/g, "");

const externalLink = computed(() => {
  const phone = digitsOnly(form.recipient.trim());
  const text = encodeURIComponent(form.message.trim());
  if (activeChannel.value === "WHATSAPP") return phone ? `https://wa.me/${phone}?text=${text}` : "";
  if (activeChannel.value === "SMS") return phone ? `sms:${form.recipient.trim()}?body=${text}` : "";
  return "";
});

const primaryLabel = computed(() => {
  if (activeChannel.value === "EMAIL") return isSubmitting.value ? "Sending..." : "Send Email";
  if (activeChannel.value === "WHATSAPP") return "Open WhatsApp";
  return "Open SMS App";
});

/**
 * WHATSAPP / SMS open the customer's chat app with the message pre-filled —
 * no WhatsApp/SMS API costs. The conversation is logged to history via the
 * API, but the actual delivery happens in WhatsApp / the SMS app.
 */
const sendExternal = async () => {
  // Open synchronously inside the click (popup blockers reject delayed opens).
  window.open(externalLink.value, "_blank", "noopener,noreferrer");

  // Log the conversation for history. History-only: never block on errors.
  try {
    if (props.customer?.id) {
      await $fetch("/api/communications/send", {
        method: "POST",
        body: {
          customerId: props.customer.id,
          appointmentId: props.appointmentId,
          channel: activeChannel.value,
          recipient: form.recipient.trim(),
          message: form.message.trim(),
        },
      });
    }
  } catch (err: any) {
    console.warn("[communication] history log failed:", err?.data?.statusMessage ?? err?.message);
  }

  successMsg.value =
    activeChannel.value === "WHATSAPP"
      ? "WhatsApp opened with your message pre-filled — press send there to deliver it."
      : "SMS app opened with your message pre-filled — press send there to deliver it.";
  emit("sent");
};

const send = async () => {
  if (!form.recipient.trim()) {
    errorMsg.value = "Recipient is required.";
    return;
  }
  if (!form.message.trim()) {
    errorMsg.value = "Message cannot be empty.";
    return;
  }
  if (activeChannel.value === "EMAIL" && !form.subject.trim()) {
    errorMsg.value = "Email subject is required.";
    return;
  }
  if (activeChannel.value !== "EMAIL" && digitsOnly(form.recipient.trim()).length < 6) {
    errorMsg.value = "Please enter a valid phone number (with country code, e.g. +30 69...).";
    return;
  }

  if (activeChannel.value !== "EMAIL") {
    errorMsg.value = "";
    await sendExternal();
    return;
  }

  isSubmitting.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    await $fetch("/api/communications/send", {
      method: "POST",
      body: {
        customerId: props.customer?.id,
        appointmentId: props.appointmentId,
        channel: activeChannel.value,
        recipient: form.recipient.trim(),
        subject: activeChannel.value === "EMAIL" ? form.subject.trim() : undefined,
        message: form.message.trim(),
      },
    });

    successMsg.value = "Email sent successfully!";
    setTimeout(() => {
      emit("sent");
      emit("update:modelValue", false);
    }, 1200);
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage ?? "Failed to send communication.";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
  >
    <div
      class="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-stone-100 pb-4">
        <div>
          <h3 class="font-display text-xl font-bold text-stone-900">
            Contact {{ customer ? `${customer.firstName} ${customer.lastName}` : "Customer" }}
          </h3>
          <p class="text-xs text-stone-500 mt-0.5">Send a real-time notification or message.</p>
        </div>
        <button
          type="button"
          @click="emit('update:modelValue', false)"
          class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X :size="18" />
        </button>
      </div>

      <!-- Channel Switcher -->
      <div class="grid grid-cols-3 gap-2 rounded-xl bg-stone-100 p-1">
        <button
          type="button"
          @click="activeChannel = 'EMAIL'"
          :class="[
            activeChannel === 'EMAIL'
              ? 'bg-white text-stone-900 shadow-xs font-semibold'
              : 'text-stone-600 hover:text-stone-900 font-medium',
            'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition',
          ]"
        >
          <Mail :size="14" />
          <span>Email</span>
        </button>
        <button
          type="button"
          @click="activeChannel = 'SMS'"
          :class="[
            activeChannel === 'SMS'
              ? 'bg-white text-stone-900 shadow-xs font-semibold'
              : 'text-stone-600 hover:text-stone-900 font-medium',
            'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition',
          ]"
        >
          <Phone :size="14" />
          <span>SMS</span>
        </button>
        <button
          type="button"
          @click="activeChannel = 'WHATSAPP'"
          :class="[
            activeChannel === 'WHATSAPP'
              ? 'bg-white text-stone-900 shadow-xs font-semibold'
              : 'text-stone-600 hover:text-stone-900 font-medium',
            'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition',
          ]"
        >
          <MessageSquare :size="14" />
          <span>WhatsApp</span>
        </button>
      </div>

      <!-- Form Inputs -->
      <form @submit.prevent="send" class="space-y-4">
        <p
          v-if="activeChannel !== 'EMAIL'"
          class="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600"
        >
          <template v-if="activeChannel === 'WHATSAPP'">
            We'll open the customer's WhatsApp chat with your message already written — just press send there. No WhatsApp API costs.
          </template>
          <template v-else>
            We'll open the customer's SMS app with your message pre-filled (message body support varies by device).
          </template>
        </p>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
            {{ activeChannel === "EMAIL" ? "Email Address" : "Phone Number" }}
          </label>
          <input
            v-model="form.recipient"
            :type="activeChannel === 'EMAIL' ? 'email' : 'tel'"
            required
            :placeholder="activeChannel === 'EMAIL' ? 'customer@example.com' : '+30 69...'"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900 focus:bg-white transition"
          />
        </div>

        <div v-if="activeChannel === 'EMAIL'">
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
            Subject
          </label>
          <input
            v-model="form.subject"
            type="text"
            required
            placeholder="Appointment reminder..."
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900 focus:bg-white transition"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
            Message Body
          </label>
          <textarea
            v-model="form.message"
            rows="4"
            required
            placeholder="Type your message here..."
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-stone-900 focus:bg-white transition"
          ></textarea>
        </div>

        <!-- Feedback Alert -->
        <p
          v-if="errorMsg"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
        >
          {{ errorMsg }}
        </p>

        <p
          v-if="successMsg"
          class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 flex items-center gap-2"
        >
          <Check :size="15" />
          {{ successMsg }}
        </p>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
          <button
            type="button"
            @click="emit('update:modelValue', false)"
            class="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition"
          >
            <Send :size="14" />
            <span>{{ primaryLabel }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
