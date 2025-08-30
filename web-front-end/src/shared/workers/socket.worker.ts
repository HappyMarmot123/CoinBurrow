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

    // Ticker Update
    const tickerUpdate$ = fromEvent<TickerDto[]>(
      this.socket,
      "tickerUpdate"
    ).pipe(
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
      "orderbookUpdate"
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
    const candleUpdate$ = fromEvent<CandleDto[]>(
      this.socket,
      "candleUpdate"
    ).pipe(
      tap((data) => {
        // console.log(`Worker received Candle Update (${this.namespace}):`, data);
        self.postMessage({
          type: "CANDLE_UPDATE",
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
        tickerUpdate$,
        orderbookUpdate$,
        candleUpdate$
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
      const { namespace, market } = payload;
      socketManagers.get(namespace)?.emit("subscribeOrderbook", market);
      break;
    }

    case "UNSUBSCRIBE_ORDERBOOK": {
      const { namespace, market } = payload;
      socketManagers.get(namespace)?.emit("unsubscribeOrderbook", market);
      break;
    }

    case "SUBSCRIBE_CANDLE": {
      const { namespace, market } = payload;
      socketManagers.get(namespace)?.emit("subscribeCandle", market);
      break;
    }

    case "UNSUBSCRIBE_CANDLE": {
      const { namespace, market } = payload;
      socketManagers.get(namespace)?.emit("unsubscribeCandle", market);
      break;
    }

    case "SUBSCRIBE_TICKER": {
      const { namespace } = payload;
      socketManagers.get(namespace)?.emit("subscribeTicker");
      break;
    }

    case "UNSUBSCRIBE_TICKER": {
      const { namespace } = payload;
      socketManagers.get(namespace)?.emit("unsubscribeTicker");
      break;
    }
  }
};
