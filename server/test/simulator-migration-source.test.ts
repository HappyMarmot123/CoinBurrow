import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

const singleBuyMigrationUrl = new URL(
  '../../supabase/migrations/20260715010000_single_buy_per_symbol.sql',
  import.meta.url,
)
const baseMigrationUrl = new URL(
  '../../supabase/migrations/20260715000000_simulator_mvp.sql',
  import.meta.url,
)

describe('single-buy simulator migration', () => {
  it('checks buy history while holding the account row lock', async () => {
    const sql = await readFile(singleBuyMigrationUrl, 'utf8')

    expect(sql).toContain('for update;')
    expect(sql).toContain("orders.side = 'buy'")
    expect(sql).toContain("message = 'BUY_LIMIT_REACHED'")
    expect(sql).not.toContain('on conflict (account_id, symbol) do update')
  })

  it('clears buy history when the simulator account is reset', async () => {
    const sql = await readFile(baseMigrationUrl, 'utf8')

    expect(sql).toContain('delete from public.sim_orders where account_id = v_account_id;')
  })
})
