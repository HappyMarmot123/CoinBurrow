import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  fetchCandles,
  fetchMarkets,
  fetchOrderbook,
  fetchTickers,
  fetchTradeTicks,
} from '../src/upbit/upbitRest.js'

describe('Upbit REST client', () => {
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
  })

  afterEach(async () => {
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
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

    await expect(fetchTickers(['KRW-BTC'])).rejects.toThrow(
      'Upbit /ticker?markets=KRW-BTC -> invalid response',
    )
  })

  it('fetches minute candles and normalizes OHLCV fields', async () => {
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

    await expect(fetchCandles('KRW-BTC')).resolves.toEqual([
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

    await expect(fetchOrderbook('KRW-BTC')).resolves.toEqual([
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

    await expect(fetchOrderbook('KRW-BTC&count=1')).resolves.toEqual([])
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

    await expect(fetchTradeTicks('KRW-BTC', 1)).rejects.toThrow(
      'Upbit /trades/ticks?market=KRW-BTC&count=1 -> invalid response',
    )
  })

  it('throws a concise error for a non-2xx response', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({
        method: 'GET',
        path: '/v1/ticker?markets=KRW-BTC',
      })
      .reply(429, { error: { name: 'too_many_requests' } })

    await expect(fetchTickers(['KRW-BTC'])).rejects.toThrow(
      'Upbit /ticker?markets=KRW-BTC -> 429',
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

    await expect(fetchTickers(['KRW-BTC'])).rejects.toThrow(
      'Upbit /ticker?markets=KRW-BTC -> 302',
    )
  })
})
