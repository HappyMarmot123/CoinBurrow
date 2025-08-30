import {
  CandleDto,
  OrderbookDto,
  TickerDto,
  Market, // Market 타입 추가
} from "@/entities/market/types/types";

export type SocketNamespace = "/exchange" | "/market"; // Nest 게이트웨이 네임스페이스 타입 정의

export type WorkerCommand =
  | { type: "CONNECT"; payload: { namespace: SocketNamespace; url: string } }
  | { type: "DISCONNECT"; payload: { namespace: SocketNamespace } }
  | {
      type: "SUBSCRIBE_ORDERBOOK";
      payload: { namespace: SocketNamespace; market: string };
    }
  | {
      type: "UNSUBSCRIBE_ORDERBOOK";
      payload: { namespace: SocketNamespace; market: string };
    }
  | {
      type: "SUBSCRIBE_CANDLE";
      payload: { namespace: SocketNamespace; market: string };
    }
  | {
      type: "UNSUBSCRIBE_CANDLE";
      payload: { namespace: SocketNamespace; market: string };
    }
  | { type: "SUBSCRIBE_TICKER"; payload: { namespace: SocketNamespace } }
  | { type: "UNSUBSCRIBE_TICKER"; payload: { namespace: SocketNamespace } }
  | { type: "SUBSCRIBE_MARKET_DATA"; payload: { namespace: SocketNamespace } }
  | {
      type: "UNSUBSCRIBE_MARKET_DATA";
      payload: { namespace: SocketNamespace };
    };

export type WorkerResponse =
  | { type: "CONNECTED"; payload: { namespace: SocketNamespace } }
  | { type: "DISCONNECTED"; payload: { namespace: SocketNamespace } }
  | {
      type: "TICKER_UPDATE";
      payload: { namespace: SocketNamespace; data: TickerDto[] };
    }
  | {
      type: "ORDERBOOK_UPDATE";
      payload: { namespace: SocketNamespace; data: OrderbookDto[] };
    }
  | {
      type: "CANDLE_UPDATE";
      payload: { namespace: SocketNamespace; data: CandleDto[] };
    }
  | {
      type: "MARKET_DATA_UPDATE";
      payload: { namespace: SocketNamespace; data: Market[] };
    }
  | {
      type: "ERROR";
      payload: { namespace?: SocketNamespace; message: string };
    };
