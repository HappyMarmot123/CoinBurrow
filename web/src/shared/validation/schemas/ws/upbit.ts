import { z } from "zod";

const marketCodeSchema = z.union([
  z.object({ code: z.string().min(1) }).passthrough(),
  z.object({ market: z.string().min(1) }).passthrough(),
]);

export const upbitTickerMessageSchema = z
  .object({
    type: z.literal("ticker"),
    trade_price: z.number(),
    signed_change_rate: z.number(),
    acc_trade_price_24h: z.number(),
    opening_price: z.number().optional(),
    high_price: z.number().optional(),
    low_price: z.number().optional(),
  })
  .passthrough()
  .and(marketCodeSchema);

export const upbitOrderbookMessageSchema = z
  .object({
    type: z.literal("orderbook"),
    timestamp: z.number(),
    orderbook_units: z.array(
      z
        .object({
          ask_price: z.number(),
          bid_price: z.number(),
          ask_size: z.number(),
          bid_size: z.number(),
        })
        .passthrough(),
    ),
  })
  .passthrough()
  .and(marketCodeSchema);

export const upbitCandleMessageSchema = z
  .object({
    type: z.string().startsWith("candle"),
    timestamp: z.number(),
    candle_date_time_utc: z.string().optional(),
    opening_price: z.number(),
    high_price: z.number(),
    low_price: z.number(),
    trade_price: z.number(),
    candle_acc_trade_volume: z.number(),
  })
  .passthrough()
  .and(marketCodeSchema);

export const upbitTradeMessageSchema = z
  .object({
    type: z.literal("trade"),
    trade_price: z.number(),
    trade_volume: z.number(),
    ask_bid: z.enum(["ASK", "BID"]),
    timestamp: z.number(),
    trade_timestamp: z.number().optional(),
  })
  .passthrough()
  .and(marketCodeSchema);

export function schemaForUpbitMessage(type: string): z.ZodTypeAny | null {
  if (type === "ticker") return upbitTickerMessageSchema;
  if (type === "orderbook") return upbitOrderbookMessageSchema;
  if (type.startsWith("candle")) return upbitCandleMessageSchema;
  if (type === "trade") return upbitTradeMessageSchema;
  return null;
}
