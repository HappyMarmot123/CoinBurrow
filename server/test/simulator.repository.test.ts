import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { SupabaseSimulatorRepository } from '../src/simulator/repository.js'

function queryBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue(result),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  return builder
}

describe('SupabaseSimulatorRepository', () => {
  it('returns unique symbols that have a buy order before account reset', async () => {
    const positions = queryBuilder({
      data: [{ symbol: 'BTC', quantity: '0.1', avg_price: '95000000' }],
      error: null,
    })
    const purchases = queryBuilder({
      data: [{ symbol: 'BTC' }, { symbol: 'BTC' }, { symbol: 'ETH' }],
      error: null,
    })
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{
          account_id: 'ca3642f8-a2db-43fb-a13a-3a119c44e88d',
          starting_cash: '100000000',
          cash_balance: '90500000',
        }],
        error: null,
      }),
      from: vi.fn((table: string) => table === 'sim_positions' ? positions : purchases),
    } as unknown as SupabaseClient
    const repository = new SupabaseSimulatorRepository(client)

    const snapshot = await repository.getSnapshot('user-1')

    expect(snapshot.purchasedSymbols).toEqual(['BTC', 'ETH'])
  })

  it('maps the database buy limit to a conflict domain error', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'BUY_LIMIT_REACHED' },
      }),
    } as unknown as SupabaseClient
    const repository = new SupabaseSimulatorRepository(client)

    await expect(repository.executeOrder({
      userId: 'user-1',
      symbol: 'BTC',
      side: 'buy',
      quantity: 0.01,
      price: 100_000_000,
    })).rejects.toMatchObject({
      code: 'BUY_LIMIT_REACHED',
      statusCode: 409,
    })
  })
})
