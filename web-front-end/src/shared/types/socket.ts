import {
  CandleDto,
  OrderbookDto,
  TickerDto,
  Market,
  TradeDto, // TradeDto import 추가
} from "@/entities/market/types/types";

export type SocketNamespace = "/exchange" | "/market";

export type WorkerCommand =
  | { type: "CONNECT"; payload: { namespace: SocketNamespace; url: string } }
  | { type: "DISCONNECT"; payload: { namespace: SocketNamespace } }
  | {
      type: "SUBSCRIBE_ORDERBOOK";
      payload: { namespace: SocketNamespace; markets: string[] };
    }
  | {
      type: "UNSUBSCRIBE_ORDERBOOK";
      payload: { namespace: SocketNamespace; markets: string[] };
    }
  | {
      type: "SUBSCRIBE_CANDLE";
      payload: { namespace: SocketNamespace; markets: string[] };
    }
  | {
      type: "UNSUBSCRIBE_CANDLE";
      payload: { namespace: SocketNamespace; markets: string[] };
    }
  | {
      type: "SUBSCRIBE_TICKER";
      payload: { namespace: SocketNamespace; markets: string[] };
    }
  | {
      type: "UNSUBSCRIBE_TICKER";
      payload: { namespace: SocketNamespace; markets: string[] };
    }
  | {
      type: "SUBSCRIBE_TRADE";
      payload: { namespace: SocketNamespace; markets: string[] };
    }
  | {
      type: "UNSUBSCRIBE_TRADE";
      payload: { namespace: SocketNamespace; markets: string[] };
    }
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
      type: "TRADE_UPDATE";
      payload: { namespace: SocketNamespace; data: TradeDto[] };
    }
  | {
      type: "MARKET_DATA_UPDATE";
      payload: { namespace: SocketNamespace; data: Market[] };
    }
  | {
      type: "ERROR";
      payload: { namespace?: SocketNamespace; message: string };
    };
