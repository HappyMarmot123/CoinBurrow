import { computed, ref, watch, type Ref } from "vue";

import type { DerivativesView } from "../api/rest.js";
import { getDerivativesBySymbol } from "../api/rest.js";

const CATEGORIES: Array<"linear" | "spot"> = ["linear", "spot"];

function parseMarketParts(raw: string): [string, string] | null {
  const [base, quote] = raw.trim().split("-");
  if (!base || !quote) return null;
  return [base.toUpperCase(), quote.toUpperCase()];
}

function shouldLoadDerivatives(raw: string): boolean {
  const parsed = parseMarketParts(raw);
  if (!parsed) return false;
  const quote = parsed[1];
  if (quote === "KRW") return false;
  return true;
}

export function useDerivatives(selectedMarket: Ref<string>) {
  const derivatives = ref<DerivativesView | null>(null);
  const loading = ref(false);
  const error = ref("");

  const hasDerivatives = computed(() => derivatives.value !== null);

  async function loadDerivatives(nextMarket = selectedMarket.value) {
    if (!shouldLoadDerivatives(nextMarket)) {
      derivatives.value = null;
      error.value = "";
      return;
    }

    loading.value = true;
    error.value = "";
    derivatives.value = null;
    const [base] = parseMarketParts(nextMarket) ?? [];
    if (!base) {
      error.value = "invalid market";
      loading.value = false;
      return;
    }

    const categories = CATEGORIES;

    for (const category of categories) {
      try {
        const payload = await getDerivativesBySymbol(nextMarket, category);
        if (payload?.openInterest || payload?.fundingRate) {
          derivatives.value = payload;
          loading.value = false;
          return;
        }
      } catch (cause) {
        if (cause instanceof Error) {
          error.value = cause.message;
        } else {
          error.value = "failed to load derivatives";
        }
      }
    }

    if (!derivatives.value) {
      error.value = "derivatives data is unavailable for this market";
    }

    loading.value = false;
  }

  watch(() => selectedMarket.value, (nextMarket) => {
    void loadDerivatives(nextMarket);
  }, {
    immediate: true,
  });

  return {
    derivatives,
    loading,
    error,
    hasDerivatives,
  };
}
