import io from "socket.io-client";
import { fromEvent, merge } from "rxjs";
import { tap } from "rxjs/operators";

type Socket = ReturnType<typeof io>;

import { WorkerCommand, WorkerResponse } from "@/shared/types/socket";
import {
  TickerDto,
  CandleDto,
  OrderbookDto,
} from "@/entities/market/types/types";

let socket: Socket | null = null;
const RECONNECT_DELAY = 5000;

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const { type } = event.data;

  switch (type) {
    case "CONNECT": {
      if (socket) {
        socket.disconnect();
      }
      // Connect to the exchange namespace
      socket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/exchange`, {
        reconnectionAttempts: 5,
        reconnectionDelay: RECONNECT_DELAY,
        transports: ["websocket"],
      });

      // Wrap socket.io events in RxJS Observables
      const connect$ = fromEvent(socket, "connect").pipe(
        tap(() => postMessage({ type: "CONNECTED" } as WorkerResponse))
      );
      const disconnect$ = fromEvent(socket, "disconnect").pipe(
        tap(() => postMessage({ type: "DISCONNECTED" } as WorkerResponse))
      );
      const error$ = fromEvent<Error>(socket, "connect_error").pipe(
        tap((error) =>
          postMessage({
            type: "ERROR",
            payload: { message: error.message },
          } as WorkerResponse)
        )
      );
      const tickerUpdate$ = fromEvent<TickerDto[]>(socket, "tickerUpdate").pipe(
        tap((data) => {
          console.log("Worker received Ticker Update:", data);
          postMessage({
            type: "TICKER_UPDATE",
            payload: data,
          } as WorkerResponse);
        })
      );
      const orderbookUpdate$ = fromEvent<OrderbookDto[]>(
        socket,
        "orderbookUpdate"
      ).pipe(
        tap((data) => {
          console.log("Worker received Orderbook Update:", data);
          postMessage({
            type: "ORDERBOOK_UPDATE",
            payload: data,
          } as WorkerResponse);
        })
      );
      const candleUpdate$ = fromEvent<CandleDto[]>(socket, "candleUpdate").pipe(
        tap((data) => {
          console.log("Worker received Candle Update:", data);
          postMessage({
            type: "CANDLE_UPDATE",
            payload: data,
          } as WorkerResponse);
        })
      );

      // Merge all observables and subscribe
      merge(
        connect$,
        disconnect$,
        error$,
        tickerUpdate$,
        orderbookUpdate$,
        candleUpdate$
      ).subscribe();

      break;
    }

    case "DISCONNECT":
      socket?.disconnect();
      socket = null;
      break;

    case "SUBSCRIBE_ORDERBOOK": {
      const { payload } = event.data as Extract<
        WorkerCommand,
        { type: "SUBSCRIBE_ORDERBOOK" }
      >;
      socket?.emit("subscribeOrderbook", payload.market);
      break;
    }

    case "UNSUBSCRIBE_ORDERBOOK": {
      const { payload } = event.data as Extract<
        WorkerCommand,
        { type: "UNSUBSCRIBE_ORDERBOOK" }
      >;
      socket?.emit("unsubscribeOrderbook", payload.market);
      break;
    }

    case "SUBSCRIBE_CANDLE": {
      const { payload } = event.data as Extract<
        WorkerCommand,
        { type: "SUBSCRIBE_CANDLE" }
      >;
      socket?.emit("subscribeCandle", payload.market);
      break;
    }

    case "UNSUBSCRIBE_CANDLE": {
      const { payload } = event.data as Extract<
        WorkerCommand,
        { type: "UNSUBSCRIBE_CANDLE" }
      >;
      socket?.emit("unsubscribeCandle", payload.market);
      break;
    }

    case "SUBSCRIBE_TICKER": {
      socket?.emit("subscribeTicker");
      break;
    }

    case "UNSUBSCRIBE_TICKER": {
      socket?.emit("unsubscribeTicker");
      break;
    }
  }
};
