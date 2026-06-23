import { z } from 'zod'

export const marketDtoSchema = z
  .object({
    market: z.string().min(1),
    koreanName: z.string(),
    englishName: z.string(),
  })
  .strict()

export const tickerDtoSchema = z
  .object({
    market: z.string().min(1),
    tradePrice: z.number(),
    signedChangeRate: z.number(),
    accTradePrice24h: z.number(),
    openingPrice: z.number().optional(),
    highPrice: z.number().optional(),
    lowPrice: z.number().optional(),
  })
  .strict()

export const candleDtoSchema = z
  .object({
    market: z.string().min(1),
    timestamp: z.number(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
  })
  .strict()

export const orderbookUnitDtoSchema = z
  .object({
    askPrice: z.number(),
    bidPrice: z.number(),
    askSize: z.number(),
    bidSize: z.number(),
  })
  .strict()

export const orderbookDtoSchema = z
  .object({
    market: z.string().min(1),
    timestamp: z.number(),
    units: z.array(orderbookUnitDtoSchema),
  })
  .strict()

export const tradeDtoSchema = z
  .object({
    market: z.string().min(1),
    price: z.number(),
    volume: z.number(),
    side: z.enum(['ASK', 'BID']),
    timestamp: z.number(),
  })
  .strict()

export const marketDtoListSchema = z.array(marketDtoSchema)
export const tickerDtoListSchema = z.array(tickerDtoSchema)
export const candleDtoListSchema = z.array(candleDtoSchema)
export const orderbookDtoListSchema = z.array(orderbookDtoSchema)
export const tradeDtoListSchema = z.array(tradeDtoSchema)
