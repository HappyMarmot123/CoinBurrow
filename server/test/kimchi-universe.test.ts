import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchBinanceUsdtBases } from '../src/kimchi/binanceSymbols.js'
import { clearFreeApiCacheForTest } from '../src/freeapi/cache.js'

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
