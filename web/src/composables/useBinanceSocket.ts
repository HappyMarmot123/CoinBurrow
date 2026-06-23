import { onUnmounted } from "vue";
import { useBinanceStore } from "../stores/binance.js";
import type {
  BinancePriceUpdate,
  BinanceWorkerCommand,
  BinanceWorkerResponse,
} from "../workers/binanceProtocol.js";

export function useBinanceSocket() {
  const worker = new Worker(
    new URL("../workers/binanceSocket.worker.ts", import.meta.url),
    { type: "module" },
  );
  const binance = useBinanceStore();

  worker.onmessage = (event: MessageEvent<BinanceWorkerResponse>) => {
    const message = event.data;
    if (message.type === "binance-ticker") {
      binance.applyPrices(message.data as BinancePriceUpdate[]);
    }
  };

  const post = (command: BinanceWorkerCommand) => worker.postMessage(command);
  const subscribe = (symbols: string[]) => post({ type: "subscribe", symbols });
  const unsubscribe = (symbols: string[]) => post({ type: "unsubscribe", symbols });

  onUnmounted(() => worker.terminate());
  return { subscribe, unsubscribe };
}
