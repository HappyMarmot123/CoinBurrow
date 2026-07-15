import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../src/app.js'
import type { SimulatorAuthenticator } from '../src/simulator/auth.js'
import { SimulatorAuthError, SimulatorError } from '../src/simulator/errors.js'
import type { SimulatorQuoteProvider } from '../src/simulator/quoteProvider.js'
import type { SimulatorRepository } from '../src/simulator/repository.js'
import { SimulatorService } from '../src/simulator/service.js'
import type { AccountSnapshot, MarketQuote } from '../src/simulator/types.js'

const userId = '4bb5a7c6-e255-43a8-95b5-2f3db0e30e48'
const quotes: MarketQuote[] = [
  { symbol: 'BTC', price: 100_000_000, changeRate: 0.01 },
  { symbol: 'ETH', price: 5_000_000, changeRate: -0.02 },
]
const emptySnapshot: AccountSnapshot = {
  accountId: 'ca3642f8-a2db-43fb-a13a-3a119c44e88d',
  startingCash: 100_000_000,
  cashBalance: 100_000_000,
  positions: [],
  purchasedSymbols: [],
}

describe('simulator routes', () => {
  let repository: SimulatorRepository
  let quoteProvider: SimulatorQuoteProvider
  let authenticator: SimulatorAuthenticator
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    repository = {
      getSnapshot: vi.fn().mockResolvedValue(emptySnapshot),
      executeOrder: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn().mockResolvedValue(undefined),
    }
    quoteProvider = {
      getQuotes: vi.fn().mockImplementation(async (symbols: string[]) =>
        quotes.filter((quote) => symbols.includes(quote.symbol)),
      ),
    }
    authenticator = {
      authenticate: vi.fn().mockResolvedValue({ id: userId, email: 'user@example.com' }),
    }
    app = buildApp({
      simulatorDependencies: {
        authenticator,
        service: new SimulatorService(repository, quoteProvider),
      },
    })
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns a newly initialized account state for an authenticated user', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/simulator/state',
      headers: { authorization: 'Bearer token' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().account).toEqual({
      startingCash: 100_000_000,
      cashBalance: 100_000_000,
      investedValue: 0,
      totalAsset: 100_000_000,
      totalProfit: 0,
      returnRate: 0,
    })
    expect(response.json().purchasedSymbols).toEqual([])
    expect(authenticator.authenticate).toHaveBeenCalledWith('Bearer token')
  })

  it('rejects an unauthenticated state request', async () => {
    vi.mocked(authenticator.authenticate).mockRejectedValueOnce(new SimulatorAuthError())

    const response = await app.inject({ method: 'GET', url: '/simulator/state' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
    })
  })

  it('uses the server price when executing a valid market order', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/simulator/order',
      headers: { authorization: 'Bearer token' },
      payload: { symbol: 'btc', side: 'BUY', quantity: 0.01 },
    })

    expect(response.statusCode).toBe(200)
    expect(repository.executeOrder).toHaveBeenCalledWith({
      userId,
      symbol: 'BTC',
      side: 'buy',
      quantity: 0.01,
      price: 100_000_000,
    })
  })

  it.each([0, -1, 0.123456789, 1_000_001])(
    'rejects the quantity boundary %s',
    async (quantity) => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulator/order',
        headers: { authorization: 'Bearer token' },
        payload: { symbol: 'BTC', side: 'buy', quantity },
      })

      expect(response.statusCode).toBe(400)
      expect(repository.executeOrder).not.toHaveBeenCalled()
    },
  )

  it('maps an insufficient balance failure to a conflict response', async () => {
    vi.mocked(repository.executeOrder).mockRejectedValueOnce(
      new SimulatorError('INSUFFICIENT_CASH', '주문 가능한 현금이 부족합니다.', 409),
    )

    const response = await app.inject({
      method: 'POST',
      url: '/simulator/order',
      headers: { authorization: 'Bearer token' },
      payload: { symbol: 'BTC', side: 'buy', quantity: 1 },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('INSUFFICIENT_CASH')
  })

  it('maps a repeated buy failure to the MVP buy limit response', async () => {
    vi.mocked(repository.executeOrder).mockRejectedValueOnce(
      new SimulatorError(
        'BUY_LIMIT_REACHED',
        'MVP에서는 종목별로 한 번만 매수할 수 있습니다. 계좌 초기화 후 다시 매수해 주세요.',
        409,
      ),
    )

    const response = await app.inject({
      method: 'POST',
      url: '/simulator/order',
      headers: { authorization: 'Bearer token' },
      payload: { symbol: 'BTC', side: 'buy', quantity: 0.01 },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().error).toEqual({
      code: 'BUY_LIMIT_REACHED',
      message: 'MVP에서는 종목별로 한 번만 매수할 수 있습니다. 계좌 초기화 후 다시 매수해 주세요.',
    })
  })

  it('returns only supported public quotes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/market/quote?symbols=ETH,BTC',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(quotes)

    const invalid = await app.inject({
      method: 'GET',
      url: '/market/quote?symbols=XRP',
    })
    expect(invalid.statusCode).toBe(400)
  })

  it('resets the authenticated account', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/simulator/reset',
      headers: { authorization: 'Bearer token' },
    })

    expect(response.statusCode).toBe(200)
    expect(repository.reset).toHaveBeenCalledWith(userId)
  })
})
