import { computed, ref, watch, type Ref } from "vue";

import type { BithumbMarketView } from "../api/rest.js";
import { getBithumbMarkets } from "../api/rest.js";

type BithumbMarketTuple = BithumbMarketView | null;

export interface BithumbMarketState {
  bithumbMarket: Ref<BithumbMarketTuple>;
  bithumbLoading: Ref<boolean>;
  bithumbError: Ref<string>;
  bithumbIsApplicable: Ref<boolean>;
  bithumbHasMarket: ReturnType<typeof computed<boolean>>;
}

function normalizeMarketForBithumb(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;

  if (trimmed.includes("-")) {
    const [quote, base] = trimmed.split("-");
    if (!base || !quote) return null;
    if (quote !== "KRW") return null;
    return `${base}/KRW`;
  }

  if (trimmed.includes("/")) {
    const [base, quote] = trimmed.split("/");
    if (!base || !quote) return null;
    if (quote !== "KRW") return null;
    return `${base}/KRW`;
  }

  return null;
}

export function useBithumbMarket(selectedMarket: Ref<string>) {
  const bithumbMarket = ref<BithumbMarketTuple>(null);
  const bithumbLoading = ref(false);
  const bithumbError = ref("");
  const bithumbIsApplicable = ref(false);
  let requestToken = 0;

  async function loadBithumbMarket(nextMarket: string) {
    const normalized = normalizeMarketForBithumb(nextMarket);
    const currentToken = ++requestToken;

    if (!normalized) {
      bithumbIsApplicable.value = false;
      bithumbMarket.value = null;
      bithumbError.value = "";
      bithumbLoading.value = false;
      return;
    }

    bithumbIsApplicable.value = true;
    bithumbLoading.value = true;
    bithumbError.value = "";

    try {
      const payload = await getBithumbMarkets([normalized]);
      const next = payload.find((item) => item.symbol === normalized) ?? payload[0];

      if (currentToken !== requestToken) return;

      if (next) {
        bithumbMarket.value = next;
      } else {
        bithumbMarket.value = null;
        bithumbError.value = "Bithumb market data is unavailable";
      }
    } catch (cause) {
      if (currentToken !== requestToken) return;
      bithumbError.value = cause instanceof Error ? cause.message : "failed to load Bithumb market data";
      bithumbMarket.value = null;
    } finally {
      if (currentToken === requestToken) {
        bithumbLoading.value = false;
      }
    }
  }

  watch(selectedMarket, (nextMarket) => {
    void loadBithumbMarket(nextMarket);
  }, {
    immediate: true,
  });

  return {
    bithumbMarket,
    bithumbLoading,
    bithumbError,
    bithumbIsApplicable,
    bithumbHasMarket: computed(() => bithumbMarket.value !== null),
  };
}
