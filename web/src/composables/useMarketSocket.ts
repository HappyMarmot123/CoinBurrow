import { onUnmounted } from "vue";
import type { Channel, WorkerCommand, WorkerResponse } from "../workers/protocol.js";
import { useTickerStore } from "../stores/ticker.js";
import { useOrderbookStore } from "../stores/orderbook.js";
import { useCandleStore } from "../stores/candle.js";
import { useTradeStore } from "../stores/trade.js";
import { useValidationHealthStore } from "../stores/validation-health.js";
import type { TickerView, OrderbookView, CandleView, TradeView } from "../stores/types.js";

//* 메인 스레드 내에서 단일 Web Worker 인스턴스를 유지 및 관리하며 스토어와 워커 사이의 가교 역할을 합니다.
//* worker.onmessage 이벤트 핸들러를 통해 워커에서 전달받은 WorkerResponse 타입을 처리합니다
//* subscribe 및 unsubscribe 함수를 통해 워커의 postMessage로 명령(WorkerCommand)을 전송합니다.
//* Next Step is marketSocket.worker.ts

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
    } else if (message.type === "candle" || message.type.startsWith("candle.")) {
      (message.data as CandleView[]).forEach((item) => candle.applyCandle(item));
    } else if (message.type === "trade") {
      const trades = message.data as TradeView[];
      trade.applyTrades(trades);
      trades.forEach((item) => ticker.applyTradeTick(item));
    }
  };

  const post = (command: WorkerCommand) => worker.postMessage(command);
  const subscribe = (channel: Channel, markets: string[]) => post({ type: "subscribe", channel, markets });
  const unsubscribe = (channel: Channel, markets: string[]) => post({ type: "unsubscribe", channel, markets });

  onUnmounted(() => worker.terminate());
  return { subscribe, unsubscribe };
}
