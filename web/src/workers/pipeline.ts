import { type Observable, merge } from "rxjs";
import { filter, map, groupBy, mergeMap, bufferTime, throttleTime, share } from "rxjs/operators";
import type { Channel, WorkerResponse } from "./protocol.js";
import { parseWithSchema } from "../shared/validation/parse.js";
import { schemaForUpbitMessage } from "../shared/validation/schemas/ws/upbit.js";
import type { NormalizedError } from "../shared/validation/error/normalized-error.js";

//* WebSocket으로부터 전달받은 날것의 이벤트(raw$) 스트림을 가공, 정규화, 검증하여 최종적으로 메인 스레드로 발행하는 출력 스트림(createOutputStream)을 구성합니다.
//* parseUpbitMessage zod 검증 진행, 에러 진행시 useMarketSocket에서 감지되어 validation-health.ts 으로 전달
//* 스트림 데이터는 useMarketSocket의 worker.onmessage에서 Pinia 스토어로 전달.

type ParsedUpbitMessage =
  | { kind: "item"; channel: Channel; item: any }
  | { kind: "error"; error: NormalizedError }
  | null;

const CANDLE_INTERVALS_MS: Record<string, number> = {
  "1s": 1_000,
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "10m": 600_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "60m": 3_600_000,
  "240m": 14_400_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
};

function normalizeCandleTimestamp(type: string, timestamp: number): number {
  const timeframe = type.replace("candle.", "");
  if (timeframe === "1d") return startOfUtcDay(timestamp);
  if (timeframe === "1w") return startOfUtcWeek(timestamp);
  if (timeframe === "1M" || timeframe === "1mo") return startOfUtcMonth(timestamp);
  if (timeframe === "1y") return startOfUtcYear(timestamp);

  const interval = CANDLE_INTERVALS_MS[timeframe] || CANDLE_INTERVALS_MS[type];
  if (!Number.isFinite(interval) || interval <= 0) {
    return timestamp;
  }
  return Math.floor(timestamp / interval) * interval;
}

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function startOfUtcWeek(timestamp: number): number {
  const dayStart = startOfUtcDay(timestamp);
  const day = new Date(dayStart).getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return dayStart - daysSinceMonday * 86_400_000;
}

function startOfUtcMonth(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function startOfUtcYear(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), 0, 1);
}

function parseUpbitUtcMs(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value.endsWith("Z") ? value : `${value}Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeUpbit(raw: any): { channel: Channel; item: any } | null {
  const parsed = parseUpbitMessage(raw);
  return parsed?.kind === "item" ? { channel: parsed.channel, item: parsed.item } : null;
}

function parseUpbitMessage(raw: any): ParsedUpbitMessage {
  const type: string = raw?.type ?? "";
  const schema = schemaForUpbitMessage(type);

  if (!schema) {
    return null;
  }

  const parsed = parseWithSchema(schema, raw, "websocket");
  if (!parsed.ok) {
    return { kind: "error", error: parsed.error };
  }

  const market = raw.code ?? raw.market;

  if (type === "ticker") {
    return {
      kind: "item",
      channel: "ticker",
      item: {
        market,
        tradePrice: raw.trade_price,
        signedChangeRate: raw.signed_change_rate,
        accTradePrice24h: raw.acc_trade_price_24h,
        openingPrice: raw.opening_price,
        highPrice: raw.high_price,
        lowPrice: raw.low_price,
      },
    };
  }

  if (type === "orderbook") {
    return {
      kind: "item",
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
      kind: "item",
      channel: "candle",
      item: {
        market,
        timestamp: parseUpbitUtcMs(raw.candle_date_time_utc) ?? normalizeCandleTimestamp(type, raw.timestamp),
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
      kind: "item",
      channel: "trade",
      item: {
        market,
        price: raw.trade_price,
        volume: raw.trade_volume,
        side: raw.ask_bid,
        timestamp: raw.trade_timestamp ?? raw.timestamp,
      },
    };
  }

  return null;
}

export function createOutputStream(raw$: Observable<any>): Observable<WorkerResponse> {
  const parsed$ = raw$.pipe(map(parseUpbitMessage), share());
  const validationError$ = parsed$.pipe(
    filter((value): value is Extract<ParsedUpbitMessage, { kind: "error" }> => value?.kind === "error"),
    map((value) => ({ type: "validation-error" as const, error: value.error })),
  );
  const normalized$ = parsed$.pipe(
    filter((value): value is Extract<ParsedUpbitMessage, { kind: "item" }> => value?.kind === "item"),
    map((value) => ({ channel: value.channel, item: value.item })),
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

  return merge(ticker$, otherChannels$, validationError$);
}
