import { computed, inject, type Ref } from "vue";

export type FeatureKey = "tokens" | "onLocation" | "attendance" | "import" | "theme";

/**
 * What the current business can use (admin access + the owner's own switch).
 * Read from the dashboard layout's /api/me data. While it is loading,
 * everything except on-location counts as on, so nothing flickers away.
 */
export function useFeatures() {
  const profile = inject<Ref<any> | null>("businessProfile", null);
  const features = computed<Record<FeatureKey, boolean>>(() => {
    const f = profile?.value?.organization?.features;
    return {
      tokens: f?.tokens ?? true,
      onLocation: f?.onLocation ?? false,
      attendance: f?.attendance ?? true,
      import: f?.import ?? true,
      theme: f?.theme ?? true,
    };
  });
  const allowed = computed<Record<FeatureKey, boolean>>(() => {
    const a = profile?.value?.organization?.allowedFeatures ?? {};
    return {
      tokens: a.tokens !== false,
      onLocation: a.onLocation !== false,
      attendance: a.attendance !== false,
      import: a.import !== false,
      theme: a.theme !== false,
    };
  });
  return { features, allowed };
}
