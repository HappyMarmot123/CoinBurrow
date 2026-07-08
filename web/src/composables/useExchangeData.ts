import { computed, ref, watch, type Ref } from "vue";
import { getCandles, getCoinList, getTradeSnapshot, type CandleTimeframe } from "../api/rest.js";
import { DEFAULT_MARKET } from "../constants/market.js";
import { useMarketSocket } from "./useMarketSocket.js";
import { useCandleStore } from "../stores/candle.js";
import { useMarketStore } from "../stores/market.js";
import { useOrderbookStore } from "../stores/orderbook.js";
import { useTradeStore } from "../stores/trade.js";
import { useTickerStore } from "../stores/ticker.js";

type CandleSubscriptionChannel = "candle" | `candle.${string}`;

interface UseExchangeDataOptions {
  market: Ref<string>;
  candleTimeframe: Ref<CandleTimeframe>;
  candleCount: Ref<number>;
  loadMarketStatus: (market: string) => Promise<void>;
}

function resolveCandleSubscriptionChannel(
  timeframe: CandleTimeframe,
): CandleSubscriptionChannel | null {
  if (timeframe === "1s") return "candle.1s";
  if (timeframe === "1m") return "candle.1m";
  if (timeframe === "3m") return "candle.3m";
  if (timeframe === "5m") return "candle.5m";
  if (timeframe === "10m") return "candle.10m";
  if (timeframe === "15m") return "candle.15m";
  if (timeframe === "30m") return "candle.30m";
  if (timeframe === "60m") return "candle.60m";
  if (timeframe === "240m") return "candle.240m";
  if (timeframe === "1h") return "candle.60m";
  if (timeframe === "4h") return "candle.240m";
  return null;
}

export function useExchangeData({
  market,
  candleTimeframe,
  candleCount,
  loadMarketStatus,
}: UseExchangeDataOptions) {
  const tradeStore = useTradeStore();
  const { subscribe, unsubscribe } = useMarketSocket();
  const marketStore = useMarketStore();
  const candleStore = useCandleStore();
  const tickerStore = useTickerStore();
  const orderbookStore = useOrderbookStore();
  const exchangeError = ref("");
  const activeCandleChannel = ref<CandleSubscriptionChannel | null>(null);
  const activeTickerMarkets = ref<string[]>([]);
  let marketLoadRequestId = 0;

  const selectedMarketLabel = computed(() => {
    const current = marketStore.list.find((item) => item.market === market.value);
    if (!current) return market.value;
    return `${current.koreanName} (${current.englishName})`;
  });

  const liveTicker = computed(() => tickerStore.byMarket[market.value]);
  const selectedOrderbook = computed(() => orderbookStore.current);
  const selectedMarketSpread = computed(() => {
    const rows = selectedOrderbook.value?.units ?? [];
    if (rows.length === 0) return null;
    const ask = rows[0].askPrice;
    const bid = rows[0].bidPrice;
    if (!ask || !bid) return null;
    return {
      ask,
      bid,
      ratio: ((ask - bid) / bid) * 100,
      amount: ask - bid,
    };
  });

  const topByVolume = computed(() => {
    return [...Object.values(tickerStore.byMarket)]
      .filter((item) => typeof item.accTradePrice24h === "number")
      .sort((a, b) => b.accTradePrice24h - a.accTradePrice24h)
      .slice(0, 3);
  });

  const topGainers = computed(() => {
    return [...Object.values(tickerStore.byMarket)]
      .filter((item) => typeof item.signedChangeRate === "number")
      .sort((a, b) => b.signedChangeRate - a.signedChangeRate)
      .slice(0, 3);
  });

  const topLosers = computed(() => {
    return [...Object.values(tickerStore.byMarket)]
      .filter((item) => typeof item.signedChangeRate === "number")
      .sort((a, b) => a.signedChangeRate - b.signedChangeRate)
      .slice(0, 3);
  });

  function resolveMarketName(marketCode: string): string {
    const found = marketStore.list.find((item) => item.market === marketCode);
    return found ? found.koreanName : marketCode;
  }

  async function loadMarketsByQuote(nextQuote: string): Promise<string> {
    const previousMarkets = [...activeTickerMarkets.value];

    try {
      const list = await getCoinList({ quote: nextQuote, isDetails: false });
      marketStore.setList(list);

      const nextMarkets = list.map((item) => item.market);

      const toSubscribe = nextMarkets.filter((marketCode) => !previousMarkets.includes(marketCode));
      const toUnsubscribe = previousMarkets.filter((marketCode) => !nextMarkets.includes(marketCode));

      if (toUnsubscribe.length > 0) {
        unsubscribe("ticker", toUnsubscribe);
      }
      if (toSubscribe.length > 0) {
        subscribe("ticker", toSubscribe);
      }

      activeTickerMarkets.value = nextMarkets;

      const nextSelected = list.some((item) => item.market === market.value)
        ? market.value
        : list[0]?.market;

      if (nextSelected) {
        market.value = nextSelected;
      } else {
        market.value = DEFAULT_MARKET;
      }

      exchangeError.value = "";
      return market.value;
    } catch (error) {
      exchangeError.value = `코인 목록 로딩 실패: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`;
      return market.value;
    }
  }

  async function loadMarket(nextMarket: string) {
    const requestId = ++marketLoadRequestId;
    const requestTimeframe = candleTimeframe.value;
    const requestCount = candleCount.value;
    const isStaleRequest = () =>
      requestId !== marketLoadRequestId
      || nextMarket !== market.value
      || requestTimeframe !== candleTimeframe.value
      || requestCount !== candleCount.value;

    if (!nextMarket) {
      if (!isStaleRequest()) {
        candleStore.setInitial([]);
      }
      return;
    }

    try {
      const candles = await getCandles(nextMarket, {
        timeframe: requestTimeframe,
        count: requestCount,
      });
      if (isStaleRequest()) return;
      candleStore.setInitial(candles);
      exchangeError.value = "";
    } catch (error) {
      if (isStaleRequest()) return;
      candleStore.setInitial([]);
      exchangeError.value = `캔들 로딩 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
    }

    if (isStaleRequest()) return;

    const nextCandleChannel = resolveCandleSubscriptionChannel(requestTimeframe);

    if (activeCandleChannel.value && activeCandleChannel.value !== nextCandleChannel) {
      unsubscribe(activeCandleChannel.value, [nextMarket]);
    }

    subscribe("orderbook", [nextMarket]);
    subscribe("trade", [nextMarket]);

    if (nextCandleChannel) {
      subscribe(nextCandleChannel, [nextMarket]);
    } else if (activeCandleChannel.value) {
      unsubscribe(activeCandleChannel.value, [nextMarket]);
    }
    activeCandleChannel.value = nextCandleChannel;

    try {
      const trades = await getTradeSnapshot(nextMarket, {
        count: Math.min(requestCount, 50),
      });
      if (isStaleRequest()) return;
      tradeStore.setInitial(trades);
    } catch {
      if (isStaleRequest()) return;
      tradeStore.setInitial([]);
    }

    if (isStaleRequest()) return;
    await loadMarketStatus(nextMarket);
  }

  function unsubscribeMarket(previousMarket: string | undefined) {
    if (!previousMarket) return;
    unsubscribe("orderbook", [previousMarket]);
    unsubscribe("trade", [previousMarket]);
    if (activeCandleChannel.value) {
      unsubscribe(activeCandleChannel.value, [previousMarket]);
    }
    activeCandleChannel.value = null;
  }

  watch(
    () => tradeStore.recent[0],
    (trade) => {
      if (!trade || trade.market !== market.value) return;
      candleStore.applyTradeTick(trade, candleTimeframe.value, candleCount.value);
    },
  );

  return {
    market,
    exchangeError,
    activeCandleChannel,
    activeTickerMarkets,
    selectedMarketLabel,
    liveTicker,
    selectedOrderbook,
    selectedMarketSpread,
    topByVolume,
    topGainers,
    topLosers,
    resolveMarketName,
    loadMarketsByQuote,
    loadMarket,
    unsubscribeMarket,
  };
}
