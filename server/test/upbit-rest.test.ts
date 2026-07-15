import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  UpbitError,
  clearUpbitCacheForTest,
  fetchCandles,
  fetchExchangeRates,
  fetchAvailableQuotes,
  fetchMarketOverview,
  fetchMarkets,
  fetchMarketSummaries,
  fetchMarketStatus,
  fetchOrderbook,
  parseRemainingReqHeader,
  fetchTickers,
  fetchTradeTicks,
} from '../src/upbit/upbitRest.js'

describe('Upbit REST client', () => {
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearUpbitCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
  })

  afterEach(async () => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
  })

  function mockUpbitReply(
    path: string,
    statusCode: number,
    body: object | string | Buffer | undefined,
    times = 1,
    headers?: Record<string, string>,
  ): void {
    for (let index = 0; index < times; index += 1) {
      mockAgent
        .get('https://api.upbit.com')
        .intercept({
          method: 'GET',
          path,
        })
        .reply(statusCode, body, { headers })
    }
  }

  async function advanceRetryTimers(): Promise<void> {
    await vi.advanceTimersByTimeAsync(3_000)
    await vi.advanceTimersByTimeAsync(2_000)
  }

  it('parses Upbit Remaining-Req headers', () => {
    expect(parseRemainingReqHeader('group=ticker; min=1800; sec=1')).toEqual({
      raw: 'group=ticker; min=1800; sec=1',
      group: 'ticker',
      sec: 1,
    })
  })

  it('logs Remaining-Req when the per-second quota is nearly exhausted', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const remainingReq = 'group=ticker; min=1800; sec=1'

    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC',
      })
      .reply(
        200,
        [
          {
            market: 'KRW-BTC',
            trade_price: 100_000,
            signed_change_rate: 0.01,
            acc_trade_price_24h: 5_000_000,
          },
        ],
        { headers: { 'remaining-req': remainingReq } },
      )

    await fetchTickers(['KRW-BTC'])

    expect(warn).toHaveBeenCalledWith(
      `[upbit-rate-limit] path=/ticker?markets=KRW-BTC status=200 group=ticker sec=1 remainingReq="${remainingReq}"`,
    )
  })

  it('does not log Remaining-Req while the per-second quota is healthy', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC',
      })
      .reply(
        200,
        [
          {
            market: 'KRW-BTC',
            trade_price: 100_000,
            signed_change_rate: 0.01,
            acc_trade_price_24h: 5_000_000,
          },
        ],
        { headers: { 'remaining-req': 'group=ticker; min=1800; sec=2' } },
      )

    await fetchTickers(['KRW-BTC'])

    expect(warn).not.toHaveBeenCalled()
  })

  it('fetches KRW markets and normalizes their names', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=false',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          korean_name: '비트코인',
          english_name: 'Bitcoin',
        },
        {
          market: 'BTC-ETH',
          korean_name: '이더리움',
          english_name: 'Ethereum',
        },
      ])

    await expect(fetchMarkets()).resolves.toEqual([
      {
        market: 'KRW-BTC',
        koreanName: '비트코인',
        englishName: 'Bitcoin',
      },
    ])
  })

  it('fetches available quote currencies with counts', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=true',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          korean_name: '비트코인',
          english_name: 'Bitcoin',
          trade_currency: 'KRW',
        },
        {
          market: 'USDT-ETH',
          korean_name: '이더리움',
          english_name: 'Ethereum',
          trade_currency: 'USDT',
        },
        {
          market: 'BTC-ETH',
          korean_name: '이더리움',
          english_name: 'Ethereum',
          trade_currency: 'BTC',
        },
      ])

    await expect(fetchAvailableQuotes()).resolves.toEqual([
      { quote: 'KRW', marketCount: 1 },
      { quote: 'BTC', marketCount: 1 },
      { quote: 'USDT', marketCount: 1 },
    ])
  })

  it('builds market overview from ticker/orderbook/status', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          trade_price: 100_000,
          signed_change_rate: 0.01,
          acc_trade_price_24h: 5_000_000_000,
        },
      ])

    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/orderbook?markets=KRW-BTC',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          timestamp: 1_700_000_000_001,
          orderbook_units: [
            {
              ask_price: 101,
              bid_price: 100,
              ask_size: 1.5,
              bid_size: 2.5,
            },
          ],
        },
      ])

    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=true',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          market_warning: 'NONE',
        },
      ])

    await expect(fetchMarketOverview(['KRW-BTC'])).resolves.toEqual([
      {
        market: 'KRW-BTC',
        ticker: {
          market: 'KRW-BTC',
          tradePrice: 100_000,
          signedChangeRate: 0.01,
          accTradePrice24h: 5_000_000_000,
        },
        orderbook: {
          market: 'KRW-BTC',
          timestamp: 1_700_000_000_001,
          units: [
            {
              askPrice: 101,
              bidPrice: 100,
              askSize: 1.5,
              bidSize: 2.5,
            },
          ],
        },
        status: {
          market: 'KRW-BTC',
          market_warning: 'NONE',
        },
      },
    ])
  })

  it('fetches detailed market summaries and keeps detail fields', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=true',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          korean_name: '비트코인',
          english_name: 'Bitcoin',
          market_warning: 'NONE',
          trade_currency: 'KRW',
        },
        {
          market: 'BTC-ETH',
          korean_name: '이더리움',
          english_name: 'Ethereum',
        },
      ])

    await expect(fetchMarketSummaries()).resolves.toEqual([
      {
        market: 'KRW-BTC',
        koreanName: '비트코인',
        englishName: 'Bitcoin',
        market_warning: 'NONE',
        trade_currency: 'KRW',
        quote: 'KRW',
      },
      {
        market: 'BTC-ETH',
        koreanName: '이더리움',
        englishName: 'Ethereum',
        quote: 'BTC',
      },
    ])
  })

  it('filters detailed market summaries by quote', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=true',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          korean_name: '비트코인',
          english_name: 'Bitcoin',
        },
        {
          market: 'USDT-ETH',
          korean_name: '이더리움',
          english_name: 'Ethereum',
        },
      ])

    await expect(fetchMarketSummaries({ quote: 'KRW', isDetails: true })).resolves.toEqual([
      {
        market: 'KRW-BTC',
        koreanName: '비트코인',
        englishName: 'Bitcoin',
        quote: 'KRW',
      },
    ])
  })

  it('fetches tickers and normalizes price fields', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC,KRW-ETH',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          trade_price: 100_000_000,
          signed_change_rate: 0.0123,
          acc_trade_price_24h: 12_345_678_900,
        },
      ])

    await expect(fetchTickers(['KRW-BTC', 'KRW-ETH'])).resolves.toEqual([
      {
        market: 'KRW-BTC',
        tradePrice: 100_000_000,
        signedChangeRate: 0.0123,
        accTradePrice24h: 12_345_678_900,
      },
    ])
  })

  it('encodes each ticker market without encoding list separators', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC%26count%3D1,KRW-ETH',
      })
      .reply(200, [])

    await expect(
      fetchTickers(['KRW-BTC&count=1', 'KRW-ETH']),
    ).resolves.toEqual([])
  })

  it('rejects a ticker payload with a non-string market', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC',
      })
      .reply(200, [
        {
          market: 123,
          trade_price: 100,
          signed_change_rate: 0.01,
          acc_trade_price_24h: 1_000,
        },
      ])

    const error = await fetchTickers(['KRW-BTC']).catch((caught) => caught)

    expect(error).toBeInstanceOf(UpbitError)
    expect(error).toHaveProperty(
      'message',
      'Upbit /ticker?markets=KRW-BTC -> invalid response',
    )
  })

  it('fetches minute candles using the period-start timestamp', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/candles/minutes/1?market=KRW-BTC&count=200',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          candle_date_time_utc: '2026-07-08T01:23:00',
          timestamp: 1_783_476_789_123,
          opening_price: 99,
          high_price: 105,
          low_price: 95,
          trade_price: 101,
          candle_acc_trade_volume: 12.5,
        },
      ])

    await expect(fetchCandles('KRW-BTC')).resolves.toEqual([
      {
        market: 'KRW-BTC',
        timestamp: Date.parse('2026-07-08T01:23:00Z'),
        open: 99,
        high: 105,
        low: 95,
        close: 101,
        volume: 12.5,
      },
    ])
  })

  it('encodes the candle market without injecting another parameter', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/candles/minutes/1?market=KRW-BTC%26count%3D1&count=2',
      })
      .reply(200, [])

    await expect(fetchCandles('KRW-BTC&count=1', 2)).resolves.toEqual([])
  })

  it('fetches candles with a configurable timeframe', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/candles/minutes/15?market=KRW-BTC&count=150',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          timestamp: 1_700_000_000_000,
          opening_price: 99,
          high_price: 105,
          low_price: 95,
          trade_price: 101,
          candle_acc_trade_volume: 12.5,
        },
      ])

    await expect(fetchCandles('KRW-BTC', '15m', 150)).resolves.toEqual([
      {
        market: 'KRW-BTC',
        timestamp: 1_699_999_200_000,
        open: 99,
        high: 105,
        low: 95,
        close: 101,
        volume: 12.5,
      },
    ])
  })

  it('fetches an orderbook and normalizes its units', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/orderbook?markets=KRW-BTC',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          timestamp: 1_700_000_000_000,
          orderbook_units: [
            {
              ask_price: 101,
              bid_price: 100,
              ask_size: 1.5,
              bid_size: 2.5,
            },
          ],
        },
      ])

    await expect(fetchOrderbook(['KRW-BTC'])).resolves.toEqual([
      {
        market: 'KRW-BTC',
        timestamp: 1_700_000_000_000,
        units: [
          {
            askPrice: 101,
            bidPrice: 100,
            askSize: 1.5,
            bidSize: 2.5,
          },
        ],
      },
    ])
  })

  it('encodes the orderbook market without injecting another parameter', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/orderbook?markets=KRW-BTC%26count%3D1',
      })
      .reply(200, [])

    await expect(fetchOrderbook(['KRW-BTC&count=1'])).resolves.toEqual([])
  })

  it('fetches orderbook with a custom depth level', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/orderbook?markets=KRW-BTC&level=5',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          timestamp: 1_700_000_000_000,
          orderbook_units: [
            {
              ask_price: 101,
              bid_price: 100,
              ask_size: 1.5,
              bid_size: 2.5,
            },
          ],
        },
      ])

    await expect(fetchOrderbook(['KRW-BTC'], 5)).resolves.toEqual([
      {
        market: 'KRW-BTC',
        timestamp: 1_700_000_000_000,
        units: [
          {
            askPrice: 101,
            bidPrice: 100,
            askSize: 1.5,
            bidSize: 2.5,
          },
        ],
      },
    ])
  })

  it('fetches multiple orderbooks in one request', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/orderbook?markets=KRW-BTC,KRW-ETH',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          timestamp: 1_700_000_000_000,
          orderbook_units: [
            {
              ask_price: 101,
              bid_price: 100,
              ask_size: 1.5,
              bid_size: 2.5,
            },
          ],
        },
        {
          market: 'KRW-ETH',
          timestamp: 1_700_000_000_000,
          orderbook_units: [
            {
              ask_price: 4_5000,
              bid_price: 4_4990,
              ask_size: 22.5,
              bid_size: 11.4,
            },
          ],
        },
      ])

    await expect(fetchOrderbook(['KRW-BTC', 'KRW-ETH'])).resolves.toEqual([
      {
        market: 'KRW-BTC',
        timestamp: 1_700_000_000_000,
        units: [
          {
            askPrice: 101,
            bidPrice: 100,
            askSize: 1.5,
            bidSize: 2.5,
          },
        ],
      },
      {
        market: 'KRW-ETH',
        timestamp: 1_700_000_000_000,
        units: [
          {
            askPrice: 45000,
            bidPrice: 44990,
            askSize: 22.5,
            bidSize: 11.4,
          },
        ],
      },
    ])
  })

  it('fetches trade ticks and normalizes their side', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/trades/ticks?market=KRW-BTC&count=50',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          trade_price: 100,
          trade_volume: 0.25,
          ask_bid: 'BID',
          timestamp: 1_700_000_000_000,
        },
      ])

    await expect(fetchTradeTicks('KRW-BTC')).resolves.toEqual([
      {
        market: 'KRW-BTC',
        price: 100,
        volume: 0.25,
        side: 'BID',
        timestamp: 1_700_000_000_000,
      },
    ])
  })

  it('encodes the trade market without injecting another parameter', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/trades/ticks?market=KRW-BTC%26count%3D1&count=2',
      })
      .reply(200, [])

    await expect(fetchTradeTicks('KRW-BTC&count=1', 2)).resolves.toEqual([])
  })

  it('fetches trade ticks with a to cursor', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/trades/ticks?market=KRW-BTC&count=20&to=2024-01-01T00%3A00%3A00Z',
      })
      .reply(200, [])

    await expect(fetchTradeTicks('KRW-BTC', 20, '2024-01-01T00:00:00Z')).resolves.toEqual([])
  })

  it('fetches trade ticks with daysAgo', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/trades/ticks?market=KRW-BTC&count=20&daysAgo=3',
      })
      .reply(200, [])

    await expect(fetchTradeTicks('KRW-BTC', 20, undefined, 3)).resolves.toEqual([])
  })

  it('fetches market status from upbit', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=true',
      })
      .reply(200, [{ market: 'KRW-BTC', market_warning: 'NONE' }])

    await expect(fetchMarketStatus(['KRW-BTC'])).resolves.toEqual([
      { market: 'KRW-BTC', market_warning: 'NONE' },
    ])
  })

  it('reuses cached market details for repeated market status requests', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=true',
      })
      .reply(200, [{ market: 'KRW-BTC', market_warning: 'NONE' }])

    await expect(fetchMarketStatus(['KRW-BTC'])).resolves.toEqual([
      { market: 'KRW-BTC', market_warning: 'NONE' },
    ])
    await expect(fetchMarketStatus(['KRW-BTC'])).resolves.toEqual([
      { market: 'KRW-BTC', market_warning: 'NONE' },
    ])
  })

  it('fetches exchange rates', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/exchange-rates',
      })
      .reply(200, [{ currency: 'USD', base_price: '1400.5' }])

    await expect(fetchExchangeRates()).resolves.toEqual([{ currency: 'USD', base_price: '1400.5' }])
  })

  it('rejects a trade payload with an invalid side', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/trades/ticks?market=KRW-BTC&count=1',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          trade_price: 100,
          trade_volume: 0.25,
          ask_bid: 'BUY',
          timestamp: 1_700_000_000_000,
        },
      ])

    const error = await fetchTradeTicks('KRW-BTC', 1).catch(
      (caught) => caught,
    )

    expect(error).toBeInstanceOf(UpbitError)
    expect(error).toHaveProperty(
      'message',
      'Upbit /trades/ticks?market=KRW-BTC&count=1 -> invalid response',
    )
  })

  it('retries a 429 response after the configured delays', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    mockUpbitReply(
      '/v1/ticker?markets=KRW-BTC',
      429,
      { error: { name: 'too_many_requests' } },
    )
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          trade_price: 100_000,
          signed_change_rate: 0.01,
          acc_trade_price_24h: 5_000_000,
        },
      ])

    const pending = fetchTickers(['KRW-BTC'])

    await vi.advanceTimersByTimeAsync(2_999)
    await expect(Promise.race([pending, Promise.resolve('pending')])).resolves.toBe('pending')

    await vi.advanceTimersByTimeAsync(1)

    await expect(pending).resolves.toEqual([
      {
        market: 'KRW-BTC',
        tradePrice: 100_000,
        signedChangeRate: 0.01,
        accTradePrice24h: 5_000_000,
      },
    ])
  })

  it('throws a concise error after retryable responses keep failing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const remainingReq = 'group=ticker; min=1800; sec=0'

    mockUpbitReply(
      '/v1/ticker?markets=KRW-BTC',
      429,
      { error: { name: 'too_many_requests' } },
      3,
      { 'remaining-req': remainingReq },
    )

    const pending = fetchTickers(['KRW-BTC']).catch((caught) => caught)
    await advanceRetryTimers()

    const error = await pending

    expect(error).toBeInstanceOf(UpbitError)
    expect(error).toHaveProperty(
      'message',
      'Upbit /ticker?markets=KRW-BTC -> 429',
    )
    expect(error).toHaveProperty('rateLimit', {
      raw: remainingReq,
      group: 'ticker',
      sec: 0,
    })
    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn).toHaveBeenLastCalledWith(
      `[upbit-rate-limit] path=/ticker?markets=KRW-BTC status=429 group=ticker sec=0 remainingReq="${remainingReq}"`,
    )
  })

  it('throws the same concise error for a redirect response', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC',
      })
      .reply(302, 'redirected')

    const error = await fetchTickers(['KRW-BTC']).catch((caught) => caught)

    expect(error).toBeInstanceOf(UpbitError)
    expect(error).toHaveProperty(
      'message',
      'Upbit /ticker?markets=KRW-BTC -> 302',
    )
  })

  it('wraps transport failures as a stable UpbitError with a cause', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    const pending = fetchMarkets().catch((caught) => caught)
    await advanceRetryTimers()
    const error = await pending

    expect(error).toBeInstanceOf(UpbitError)
    expect(error).toHaveProperty('message', 'Upbit request failed')
    expect(error).toHaveProperty('cause')
    expect(error.cause).toBeInstanceOf(Error)
  })
})
