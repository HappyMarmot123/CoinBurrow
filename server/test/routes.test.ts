import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.js'

const marketQueryRoutes = [
  '/market/exchange/candle',
  '/market/exchange/orderbook',
  '/market/exchange/trade-ticks',
] as const

const marketsQueryRoutes = ['/market/exchange/tickers'] as const

const invalidMarketQueries = [
  { name: 'missing', query: '' },
  { name: 'empty', query: '?market=' },
  {
    name: 'duplicate',
    query: '?market=KRW-BTC&market=KRW-ETH',
  },
  { name: 'whitespace-only', query: '?market=%20%20%20' },
] as const

const invalidMarketsQueries = [
  { name: 'missing', query: '' },
  { name: 'empty', query: '?markets=' },
  { name: 'duplicate', query: '?markets=KRW-BTC&markets=KRW-ETH' },
  { name: 'whitespace-only', query: '?markets=%20%20%20' },
] as const

const upstreamRoutes = [
  {
    route: '/market/coin-list',
    path: '/v1/market/all?isDetails=false',
  },
  {
    route: '/market/exchange/markets',
    path: '/v1/market/all?isDetails=true',
  },
  {
    route: '/market/exchange/tickers?markets=KRW-BTC,KRW-ETH',
    path: '/v1/ticker?markets=KRW-BTC,KRW-ETH',
  },
  {
    route: '/market/exchange/ticker',
    path:
      '/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL,KRW-ADA,KRW-DOGE,KRW-DOT,KRW-TRX',
  },
  {
    route: '/market/exchange/candle?market=KRW-BTC',
    path: '/v1/candles/minutes/1?market=KRW-BTC&count=200',
  },
  {
    route: '/market/exchange/orderbook?market=KRW-BTC',
    path: '/v1/orderbook?markets=KRW-BTC',
  },
  {
    route: '/market/exchange/trade-ticks?market=KRW-BTC',
    path: '/v1/trades/ticks?market=KRW-BTC&count=50',
  },
  {
    route: '/market/exchange/market-status?markets=KRW-BTC',
    path: '/v1/market/all?isDetails=true',
  },
  {
    route: '/market/exchange/quotes',
    path: '/v1/market/all?isDetails=true',
  },
  {
    route: '/market/exchange/market-overview?markets=KRW-BTC',
    path: '/v1/ticker?markets=KRW-BTC',
  },
  {
    route: '/market/exchange/market-overview?markets=KRW-BTC',
    path: '/v1/orderbook?markets=KRW-BTC',
  },
  {
    route: '/market/exchange/market-overview?markets=KRW-BTC',
    path: '/v1/market/all?isDetails=true',
  },
] as const

describe('market routes', () => {
  let app: ReturnType<typeof buildApp>
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    app = buildApp()
  })

  afterEach(async () => {
    try {
      mockAgent.assertNoPendingInterceptors()
    } finally {
      try {
        await app.close()
      } finally {
        setGlobalDispatcher(originalDispatcher)
        await mockAgent.close()
      }
    }
  })

  it('returns the KRW coin list', async () => {
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
      ])

    const response = await app.inject({
      method: 'GET',
      url: '/market/coin-list',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        koreanName: '비트코인',
        englishName: 'Bitcoin',
      },
    ])
  })

  it('returns market summaries for all KRW markets', async () => {
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
        },
        {
          market: 'BTC-ETH',
          korean_name: '이더리움',
          english_name: 'Ethereum',
        },
      ])

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/markets',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        koreanName: '비트코인',
        englishName: 'Bitcoin',
        market_warning: 'NONE',
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

  it('returns market summaries filtered by quote', async () => {
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

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/markets?quote=KRW',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        koreanName: '비트코인',
        englishName: 'Bitcoin',
        quote: 'KRW',
      },
    ])
  })

  it('returns tickers for a requested market set', async () => {
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
        {
          market: 'KRW-ETH',
          trade_price: 12_000,
          signed_change_rate: -0.0101,
          acc_trade_price_24h: 345_000_000,
        },
      ])

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/tickers?markets=KRW-BTC,KRW-ETH',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        tradePrice: 100_000_000,
        signedChangeRate: 0.0123,
        accTradePrice24h: 12_345_678_900,
      },
      {
        market: 'KRW-ETH',
        tradePrice: 12_000,
        signedChangeRate: -0.0101,
        accTradePrice24h: 345_000_000,
      },
    ])
  })

  it('requests tickers for the exact configured target coins', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path:
          '/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL,KRW-ADA,KRW-DOGE,KRW-DOT,KRW-TRX',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          trade_price: 100_000_000,
          signed_change_rate: 0.0123,
          acc_trade_price_24h: 12_345_678_900,
        },
      ])

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/ticker',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        tradePrice: 100_000_000,
        signedChangeRate: 0.0123,
        accTradePrice24h: 12_345_678_900,
      },
    ])
  })

  it.each(marketQueryRoutes)(
    'rejects invalid market queries for %s',
    async (route) => {
      for (const { name, query } of invalidMarketQueries) {
        const response = await app.inject({
          method: 'GET',
          url: `${route}${query}`,
        })

        expect(response.statusCode, name).toBe(400)
        expect(response.json(), name).toEqual({
          error: 'market is required',
        })
      }
    },
  )

  it.each(marketsQueryRoutes)(
    'rejects invalid markets queries for %s',
    async (route) => {
      for (const { name, query } of invalidMarketsQueries) {
        const response = await app.inject({
          method: 'GET',
          url: `${route}${query}`,
        })

        expect(response.statusCode, name).toBe(400)
        expect(response.json(), name).toEqual({
          error: 'markets is required',
        })
      }
    },
  )

  it('returns candles using the REST client default count', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/candles/minutes/1?market=KRW-BTC&count=200',
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

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/candle?market=KRW-BTC',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        timestamp: 1_700_000_000_000,
        open: 99,
        high: 105,
        low: 95,
        close: 101,
        volume: 12.5,
      },
    ])
  })

  it('returns candles with timeframe and custom count', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/candles/minutes/15?market=KRW-BTC&count=80',
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

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/candle?market=KRW-BTC&timeframe=15m&count=80',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        timestamp: 1_700_000_000_000,
        open: 99,
        high: 105,
        low: 95,
        close: 101,
        volume: 12.5,
      },
    ])
  })

  it('returns an orderbook for the requested market', async () => {
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

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/orderbook?market=KRW-BTC',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
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

  it('returns orderbooks for multiple requested markets', async () => {
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

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/orderbook?markets=KRW-BTC,KRW-ETH',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
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

  it('returns trade ticks using the REST client default count', async () => {
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

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/trade-ticks?market=KRW-BTC',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        price: 100,
        volume: 0.25,
        side: 'BID',
        timestamp: 1_700_000_000_000,
      },
    ])
  })

  it('returns trade ticks with custom to cursor', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/trades/ticks?market=KRW-BTC&count=20&to=2024-01-01T00%3A00%3A00Z',
      })
      .reply(200, [
        {
          market: 'KRW-BTC',
          trade_price: 100,
          trade_volume: 0.25,
          ask_bid: 'ASK',
          timestamp: 1_700_000_000_000,
        },
      ])

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/trade-ticks?market=KRW-BTC&count=20&to=2024-01-01T00:00:00Z',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'KRW-BTC',
        price: 100,
        volume: 0.25,
        side: 'ASK',
        timestamp: 1_700_000_000_000,
      },
    ])
  })

  it('returns market status for requested markets', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=true',
      })
      .reply(200, [{ market: 'KRW-BTC', market_warning: 'NONE' }])

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/market-status?markets=KRW-BTC',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([{ market: 'KRW-BTC', market_warning: 'NONE' }])
  })

  it('returns exchange rates', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/exchange-rates',
      })
      .reply(200, [{ currency: 'USD', base_price: '1400.5' }])

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/exchange-rates',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([{ currency: 'USD', base_price: '1400.5' }])
  })

  it('returns empty exchange rates when upstream is unavailable', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/exchange-rates' })
      .reply(429, { error: { name: 'too_many_requests' } })

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/exchange-rates',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([])
  })

  it('returns available quote summaries', async () => {
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
          market: 'BTC-ETH',
          korean_name: '이더리움',
          english_name: 'Ethereum',
          trade_currency: 'BTC',
        },
      ])

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/quotes',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      { quote: 'KRW', marketCount: 1 },
      { quote: 'BTC', marketCount: 1 },
    ])
  })

  it('returns quote-filtered coin list', async () => {
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

    const response = await app.inject({
      method: 'GET',
      url: '/market/coin-list?quote=BTC',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        market: 'BTC-ETH',
        koreanName: '이더리움',
        englishName: 'Ethereum',
      },
    ])
  })

  it('returns market overview for requested markets', async () => {
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

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/market-overview?markets=KRW-BTC',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
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

  it('returns all market status when no market filter is provided', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=true',
      })
      .reply(200, [{ market: 'KRW-BTC', market_warning: 'NONE' }])

    const response = await app.inject({
      method: 'GET',
      url: '/market/exchange/market-status',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([{ market: 'KRW-BTC', market_warning: 'NONE' }])
  })

  it.each(upstreamRoutes)(
    'maps an Upbit 429 from $route to a stable 502 response',
    async ({ route, path }) => {
      mockAgent
        .get('https://api.upbit.com')
        .intercept({ method: 'GET', path })
        .reply(429, { error: { name: 'too_many_requests' } })

      const response = await app.inject({
        method: 'GET',
        url: route,
      })

      expect(response.statusCode).toBe(502)
      expect(response.json()).toEqual({ error: 'upstream unavailable' })
      expect(response.body).not.toContain(path)
    },
  )

  it('maps a malformed Upbit 200 response to a stable 502 response', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/market/all?isDetails=false',
      })
      .reply(200, { invalid: true })

    const response = await app.inject({
      method: 'GET',
      url: '/market/coin-list',
    })

    expect(response.statusCode).toBe(502)
    expect(response.json()).toEqual({ error: 'upstream unavailable' })
    expect(response.body).not.toContain('invalid response')
  })

  it('maps an upstream transport failure to a stable 502 response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/market/coin-list',
    })

    expect(response.statusCode).toBe(502)
    expect(response.json()).toEqual({ error: 'upstream unavailable' })
    expect(response.body).not.toContain('Mock dispatch not matched')
  })
})
