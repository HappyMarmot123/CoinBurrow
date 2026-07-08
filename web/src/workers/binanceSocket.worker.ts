import { Subject } from "rxjs";
import { createBinanceOutputStream } from "./binancePipeline.js";
import { buildStreamParams, type BinanceWorkerCommand } from "./binanceProtocol.js";

const BINANCE_STREAM_URL = "wss://stream.binance.com:9443/stream";

const subscribed = new Set<string>(); // 대문자 심볼
const raw$ = new Subject<unknown>();
let ws: WebSocket | null = null;
let nextId = 1;

createBinanceOutputStream(raw$).subscribe((response) => self.postMessage(response));

function connect() {
  ws = new WebSocket(BINANCE_STREAM_URL);
  ws.onopen = () => {
    self.postMessage({ type: "status", connected: true });
    sendSubscription("SUBSCRIBE", [...subscribed]);
  };
  ws.onclose = () => {
    self.postMessage({ type: "status", connected: false });
    setTimeout(connect, 3000);
  };
  ws.onerror = () => ws?.close();
  ws.onmessage = (event) => {
    try {
      raw$.next(JSON.parse(event.data as string));
    } catch {
      // 비정상 프레임 무시
    }
  };
}

function sendSubscription(method: "SUBSCRIBE" | "UNSUBSCRIBE", symbols: string[]) {
  if (ws?.readyState !== WebSocket.OPEN) return;
  const params = buildStreamParams(symbols);
  if (params.length === 0) return;
  ws.send(JSON.stringify({ method, params, id: nextId++ }));
}

self.onmessage = (event: MessageEvent<BinanceWorkerCommand>) => {
  const { type, symbols } = event.data;
  const upper = symbols.map((symbol) => symbol.toUpperCase());

  if (type === "subscribe") {
    const added = upper.filter((symbol) => !subscribed.has(symbol));
    added.forEach((symbol) => subscribed.add(symbol));
    sendSubscription("SUBSCRIBE", added);
  } else {
    const removed = upper.filter((symbol) => subscribed.has(symbol));
    removed.forEach((symbol) => subscribed.delete(symbol));
    sendSubscription("UNSUBSCRIBE", removed);
  }
};

connect();
