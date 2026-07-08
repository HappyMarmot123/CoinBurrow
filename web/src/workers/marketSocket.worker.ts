import { Subject } from "rxjs";
import { buildUpbitSubscription, type Channel, type WorkerCommand } from "./protocol.js";
import { createOutputStream } from "./pipeline.js";
import { UPBIT_WS_URL } from "../constants/upbit.js";

//* 백그라운드 스레드에서 돌아가며 WebSocket 연결 유지 및 구독 목록 관리를 수행합니다.
//* subs 객체에 채널별 구독 중인 마켓 리스트(Set<string>)를 유지합니다.
//* 메인스레드 메세지에 따라  subs 상태를 업데이트 합니다.
//* 웹소켓 이벤트 데이터를 TextDecoder 디코딩 후 JSON.parse를 거쳐 RxJS Subject인 raw$ 스트림에 push합니다.
//* Next step is pipeline.js

const subs: Record<string, Set<string>> = {
  ticker: new Set(),
  orderbook: new Set(),
  candle: new Set(),
  trade: new Set(),
};
const raw$ = new Subject<any>();
let ws: WebSocket | null = null;

createOutputStream(raw$).subscribe((response) => self.postMessage(response));

function connect() {
  ws = new WebSocket(UPBIT_WS_URL);
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
      // Ignore malformed frames from the upstream socket.
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
    if (!subs[channel]) {
      subs[channel] = new Set();
    }
    markets.forEach((market) => subs[channel].add(market));
  } else {
    if (!subs[channel]) {
      return;
    }
    markets.forEach((market) => subs[channel].delete(market));
  }
  sendSubscription();
};

connect();
