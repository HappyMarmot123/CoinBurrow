import io from "socket.io-client";
import { fromEvent, merge, Subscription } from "rxjs"; // Subscription import 추가
import { tap } from "rxjs/operators";

type Socket = ReturnType<typeof io>;

import {
  WorkerCommand,
  WorkerResponse,
  SocketNamespace,
} from "@/shared/types/socket";
import {
  TickerDto,
  CandleDto,
  OrderbookDto,
  TradeDto,
} from "@/entities/market/types/types";

const RECONNECT_DELAY = 5000;

class SocketManager {
  private socket: Socket | null = null;
  private subscriptions = new Subscription();

  constructor(private namespace: SocketNamespace, private url: string) {}

  connect() {
    if (this.socket) {
      this.disconnect();
    }
    this.socket = io(`${this.url}${this.namespace}`, {
      reconnectionAttempts: 5,
      reconnectionDelay: RECONNECT_DELAY,
      transports: ["websocket"],
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.subscriptions.unsubscribe(); // 기존 구독 해제
      this.subscriptions = new Subscription(); // 새 Subscription 객체 생성
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    const connect$ = fromEvent(this.socket, "connect").pipe(
      tap(() =>
        self.postMessage({
          type: "CONNECTED",
          payload: { namespace: this.namespace },
        } as WorkerResponse)
      )
    );
    const disconnect$ = fromEvent(this.socket, "disconnect").pipe(
      tap(() =>
        self.postMessage({
          type: "DISCONNECTED",
          payload: { namespace: this.namespace },
        } as WorkerResponse)
      )
    );
    const error$ = fromEvent<Error>(this.socket, "connect_error").pipe(
      tap((error) =>
        self.postMessage({
          type: "ERROR",
          payload: { namespace: this.namespace, message: error.message },
        } as WorkerResponse)
      )
    );
    const generalError$ = fromEvent<Error>(this.socket, "error").pipe(
      tap((error) =>
        self.postMessage({
          type: "ERROR",
          payload: {
            namespace: this.namespace,
            message: `General Socket Error: ${error.message}`,
          },
        } as WorkerResponse)
      )
    );

    // Ticker Update
    const tickerUpdate$ = fromEvent<TickerDto[]>(this.socket, "ticker").pipe(
      tap((data) => {
        // console.log(`Worker received Ticker Update (${this.namespace}):`, data);
        self.postMessage({
          type: "TICKER_UPDATE",
          payload: { namespace: this.namespace, data },
        } as WorkerResponse);
      })
    );

    // Orderbook Update
    const orderbookUpdate$ = fromEvent<OrderbookDto[]>(
      this.socket,
      "orderbook"
    ).pipe(
      tap((data) => {
        // console.log(
        //   `Worker received Orderbook Update (${this.namespace}):`,
        //   data
        // );
        self.postMessage({
          type: "ORDERBOOK_UPDATE",
          payload: { namespace: this.namespace, data },
        } as WorkerResponse);
      })
    );

    // Candle Update
    const candleUpdate$ = fromEvent<CandleDto[]>(this.socket, "candle").pipe(
      tap((data) => {
        console.log(`Worker received Candle Update (${this.namespace}):`, data);
        self.postMessage({
          type: "CANDLE_UPDATE",
          payload: { namespace: this.namespace, data },
        } as WorkerResponse);
      })
    );

    // Trade Ticks Update (UpbitWebSocketTrade에 해당)
    const tradeTicksUpdate$ = fromEvent<TradeDto[]>(this.socket, "trade").pipe(
      tap((data) => {
        self.postMessage({
          type: "TRADE_UPDATE",
          payload: { namespace: this.namespace, data },
        } as WorkerResponse);
      })
    );

    // Merge all observables and subscribe
    this.subscriptions.add(
      merge(
        connect$,
        disconnect$,
        error$,
        generalError$,
        tickerUpdate$,
        orderbookUpdate$,
        candleUpdate$,
        tradeTicksUpdate$
      ).subscribe()
    );
  }

  emit(event: string, ...args: unknown[]) {
    // any 대신 unknown[] 사용
    this.socket?.emit(event, ...args);
  }
}

const socketManagers = new Map<SocketNamespace, SocketManager>();

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const { type, payload } = event.data;

  switch (type) {
    case "CONNECT": {
      const { namespace, url } = payload;
      let manager = socketManagers.get(namespace);
      if (!manager) {
        manager = new SocketManager(namespace, url);
        socketManagers.set(namespace, manager);
      }
      manager.connect();
      break;
    }

    case "DISCONNECT": {
      const { namespace } = payload;
      const manager = socketManagers.get(namespace);
      if (manager) {
        manager.disconnect();
        socketManagers.delete(namespace);
      }
      break;
    }

    case "SUBSCRIBE_ORDERBOOK": {
      const { namespace, markets } = payload;
      socketManagers.get(namespace)?.emit("subscribe_orderbook", markets);
      break;
    }

    case "UNSUBSCRIBE_ORDERBOOK": {
      const { namespace, markets } = payload;
      socketManagers.get(namespace)?.emit("unsubscribe_orderbook", markets);
      break;
    }

    case "SUBSCRIBE_CANDLE": {
      const { namespace, markets } = payload;
      console.log("SUBSCRIBE_CANDLE", namespace, markets);
      socketManagers.get(namespace)?.emit("subscribe_candle", markets);
      break;
    }

    case "UNSUBSCRIBE_CANDLE": {
      const { namespace, markets } = payload;
      socketManagers.get(namespace)?.emit("unsubscribe_candle", markets);
      break;
    }

    case "SUBSCRIBE_TICKER": {
      const { namespace } = payload;
      socketManagers.get(namespace)?.emit("subscribe_ticker");
      break;
    }

    case "UNSUBSCRIBE_TICKER": {
      const { namespace } = payload;
      socketManagers.get(namespace)?.emit("unsubscribe_ticker");
      break;
    }

    case "SUBSCRIBE_TRADE": {
      const { namespace, markets } = payload;
      socketManagers.get(namespace)?.emit("subscribe_trade", markets);
      break;
    }

    case "UNSUBSCRIBE_TRADE": {
      const { namespace, markets } = payload;
      socketManagers.get(namespace)?.emit("unsubscribe_trade", markets);
      break;
    }
  }
};
