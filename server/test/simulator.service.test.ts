import { describe, expect, it, vi } from 'vitest'

import type { SimulatorQuoteProvider } from '../src/simulator/quoteProvider.js'
import type { SimulatorRepository } from '../src/simulator/repository.js'
import { buildSimulatorState, SimulatorService } from '../src/simulator/service.js'
import type { AccountSnapshot, MarketQuote } from '../src/simulator/types.js'

const quotes: MarketQuote[] = [
  { symbol: 'BTC', price: 110_000_000, changeRate: 0.02 },
  { symbol: 'ETH', price: 5_000_000, changeRate: -0.01 },
]

function snapshot(overrides: Partial<AccountSnapshot> = {}): AccountSnapshot {
  return {
    accountId: 'f14085b2-5028-4fd5-934c-9e8a16d0a993',
    startingCash: 100_000_000,
    cashBalance: 70_000_000,
    positions: [{ symbol: 'BTC', quantity: 0.3, avgPrice: 100_000_000 }],
    purchasedSymbols: ['BTC'],
    ...overrides,
  }
}

describe('buildSimulatorState', () => {
  it('calculates integrated account and position profit', () => {
    const state = buildSimulatorState(snapshot(), quotes, 1234)

    expect(state.account).toEqual({
      startingCash: 100_000_000,
      cashBalance: 70_000_000,
      investedValue: 33_000_000,
      totalAsset: 103_000_000,
      totalProfit: 3_000_000,
      returnRate: 3,
    })
    expect(state.positions[0]).toMatchObject({
      symbol: 'BTC',
      currentPrice: 110_000_000,
      marketValue: 33_000_000,
      profit: 3_000_000,
      returnRate: 10,
    })
    expect(state.purchasedSymbols).toEqual(['BTC'])
    expect(state.asOf).toBe(1234)
  })

  it('keeps a realized loss in the integrated account profit with no positions', () => {
    const state = buildSimulatorState(
      snapshot({ cashBalance: 98_000_000, positions: [] }),
      quotes,
    )

    expect(state.account.totalProfit).toBe(-2_000_000)
    expect(state.account.returnRate).toBe(-2)
    expect(state.positions).toEqual([])
    expect(state.purchasedSymbols).toEqual(['BTC'])
  })
})

describe('SimulatorService', () => {
  it('executes an order with the server quote and returns the updated state', async () => {
    const repository: SimulatorRepository = {
      getSnapshot: vi.fn().mockResolvedValue(snapshot()),
      executeOrder: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn().mockResolvedValue(undefined),
    }
    const quoteProvider: SimulatorQuoteProvider = {
      getQuotes: vi.fn().mockResolvedValue(quotes),
    }
    const service = new SimulatorService(repository, quoteProvider)

    const state = await service.executeOrder({
      userId: 'user-1',
      symbol: 'BTC',
      side: 'buy',
      quantity: 0.01,
    })

    expect(repository.executeOrder).toHaveBeenCalledWith({
      userId: 'user-1',
      symbol: 'BTC',
      side: 'buy',
      quantity: 0.01,
      price: 110_000_000,
    })
    expect(state.account.totalProfit).toBe(3_000_000)
  })
})
