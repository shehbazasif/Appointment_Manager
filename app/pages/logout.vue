<script setup lang="ts">
const { signOut } = useSupabaseAuth();

onMounted(async () => {
  try {
    await signOut();
  } finally {
    await navigateTo("/login");
  }
});
</script>

<template>
  <div
    class="grid min-h-screen place-items-center bg-paper text-sm text-stone-500"
  >
    Signing you out...
  </div>
</template>
