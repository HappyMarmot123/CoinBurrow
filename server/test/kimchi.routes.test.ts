import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../src/app.js'
import { clearFreeApiCacheForTest } from '../src/freeapi/cache.js'
import { clearUpbitCacheForTest } from '../src/upbit/upbitRest.js'

describe('GET /market/kimchi/universe', () => {
  let app: ReturnType<typeof buildApp>
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearFreeApiCacheForTest()
    clearUpbitCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    app = buildApp()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    await app.close()
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
    vi.restoreAllMocks()
  })

  it('returns mapped universe items', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/market/all?isDetails=false' })
      .reply(200, [{ market: 'KRW-BTC', korean_name: '비트코인', english_name: 'Bitcoin' }])
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/ticker?markets=KRW-BTC' })
      .reply(200, [{ market: 'KRW-BTC', trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 100 }])
    mockAgent
      .get('https://api.binance.com')
      .intercept({ method: 'GET', path: '/api/v3/exchangeInfo' })
      .reply(200, {
        symbols: [{ symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' }],
      })

    const response = await app.inject({ method: 'GET', url: '/market/kimchi/universe' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      stale: false,
      items: [
        {
          upbitMarket: 'KRW-BTC',
          binanceSymbol: 'BTCUSDT',
          base: 'BTC',
          koreanName: '비트코인',
          accTradePrice24h: 100,
        },
      ],
    })
  })

  it('degrades (200) when Binance fails', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/market/all?isDetails=false' })
      .reply(200, [{ market: 'KRW-BTC', korean_name: '비트코인', english_name: 'Bitcoin' }])
    // 400 = non-retryable FreeApiError, so resolveKimchiUniverse rejects immediately.
    mockAgent
      .get('https://api.binance.com')
      .intercept({ method: 'GET', path: '/api/v3/exchangeInfo' })
      .reply(400, {})

    const response = await app.inject({ method: 'GET', url: '/market/kimchi/universe' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ degraded: true, items: [] })
  })

  it('degrades (200) when Upbit fails (UpbitError)', async () => {
    // 400 = non-retryable UpbitError from fetchMarkets.
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/market/all?isDetails=false' })
      .reply(400, {})
    mockAgent
      .get('https://api.binance.com')
      .intercept({ method: 'GET', path: '/api/v3/exchangeInfo' })
      .reply(200, {
        symbols: [{ symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' }],
      })

    const response = await app.inject({ method: 'GET', url: '/market/kimchi/universe' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ degraded: true, items: [] })
  })
})
