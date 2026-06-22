import { computed, ref, watch, type Ref } from "vue";

import type { BithumbOrderbookView } from "../api/rest.js";
import { getBithumbOrderbook } from "../api/rest.js";

function normalizeSymbolForBithumb(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;

  if (trimmed.includes("-")) {
    const [quote, base] = trimmed.split("-");
    if (!quote || !base || quote !== "KRW") return null;
    return `${base}/KRW`;
  }

  if (trimmed.includes("/")) {
    const [base, quote] = trimmed.split("/");
    if (!base || !quote || quote !== "KRW") return null;
    return `${base}/KRW`;
  }

  return null;
}

export interface BithumbOrderbookState {
  orderbook: Ref<BithumbOrderbookView | null>;
  loading: Ref<boolean>;
  error: Ref<string>;
  isApplicable: Ref<boolean>;
  hasOrderbook: ReturnType<typeof computed<boolean>>;
}

export function useBithumbOrderbook(selectedMarket: Ref<string>) {
  const orderbook = ref<BithumbOrderbookView | null>(null);
  const loading = ref(false);
  const error = ref("");
  const isApplicable = ref(false);
  let requestToken = 0;

  async function loadMarketOrderbook(nextMarket: string) {
    const normalized = normalizeSymbolForBithumb(nextMarket);
    const currentToken = ++requestToken;

    if (!normalized) {
      isApplicable.value = false;
      loading.value = false;
      error.value = "";
      orderbook.value = null;
      return;
    }

    isApplicable.value = true;
    loading.value = true;
    error.value = "";

    try {
      const payload = await getBithumbOrderbook(normalized);
      if (currentToken !== requestToken) return;

      orderbook.value = payload;
    } catch (cause) {
      if (currentToken !== requestToken) return;
      orderbook.value = null;
      error.value = cause instanceof Error ? cause.message : "failed to load Bithumb orderbook";
    } finally {
      if (currentToken === requestToken) {
        loading.value = false;
      }
    }
  }

  watch(selectedMarket, (nextMarket) => {
    void loadMarketOrderbook(nextMarket);
  }, {
    immediate: true,
  });

  return {
    orderbook,
    loading,
    error,
    isApplicable,
    hasOrderbook: computed(() => orderbook.value !== null),
  };
}
