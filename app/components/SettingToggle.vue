<script setup lang="ts">
// A setting row: title + short help on the left, a switch on the right.
// The whole row can be tapped.
const props = defineProps<{ modelValue: boolean; title: string; description?: string; disabled?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; change: [value: boolean] }>();
const set = (v: boolean) => {
  emit("update:modelValue", v);
  emit("change", v);
};
</script>

<template>
  <div
    class="ds-setting"
    :class="{ 'is-disabled': props.disabled }"
    @click="!props.disabled && set(!props.modelValue)"
  >
    <slot name="icon" />
    <div class="min-w-0 flex-1">
      <div class="ds-setting-title">{{ props.title }}</div>
      <div v-if="props.description" class="ds-setting-sub">{{ props.description }}</div>
      <slot />
    </div>
    <AppSwitch :model-value="props.modelValue" :disabled="props.disabled" :label="props.title" @update:model-value="set" />
  </div>
</template>
