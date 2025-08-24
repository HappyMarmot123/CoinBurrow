import {
  CandleDto,
  OrderbookDto,
  TickerDto,
} from "@/entities/market/types/types";

// Main Thread -> Worker
export type WorkerCommand =
  | { type: "CONNECT"; payload: { url: string } }
  | { type: "DISCONNECT" }
  | { type: "SUBSCRIBE_ORDERBOOK"; payload: { market: string } }
  | { type: "UNSUBSCRIBE_ORDERBOOK"; payload: { market: string } }
  | { type: "SUBSCRIBE_CANDLE"; payload: { market: string } }
  | { type: "UNSUBSCRIBE_CANDLE"; payload: { market: string } }
  | { type: "SUBSCRIBE_TICKER" }
  | { type: "UNSUBSCRIBE_TICKER" };

// Worker -> Main Thread
export type WorkerResponse =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "TICKER_UPDATE"; payload: TickerDto[] }
  | { type: "ORDERBOOK_UPDATE"; payload: OrderbookDto[] }
  | { type: "CANDLE_UPDATE"; payload: CandleDto[] }
  | { type: "ERROR"; payload: { message: string } };
