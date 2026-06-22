import { ref, type Ref, watch } from "vue";
import type { MarketSummaryView, CoinMetaView } from "../api/rest.js";
import { getCoinMetaByProvider } from "../api/rest.js";

const COINGECKO_SYMBOL_ID_OVERRIDES: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  xrp: "ripple",
  usdt: "tether",
  usdc: "usd-coin",
  usdceth: "usd-coin",
  bnb: "binancecoin",
  ada: "cardano",
  doge: "dogecoin",
  sol: "solana",
  ltc: "litecoin",
  trx: "tron",
  dot: "polkadot",
  bch: "bitcoin-cash",
  xmr: "monero",
  bsv: "bitcoin-sv",
  ton: "the-open-network",
  etc: "ethereum-classic",
};

const COINPAPRIKA_SYMBOL_ID_OVERRIDES: Record<string, string> = {
  btc: "btc-bitcoin",
  eth: "eth-ethereum",
  xrp: "xrp-xrp",
  usdt: "usdt-tether",
  usdc: "usdc-usd-coin",
  bnb: "bnb-binance-coin",
  ada: "ada-cardano",
  doge: "doge-dogecoin",
  sol: "sol-solana",
  ltc: "ltc-litecoin",
  trx: "trx-tron",
  dot: "dot-polkadot",
  xmr: "xmr-monero",
  bsv: "bsv-bitcoin-sv",
  ton: "ton-ton",
};

const toLower = (value: string): string => value.trim().toLowerCase();

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export interface CoinMetaState {
  coinMeta: Ref<CoinMetaView | null>;
  coinMetaSource: Ref<"coingecko" | "coinpaprika" | "">;
  coinMetaError: Ref<string>;
  coinMetaLoading: Ref<boolean>;
  coinMetaLookupId: Ref<string>;
}

export function useCoinMeta(
  selectedMarket: Ref<string>,
  selectedMarketSummary: Ref<MarketSummaryView | undefined> | null,
): CoinMetaState {
  const coinMeta = ref<CoinMetaView | null>(null);
  const coinMetaSource = ref<"coingecko" | "coinpaprika" | "">("");
  const coinMetaError = ref("");
  const coinMetaLoading = ref(false);
  const coinMetaLookupId = ref("");
  let requestToken = 0;

  function resolveCoinPaprikaId(asset: string): string | undefined {
    return COINPAPRIKA_SYMBOL_ID_OVERRIDES[asset] ?? undefined;
  }

  function resolveCoingeckoIds(asset: string, englishName?: string): string[] {
    const assetCandidate = toLower(asset);
    const override = COINGECKO_SYMBOL_ID_OVERRIDES[assetCandidate];
    const slug = englishName ? slugify(englishName) : "";

    return uniqueStrings([
      ...(override ? [override] : []),
      slug,
      assetCandidate,
    ]).filter(Boolean);
  }

  async function loadMeta(marketCode: string) {
    const currentToken = ++requestToken;
    const asset = marketCode.split("-").at(-1)?.trim().toLowerCase() ?? "";
    const summaryName = selectedMarketSummary?.value?.englishName;
    const candidates = resolveCoingeckoIds(asset, summaryName);
    const fallbackCoinPaprikaId = resolveCoinPaprikaId(asset);
    const preferred = candidates[0] ?? "";

    if (!preferred) {
      coinMeta.value = null;
      coinMetaSource.value = "";
      coinMetaError.value = "";
      return;
    }

    coinMeta.value = null;
    coinMetaSource.value = "";
    coinMetaError.value = "";
    coinMetaLoading.value = true;
    coinMetaLookupId.value = `${marketCode} | ${preferred}`;

    try {
      let payload: CoinMetaView | null = null;
      for (const candidate of candidates) {
        try {
          payload = await getCoinMetaByProvider("coingecko", { coinId: candidate });
          if (payload) {
            break;
          }
        } catch {
          // keep trying other candidate IDs
        }
      }

      if (!payload && fallbackCoinPaprikaId) {
        try {
          payload = await getCoinMetaByProvider("coinpaprika", { coinId: fallbackCoinPaprikaId });
        } catch {
          // fallback failed
        }
      }

      if (currentToken !== requestToken) return;

      if (payload) {
        coinMeta.value = payload;
        coinMetaSource.value = payload.coinId === fallbackCoinPaprikaId ? "coinpaprika" : "coingecko";
        coinMetaError.value = "";
        return;
      }

      coinMetaError.value = "metadata not found";
    } catch {
      coinMetaError.value = "metadata request failed";
      coinMeta.value = null;
      coinMetaSource.value = "";
    } finally {
      if (currentToken === requestToken) {
        coinMetaLoading.value = false;
      }
    }
  }

  watch([selectedMarket, () => selectedMarketSummary?.value?.englishName], async () => {
    if (!selectedMarket.value) {
      coinMeta.value = null;
      coinMetaSource.value = "";
      coinMetaError.value = "";
      coinMetaLoading.value = false;
      coinMetaLookupId.value = "";
      return;
    }

    await loadMeta(selectedMarket.value);
  }, {
    immediate: true,
    deep: false,
  });

  return {
    coinMeta,
    coinMetaSource,
    coinMetaError,
    coinMetaLoading,
    coinMetaLookupId,
  };
}
