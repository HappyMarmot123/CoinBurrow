import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FreeApiError } from '../src/freeapi/errors.js'
import { clearFreeApiCacheForTest } from '../src/freeapi/cache.js'
import { fetchGlobalMarket } from '../src/global/provider.js'
import { buildApp } from '../src/app.js'

const SAMPLE = {
  data: {
    total_market_cap: { usd: 2_410_000_000_000 },
    total_volume: { usd: 98_300_000_000 },
    market_cap_percentage: { btc: 54.2, eth: 17.1 },
    market_cap_change_percentage_24h_usd: -1.23,
    active_cryptocurrencies: 13567,
    markets: 1089,
    updated_at: 1_782_172_951,
  },
}

describe('fetchGlobalMarket provider', () => {
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

  it('normalizes all snapshot fields', async () => {
    mockAgent
      .get('https://api.coingecko.com')
      .intercept({ method: 'GET', path: '/api/v3/global' })
      .reply(200, SAMPLE)

    const result = await fetchGlobalMarket()
    expect(result.totalMarketCapUsd).toBe(2_410_000_000_000)
    expect(result.totalVolumeUsd).toBe(98_300_000_000)
    expect(result.marketCapChangePct24h).toBe(-1.23)
    expect(result.btcDominance).toBe(54.2)
    expect(result.ethDominance).toBe(17.1)
    expect(result.activeCryptocurrencies).toBe(13567)
    expect(result.markets).toBe(1089)
    expect(result.updatedAt).toBe(1_782_172_951 * 1000)
    expect(result.provider).toBe('coingecko')
  })

  it('returns null for missing optional fields', async () => {
    mockAgent
      .get('https://api.coingecko.com')
      .intercept({ method: 'GET', path: '/api/v3/global' })
      .reply(200, { data: { total_market_cap: { usd: 1_000 }, market_cap_percentage: { btc: 50 } } })

    const result = await fetchGlobalMarket()
    expect(result.totalMarketCapUsd).toBe(1_000)
    expect(result.ethDominance).toBeNull()
    expect(result.markets).toBeNull()
    expect(result.totalVolumeUsd).toBeNull()
  })

  it('throws SCHEMA_MISMATCH when total_market_cap.usd missing', async () => {
    mockAgent
      .get('https://api.coingecko.com')
      .intercept({ method: 'GET', path: '/api/v3/global' })
      .reply(200, { data: { total_market_cap: { eur: 1 } } })

    await expect(fetchGlobalMarket()).rejects.toMatchObject({ code: 'SCHEMA_MISMATCH' })
  })
})
