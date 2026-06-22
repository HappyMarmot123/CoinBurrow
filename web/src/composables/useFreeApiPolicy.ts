import { computed, ref, type ComputedRef, type Ref } from "vue";

import type { FreeApiProviderPolicy } from "../api/rest.js";
import { getFreeApiPolicy } from "../api/rest.js";

export interface CoinMetaRequestPolicyState {
  policies: Ref<FreeApiProviderPolicy[]>;
  loading: Ref<boolean>;
  error: Ref<string>;
  findPolicy: (provider?: string) => FreeApiProviderPolicy | null;
  hasPolicy: ComputedRef<boolean>;
  reload: () => Promise<void>;
}

export function useFreeApiPolicy(): CoinMetaRequestPolicyState {
  const policies = ref<FreeApiProviderPolicy[]>([]);
  const loading = ref(false);
  const error = ref("");
  const loadedAt = ref(0);

  async function reload() {
    loading.value = true;
    error.value = "";
    try {
      const payload = await getFreeApiPolicy();
      policies.value = payload.policies ?? [];
      loadedAt.value = payload.generatedAt;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "failed to load free api policy";
      policies.value = [];
      loadedAt.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function findPolicy(provider?: string) {
    if (!provider) return null;
    const normalized = provider.toLowerCase();
    return policies.value.find((policy) => policy.provider === normalized) ?? null;
  }

  const hasPolicy = computed(() => policies.value.length > 0 && loadedAt.value > 0);

  return {
    policies,
    loading,
    error,
    findPolicy,
    reload,
    hasPolicy,
  };
}
