<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
const form = reactive({ description: "", phone: "", city: "", focus: "" });
const saved = ref(false);
const save = async () => {
  saved.value = true;
};
</script>
<template>
  <main class="grid min-h-screen place-items-center bg-paper px-5 py-12">
    <section class="surface w-full max-w-2xl p-6 lg:p-8">
      <p class="eyebrow">One-minute setup</p>
      <h1 class="font-display text-4xl">Tell us about your business.</h1>
      <p class="mt-3 text-sm text-stone-500">
        This helps shape your workspace and booking page.
      </p>
      <form class="mt-7 grid gap-4" @submit.prevent="save">
        <label class="grid gap-1.5 text-xs font-semibold text-stone-600"
          >What do you offer?<InputText
            v-model="form.focus"
            placeholder="Beauty, hair, wellness..."
            required /></label
        ><label class="grid gap-1.5 text-xs font-semibold text-stone-600"
          >Short description<textarea
            v-model="form.description"
            class="min-h-28 rounded-lg border border-stone-200 p-3 text-sm outline-none focus:border-rose"
            placeholder="Tell customers what makes your business special."
          />
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1.5 text-xs font-semibold text-stone-600"
            >Phone<InputText
              v-model="form.phone"
              placeholder="+30 210..." /></label
          ><label class="grid gap-1.5 text-xs font-semibold text-stone-600"
            >City<InputText v-model="form.city" placeholder="Athens"
          /></label>
        </div>
        <div v-if="saved" class="rounded-lg bg-teal-soft p-3 text-sm text-teal">
          Setup saved. Your workspace is ready.
        </div>
        <Button
          type="submit"
          label="Finish setup"
          icon="pi pi-check"
          severity="contrast"
          class="mt-2"
        />
      </form>
    </section>
  </main>
</template>
