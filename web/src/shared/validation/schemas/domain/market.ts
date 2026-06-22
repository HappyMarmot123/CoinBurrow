import { z } from "zod";

export const marketViewSchema = z
  .object({
    market: z.string().min(1),
    koreanName: z.string(),
    englishName: z.string(),
  })
  .strict();

export const tickerViewSchema = z
  .object({
    market: z.string().min(1),
    tradePrice: z.number(),
    signedChangeRate: z.number(),
    accTradePrice24h: z.number(),
  })
  .strict();

export const candleViewSchema = z
  .object({
    market: z.string().min(1),
    timestamp: z.number(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
  })
  .strict();

export const orderbookUnitViewSchema = z
  .object({
    askPrice: z.number(),
    bidPrice: z.number(),
    askSize: z.number(),
    bidSize: z.number(),
  })
  .strict();

export const orderbookViewSchema = z
  .object({
    market: z.string().min(1),
    timestamp: z.number(),
    units: z.array(orderbookUnitViewSchema),
  })
  .strict();

export const tradeViewSchema = z
  .object({
    market: z.string().min(1),
    price: z.number(),
    volume: z.number(),
    side: z.enum(["ASK", "BID"]),
    timestamp: z.number(),
  })
  .strict();

export const marketViewListSchema = z.array(marketViewSchema);
export const tickerViewListSchema = z.array(tickerViewSchema);
export const candleViewListSchema = z.array(candleViewSchema);
export const orderbookViewListSchema = z.array(orderbookViewSchema);
export const tradeViewListSchema = z.array(tradeViewSchema);
