import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchBinanceUsdtBases } from '../src/kimchi/binanceSymbols.js'
import { resolveKimchiUniverse } from '../src/kimchi/universe.js'
import { clearFreeApiCacheForTest } from '../src/freeapi/cache.js'
import { clearUpbitCacheForTest } from '../src/upbit/upbitRest.js'

describe('fetchBinanceUsdtBases', () => {
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearFreeApiCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
    vi.restoreAllMocks()
  })

  it('keeps only TRADING USDT bases', async () => {
    mockAgent
      .get('https://api.binance.com')
      .intercept({ method: 'GET', path: '/api/v3/exchangeInfo' })
      .reply(200, {
        symbols: [
          { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
          { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
          { symbol: 'XRPBTC', baseAsset: 'XRP', quoteAsset: 'BTC', status: 'TRADING' },
          { symbol: 'LUNAUSDT', baseAsset: 'LUNA', quoteAsset: 'USDT', status: 'BREAK' },
        ],
      })

    const bases = await fetchBinanceUsdtBases()
    expect([...bases].sort()).toEqual(['BTC', 'ETH'])
  })
})

describe('resolveKimchiUniverse', () => {
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    clearFreeApiCacheForTest()
    clearUpbitCacheForTest()
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    setGlobalDispatcher(originalDispatcher)
    await mockAgent.close()
    vi.restoreAllMocks()
  })

  it('intersects Upbit KRW and Binance USDT, sorted by 24h value desc', async () => {
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/market/all?isDetails=false' })
      .reply(200, [
        { market: 'KRW-BTC', korean_name: '비트코인', english_name: 'Bitcoin' },
        { market: 'KRW-ETH', korean_name: '이더리움', english_name: 'Ethereum' },
        { market: 'KRW-ONLYUPBIT', korean_name: '온리', english_name: 'Only' },
      ])
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-ONLYUPBIT' })
      .reply(200, [
        { market: 'KRW-BTC', trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 100 },
        { market: 'KRW-ETH', trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 300 },
        { market: 'KRW-ONLYUPBIT', trade_price: 1, signed_change_rate: 0, acc_trade_price_24h: 999 },
      ])
    mockAgent
      .get('https://api.binance.com')
      .intercept({ method: 'GET', path: '/api/v3/exchangeInfo' })
      .reply(200, {
        symbols: [
          { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
          { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
        ],
      })

    const items = await resolveKimchiUniverse(10)
    expect(items.map((item) => item.base)).toEqual(['ETH', 'BTC'])
    expect(items[0]).toEqual({
      upbitMarket: 'KRW-ETH',
      binanceSymbol: 'ETHUSDT',
      base: 'ETH',
      koreanName: '이더리움',
      accTradePrice24h: 300,
    })
  })
})
