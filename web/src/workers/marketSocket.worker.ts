import { Subject } from "rxjs";
import { buildUpbitSubscription, type Channel, type WorkerCommand } from "./protocol.js";
import { createOutputStream } from "./pipeline.js";
import { createNormalizedError } from "../shared/validation/error/normalized-error.js";

const UPBIT_WS = "wss://api.upbit.com/websocket/v1";
const subs: Record<Channel, Set<string>> = {
  ticker: new Set(),
  orderbook: new Set(),
  candle: new Set(),
  trade: new Set(),
};
const raw$ = new Subject<any>();
let ws: WebSocket | null = null;

createOutputStream(raw$).subscribe((response) => self.postMessage(response));

function connect() {
  ws = new WebSocket(UPBIT_WS);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => {
    self.postMessage({ type: "status", connected: true });
    sendSubscription();
  };
  ws.onclose = () => {
    self.postMessage({ type: "status", connected: false });
    setTimeout(connect, 3000);
  };
  ws.onerror = () => ws?.close();
  ws.onmessage = (event) => {
    const text =
      typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
    try {
      raw$.next(JSON.parse(text));
    } catch {
      self.postMessage({
        type: "validation-error",
        error: createNormalizedError({
          source: "websocket",
          code: "SCHEMA_MISMATCH",
          message: "Malformed WebSocket JSON frame",
          retryable: true,
          provider: "upbit",
        }),
      });
    }
  };
}

function sendSubscription() {
  if (ws?.readyState !== WebSocket.OPEN) return;
  const hasAnySubscription = Object.values(subs).some((markets) => markets.size > 0);
  if (hasAnySubscription) {
    ws.send(JSON.stringify(buildUpbitSubscription(subs)));
  }
}

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const { type, channel, markets } = event.data;
  if (type === "subscribe") {
    markets.forEach((market) => subs[channel].add(market));
  } else {
    markets.forEach((market) => subs[channel].delete(market));
  }
  sendSubscription();
};

connect();
