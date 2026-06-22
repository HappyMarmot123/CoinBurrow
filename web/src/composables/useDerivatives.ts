import { computed, ref, watch, type Ref } from "vue";

import type { DerivativesView } from "../api/rest.js";
import { getDerivativesBySymbol } from "../api/rest.js";

// Bybit perpetual derivatives live on the USDT linear contracts.
const DERIVATIVES_QUOTE = "USDT";

// Upbit markets are formatted QUOTE-BASE (e.g. "KRW-BTC" => quote KRW, base BTC).
function parseBase(raw: string): string | null {
  const parts = raw.trim().split("-");
  const base = parts.length >= 2 ? parts[1]?.trim().toUpperCase() : "";
  return base ? base : null;
}

function unsupportedBaseError(base: string): string {
  if (base === DERIVATIVES_QUOTE) {
    return "USDT 마켓은 파생 데이터를 제공하지 않습니다.";
  }
  return "이 마켓의 파생 데이터를 제공하지 않습니다.";
}

export function useDerivatives(selectedMarket: Ref<string>) {
  const derivatives = ref<DerivativesView | null>(null);
  const loading = ref(false);
  const error = ref("");

  const hasDerivatives = computed(() => derivatives.value !== null);

  async function loadDerivatives(nextMarket = selectedMarket.value) {
    const base = parseBase(nextMarket);
    // No tradable base, or the base is the perp quote itself => no derivatives.
    if (!base || base === DERIVATIVES_QUOTE) {
      derivatives.value = null;
      error.value = base ? unsupportedBaseError(base) : "잘못된 마켓 선택입니다.";
      return;
    }

    loading.value = true;
    error.value = "";
    derivatives.value = null;

    // Query the coin's USDT linear perpetual regardless of the Upbit quote (KRW/BTC/USDT).
    const symbol = `${base}/${DERIVATIVES_QUOTE}`;
    try {
      const payload = await getDerivativesBySymbol(symbol, "linear");
      if (payload?.openInterest || payload?.fundingRate) {
        derivatives.value = payload;
        return;
      }
      error.value = unsupportedBaseError(base);
    } catch {
      error.value = "파생 데이터를 불러오지 못했습니다.";
    } finally {
      loading.value = false;
    }
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
