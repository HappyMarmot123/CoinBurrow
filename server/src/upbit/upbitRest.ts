import { request } from 'undici'
import { z } from 'zod'

import { config } from '../config.js'
import type {
  CandleDto,
  MarketDto,
  OrderbookDto,
  TickerDto,
  TradeDto,
} from './types.js'

const marketSchema = z.array(
  z.object({
    market: z.string(),
    korean_name: z.string(),
    english_name: z.string(),
  }),
)

const tickerSchema = z.array(
  z.object({
    market: z.string(),
    trade_price: z.number(),
    signed_change_rate: z.number(),
    acc_trade_price_24h: z.number(),
  }),
)

const candleSchema = z.array(
  z.object({
    market: z.string(),
    timestamp: z.number(),
    opening_price: z.number(),
    high_price: z.number(),
    low_price: z.number(),
    trade_price: z.number(),
    candle_acc_trade_volume: z.number(),
  }),
)

const orderbookSchema = z.array(
  z.object({
    market: z.string(),
    timestamp: z.number(),
    orderbook_units: z.array(
      z.object({
        ask_price: z.number(),
        bid_price: z.number(),
        ask_size: z.number(),
        bid_size: z.number(),
      }),
    ),
  }),
)

const tradeSchema = z.array(
  z.object({
    market: z.string(),
    trade_price: z.number(),
    trade_volume: z.number(),
    ask_bid: z.enum(['ASK', 'BID']),
    timestamp: z.number(),
  }),
)

async function getJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const { body, statusCode } = await request(`${config.upbitRestUrl}${path}`)

  if (statusCode < 200 || statusCode >= 300) {
    await body.dump()
    throw new Error(`Upbit ${path} -> ${statusCode}`)
  }

  try {
    return schema.parse(await body.json())
  } catch {
    throw new Error(`Upbit ${path} -> invalid response`)
  }
}

export async function fetchMarkets(): Promise<MarketDto[]> {
  const markets = await getJson('/market/all?isDetails=false', marketSchema)

  return markets
    .filter(({ market }) => market.startsWith('KRW-'))
    .map(({ market, korean_name, english_name }) => ({
      market,
      koreanName: korean_name,
      englishName: english_name,
    }))
}

export async function fetchTickers(markets: string[]): Promise<TickerDto[]> {
  const path = `/ticker?markets=${markets.map(encodeURIComponent).join(',')}`
  const tickers = await getJson(path, tickerSchema)

  return tickers.map(
    ({
      market,
      trade_price,
      signed_change_rate,
      acc_trade_price_24h,
    }) => ({
      market,
      tradePrice: trade_price,
      signedChangeRate: signed_change_rate,
      accTradePrice24h: acc_trade_price_24h,
    }),
  )
}

export async function fetchCandles(
  market: string,
  count = 200,
): Promise<CandleDto[]> {
  const path = `/candles/minutes/1?market=${encodeURIComponent(market)}&count=${count}`
  const candles = await getJson(path, candleSchema)

  return candles.map(
    ({
      market: candleMarket,
      timestamp,
      opening_price,
      high_price,
      low_price,
      trade_price,
      candle_acc_trade_volume,
    }) => ({
      market: candleMarket,
      timestamp,
      open: opening_price,
      high: high_price,
      low: low_price,
      close: trade_price,
      volume: candle_acc_trade_volume,
    }),
  )
}

export async function fetchOrderbook(
  market: string,
): Promise<OrderbookDto[]> {
  const orderbooks = await getJson(
    `/orderbook?markets=${encodeURIComponent(market)}`,
    orderbookSchema,
  )

  return orderbooks.map(({ market: orderbookMarket, timestamp, orderbook_units }) => ({
    market: orderbookMarket,
    timestamp,
    units: orderbook_units.map(
      ({ ask_price, bid_price, ask_size, bid_size }) => ({
        askPrice: ask_price,
        bidPrice: bid_price,
        askSize: ask_size,
        bidSize: bid_size,
      }),
    ),
  }))
}

export async function fetchTradeTicks(
  market: string,
  count = 50,
): Promise<TradeDto[]> {
  const path = `/trades/ticks?market=${encodeURIComponent(market)}&count=${count}`
  const trades = await getJson(path, tradeSchema)

  return trades.map(
    ({ market: tradeMarket, trade_price, trade_volume, ask_bid, timestamp }) => ({
      market: tradeMarket,
      price: trade_price,
      volume: trade_volume,
      side: ask_bid,
      timestamp,
    }),
  )
}
