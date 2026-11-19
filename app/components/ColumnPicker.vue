<script setup lang="ts">
// "Columns" button + menu with a checkbox per optional table column.
import { ref } from "vue";
import { Columns3, RotateCcw } from "lucide-vue-next";
const { t } = useT();

const props = defineProps<{
  columns: { key: string; label: string }[];
  visible: Record<string, boolean>;
}>();
const emit = defineEmits<{ toggle: [key: string]; reset: [] }>();
const open = ref(false);
</script>

<template>
  <div class="relative">
    <button type="button" class="ui-btn ui-btn-secondary" :aria-expanded="open" @click.stop="open = !open">
      <Columns3 :size="16" />
      <span>{{ t("Columns") }}</span>
    </button>
    <div v-if="open" class="fixed inset-0 z-40" @click="open = false"></div>
    <div v-if="open" class="absolute end-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl">
      <div class="ds-menu-label">{{ t("Show columns") }}</div>
      <label v-for="c in props.columns" :key="c.key" class="ds-menu-item">
        <input type="checkbox" class="size-4" :checked="props.visible[c.key]" @change="emit('toggle', c.key)" />
        <span>{{ t(c.label) }}</span>
      </label>
      <div class="ds-menu-sep"></div>
      <button type="button" class="ds-menu-item" @click="emit('reset')">
        <RotateCcw :size="16" />
        <span>{{ t("Reset columns") }}</span>
      </button>
    </div>
  </div>
</template>
