import { type Observable, merge } from "rxjs";
import { filter, map, groupBy, mergeMap, bufferTime, throttleTime } from "rxjs/operators";
import type { Channel, WorkerResponse } from "./protocol.js";

export function normalizeUpbit(raw: any): { channel: Channel; item: any } | null {
  const type: string = raw?.type ?? "";
  const market = raw.code ?? raw.market;

  if (type === "ticker") {
    return {
      channel: "ticker",
      item: {
        market,
        tradePrice: raw.trade_price,
        signedChangeRate: raw.signed_change_rate,
        accTradePrice24h: raw.acc_trade_price_24h,
      },
    };
  }

  if (type === "orderbook") {
    return {
      channel: "orderbook",
      item: {
        market,
        timestamp: raw.timestamp,
        units: (raw.orderbook_units ?? []).map((unit: any) => ({
          askPrice: unit.ask_price,
          bidPrice: unit.bid_price,
          askSize: unit.ask_size,
          bidSize: unit.bid_size,
        })),
      },
    };
  }

  if (type.startsWith("candle")) {
    return {
      channel: "candle",
      item: {
        market,
        timestamp: raw.timestamp,
        open: raw.opening_price,
        high: raw.high_price,
        low: raw.low_price,
        close: raw.trade_price,
        volume: raw.candle_acc_trade_volume,
      },
    };
  }

  if (type === "trade") {
    return {
      channel: "trade",
      item: {
        market,
        price: raw.trade_price,
        volume: raw.trade_volume,
        side: raw.ask_bid,
        timestamp: raw.timestamp,
      },
    };
  }

  return null;
}

export function createOutputStream(raw$: Observable<any>): Observable<WorkerResponse> {
  const normalized$ = raw$.pipe(
    map(normalizeUpbit),
    filter((value): value is { channel: Channel; item: any } => value !== null),
  );

  const ticker$ = normalized$.pipe(
    filter((value) => value.channel === "ticker"),
    bufferTime(100),
    filter((batch) => batch.length > 0),
    map((batch) => {
      const latest = new Map<string, any>();
      batch.forEach((value) => latest.set(value.item.market, value.item));
      return { type: "ticker" as Channel, data: [...latest.values()] };
    }),
  );

  const otherChannels$ = normalized$.pipe(
    filter((value) => value.channel !== "ticker"),
    groupBy((value) => value.channel),
    mergeMap((group) =>
      group.pipe(
        throttleTime(100, undefined, { leading: true, trailing: true }),
        map((value) => ({ type: value.channel, data: [value.item] })),
      ),
    ),
  );

  return merge(ticker$, otherChannels$);
}
