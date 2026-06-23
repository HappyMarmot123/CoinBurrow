import {
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FreeApiError } from '../src/freeapi/errors.js'
import { fetchUsdKrw } from '../src/fx/provider.js'
import { clearUpbitCacheForTest } from '../src/upbit/upbitRest.js'

describe('fetchUsdKrw provider', () => {
  let mockAgent: MockAgent
  let originalDispatcher: Dispatcher

  beforeEach(() => {
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

  it('returns KRW from exchangerate-api on success', async () => {
    mockAgent
      .get('https://open.er-api.com')
      .intercept({ method: 'GET', path: '/v6/latest/USD' })
      .reply(200, {
        result: 'success',
        rates: { KRW: 1380.5 },
        time_last_update_unix: 1_782_172_951,
        time_next_update_unix: 1_782_260_141,
      })

    const result = await fetchUsdKrw()
    expect(result.krw).toBe(1380.5)
    expect(result.source).toBe('exchangerate-api')
    expect(result.next).toBe(1_782_260_141)
  })

  it('falls back to Upbit exchange rate when primary fails', async () => {
    mockAgent
      .get('https://open.er-api.com')
      .intercept({ method: 'GET', path: '/v6/latest/USD' })
      .reply(500, { result: 'error' })
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/exchange-rates' })
      .reply(200, [{ currency: 'USD', base_price: '1400.5' }])

    const result = await fetchUsdKrw()
    expect(result.krw).toBe(1400.5)
    expect(result.source).toBe('upbit')
  })

  it('throws FreeApiError naming both failures when primary and fallback both fail', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    mockAgent
      .get('https://open.er-api.com')
      .intercept({ method: 'GET', path: '/v6/latest/USD' })
      .reply(500, { result: 'error' })
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/exchange-rates' })
      .reply(200, [])
    mockAgent
      .get('https://api.upbit.com')
      .intercept({ method: 'GET', path: '/v1/exchange-rate' })
      .reply(200, [])

    const settled = fetchUsdKrw().then(
      (v) => ({ ok: true as const, value: v }),
      (e: unknown) => ({ ok: false as const, error: e }),
    )
    await vi.advanceTimersByTimeAsync(11_000)

    const result = await settled
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(FreeApiError)
      expect((result.error as FreeApiError).message).toMatch(/primary=.*fallback=/)
    }

    vi.useRealTimers()
  })
})
