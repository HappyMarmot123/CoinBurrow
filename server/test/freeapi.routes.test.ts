import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../src/app.js'
import { clearFreeApiCacheForTest } from '../src/freeapi/cache.js'

function mockIntercept(
  mockAgent: MockAgent,
  baseUrl: string,
  path: string,
  statusCode: number,
  body: any,
): void {
  mockAgent
    .get(baseUrl)
    .intercept({ method: 'GET', path })
    .reply(statusCode, body)
}

describe('free API routes', () => {
  let app: ReturnType<typeof buildApp>
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearFreeApiCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    app = buildApp()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await app.close()
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
  })

  it('exposes freeapi policy for meta fallback and request strategy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/market/freeapi/policy',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('generatedAt')
    expect(body.policies).toBeInstanceOf(Array)
    expect(body.policies.length).toBeGreaterThanOrEqual(2)
    expect(body.policies[0].provider).toBeDefined()
    expect(body.policies[0].capability).toBe('meta')
    expect(body.policies[0].cacheTtlMs).toBeGreaterThan(0)
    expect(body.policies[0].requestPolicy).toMatchObject({
      timeoutMs: expect.any(Number),
      maxRetries: expect.any(Number),
      retryDelaysMs: expect.any(Array),
    })
  })

  it('returns Binance market snapshots without Upbit overlap by default', async () => {
    mockIntercept(
      mockAgent,
      'https://api.binance.com',
      '/api/v3/ticker/24hr?symbols=%5B%22DOGEUSDT%22%5D',
      200,
      [
        {
          symbol: 'DOGEUSDT',
          lastPrice: '200',
          priceChangePercent: '1.5',
          volume: '100',
          quoteVolume: '20000',
          closeTime: 1_700_000_000_000,
        },
      ],
    )

    const response = await app.inject({
      method: 'GET',
      url: '/market/freeapi/binance/markets?symbols=BTC/KRW,DOGE/USDT',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        symbol: 'DOGE/USDT',
        source: 'binance',
        lastPrice: '200',
        changeRate: '1.5',
        volume: '100',
        quoteVolume: '20000',
        ts: 1_700_000_000_000,
      },
    ])
  })

  it('returns Bybit derivatives', async () => {
    mockIntercept(
      mockAgent,
      'https://api.bybit.com',
      '/v5/market/open-interest?category=linear&symbol=BTCUSDT',
      200,
      {
        retCode: 0,
        result: {
          list: [
            {
              symbol: 'BTCUSDT',
              openInterest: '123.45',
            },
          ],
        },
      },
    )
    mockIntercept(
      mockAgent,
      'https://api.bybit.com',
      '/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=1',
      200,
      {
        retCode: 0,
        result: {
          list: [
            {
              symbol: 'BTCUSDT',
              fundingRate: '0.001',
              fundingRateTimestamp: '1700000001234',
            },
          ],
        },
      },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/market/freeapi/bybit/derivatives?symbol=BTC/USDT&category=linear',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      symbol: 'BTC/USDT',
      source: 'bybit',
      openInterest: '123.45',
      fundingRate: '0.001',
      ts: 1700000001234,
    })
  })

  it('returns CoinGecko meta for coin id', async () => {
    mockIntercept(
      mockAgent,
      'https://api.coingecko.com',
      '/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false',
      200,
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        categories: ['Store of Value'],
        links: {
          homepage: ['https://bitcoin.org'],
          whitepaper: 'https://bitcoin.org/bitcoin.pdf',
        },
        image: {
          small: 'https://assets.coingecko.com/small.png',
          large: 'https://assets.coingecko.com/large.png',
        },
        description: {
          en: 'Bitcoin is a digital currency.',
        },
      },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/market/freeapi/coingecko/meta?coinId=bitcoin',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      coinId: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      logo: 'https://assets.coingecko.com/large.png',
      category: 'Store of Value',
      website: 'https://bitcoin.org',
      description: 'Bitcoin is a digital currency.',
      tags: ['Store of Value'],
      whitepaper: 'https://bitcoin.org/bitcoin.pdf',
    })
  })

  it('returns CoinPaprika meta including events and teams', async () => {
    mockIntercept(
      mockAgent,
      'https://api.coinpaprika.com',
      '/v1/coins/btc-bitcoin',
      200,
      {
        id: 'btc-bitcoin',
        name: 'Bitcoin',
        symbol: 'BTC',
        description: 'Digital gold narrative.',
        tags: ['payments'],
        links: {
          website_url: 'https://bitcoin.org',
          whitepaper: { link: 'https://bitcoin.org/bitcoin.pdf' },
          team: ['Satoshi Nakamoto'],
        },
      },
    )
    mockIntercept(
      mockAgent,
      'https://api.coinpaprika.com',
      '/v1/coins/btc-bitcoin/events',
      200,
      [
        {
          id: 'ev-1',
          title: 'Taproot Upgrade',
          date: '2024-11-01',
        },
      ],
    )

    const response = await app.inject({
      method: 'GET',
      url: '/market/freeapi/coinpaprika/meta?coinId=btc-bitcoin',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      coinId: 'btc-bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      website: 'https://bitcoin.org',
      description: 'Digital gold narrative.',
      tags: ['payments'],
      whitepaper: 'https://bitcoin.org/bitcoin.pdf',
      recentEvents: ['Taproot Upgrade'],
      team: ['Satoshi Nakamoto'],
    })
  })

  it('returns Bithumb market snapshot list when symbols are not provided', async () => {
    mockIntercept(
      mockAgent,
      'https://api.bithumb.com',
      '/public/ticker/ALL_TICKER',
      200,
      {
        status: '0000',
        data: {
          BNB: {
            trade_price: '1000000',
            units_traded_24H: '12',
            acc_trade_value_24H: '12000000',
          },
          DOGE: {
            trade_price: '1500',
            units_traded_24H: '1000',
            acc_trade_value_24H: '1500000',
          },
        },
      },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/market/freeapi/bithumb/markets',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        symbol: 'BNB/KRW',
        source: 'bithumb',
        lastPrice: '1000000',
        changeRate: '0',
        volume: '12',
        quoteVolume: '12000000',
        ts: expect.any(Number),
      },
    ])
  })

  it('returns 400 with validation error for invalid free API queries', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/market/freeapi/binance/klines?symbol=BTC/USDT',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'invalid free API kline query',
    })
  })
})
