<script setup lang="ts">
// Design-system Switch: 44×24 track, white knob, brand colour when on.
const props = defineProps<{ modelValue: boolean; disabled?: boolean; label?: string; id?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; change: [value: boolean] }>();
const toggle = () => {
  if (props.disabled) return;
  const v = !props.modelValue;
  emit("update:modelValue", v);
  emit("change", v);
};
</script>

<template>
  <button
    :id="props.id"
    type="button"
    role="switch"
    class="ds-switch"
    :class="{ 'is-on': props.modelValue }"
    :aria-checked="props.modelValue"
    :aria-label="props.label"
    :disabled="props.disabled"
    @click.stop="toggle"
  >
    <span class="ds-switch-knob" aria-hidden="true"></span>
  </button>
</template>
