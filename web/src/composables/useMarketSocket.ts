import { onUnmounted } from "vue";
import type { Channel, WorkerCommand, WorkerResponse } from "../workers/protocol.js";
import { useTickerStore } from "../stores/ticker.js";
import { useOrderbookStore } from "../stores/orderbook.js";
import { useCandleStore } from "../stores/candle.js";
import { useTradeStore } from "../stores/trade.js";
import { useValidationHealthStore } from "../stores/validation-health.js";
import type { TickerView, OrderbookView, CandleView, TradeView } from "../stores/types.js";

export function useMarketSocket() {
  const worker = new Worker(new URL("../workers/marketSocket.worker.ts", import.meta.url), { type: "module" });
  const ticker = useTickerStore();
  const orderbook = useOrderbookStore();
  const candle = useCandleStore();
  const trade = useTradeStore();
  const validationHealth = useValidationHealthStore();

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    if (message.type === "status") {
      validationHealth.recordConnectionStatus(message.connected);
      return;
    }
    if (message.type === "validation-error") {
      validationHealth.recordError(message.error);
      return;
    }
    if (message.type === "ticker") {
      ticker.applyTicker(message.data as TickerView[]);
    } else if (message.type === "orderbook") {
      (message.data as OrderbookView[]).forEach((item) => orderbook.applyOrderbook(item));
    } else if (message.type === "candle") {
      (message.data as CandleView[]).forEach((item) => candle.applyCandle(item));
    } else if (message.type === "trade") {
      (message.data as TradeView[]).forEach((item) => trade.applyTrade(item));
    }
  };

  const post = (command: WorkerCommand) => worker.postMessage(command);
  const subscribe = (channel: Channel, markets: string[]) => post({ type: "subscribe", channel, markets });
  const unsubscribe = (channel: Channel, markets: string[]) => post({ type: "unsubscribe", channel, markets });

  onUnmounted(() => worker.terminate());
  return { subscribe, unsubscribe };
}
