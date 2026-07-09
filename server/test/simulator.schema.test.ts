import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  profiles,
  simAccounts,
  simAuditEvents,
} from '../src/db/schema.js'

function expectColumn(
  column: { name: string; notNull: boolean; hasDefault: boolean; primary: boolean; default?: unknown },
  contract: { name: string; notNull: boolean; hasDefault: boolean; primary?: boolean; default?: unknown },
) {
  expect(column.name).toBe(contract.name)
  expect(column.notNull).toBe(contract.notNull)
  expect(column.hasDefault).toBe(contract.hasDefault)
  expect(column.primary).toBe(contract.primary ?? false)

  if ('default' in contract) {
    expect(column.default).toBe(contract.default)
  }
}

describe('simulator schema', () => {
  it('defines foundation table names', () => {
    expect(getTableName(profiles)).toBe('profiles')
    expect(getTableName(simAccounts)).toBe('sim_accounts')
    expect(getTableName(simAuditEvents)).toBe('sim_audit_events')
  })

  it('defines profiles column contract', () => {
    expectColumn(profiles.id, { name: 'id', notNull: true, hasDefault: false, primary: true })
    expectColumn(profiles.displayName, { name: 'display_name', notNull: false, hasDefault: false })
    expectColumn(profiles.startingCash, {
      name: 'starting_cash',
      notNull: true,
      hasDefault: true,
      default: '100000000',
    })
    expectColumn(profiles.createdAt, { name: 'created_at', notNull: true, hasDefault: true })
    expectColumn(profiles.updatedAt, { name: 'updated_at', notNull: true, hasDefault: true })
  })

  it('defines simulator account column contract', () => {
    expectColumn(simAccounts.id, { name: 'id', notNull: true, hasDefault: true, primary: true })
    expectColumn(simAccounts.userId, { name: 'user_id', notNull: true, hasDefault: false })
    expectColumn(simAccounts.cashBalance, {
      name: 'cash_balance',
      notNull: true,
      hasDefault: true,
      default: '100000000',
    })
    expectColumn(simAccounts.mode, { name: 'mode', notNull: true, hasDefault: true, default: 'paper' })
    expectColumn(simAccounts.createdAt, { name: 'created_at', notNull: true, hasDefault: true })
    expectColumn(simAccounts.updatedAt, { name: 'updated_at', notNull: true, hasDefault: true })
  })

  it('defines simulator audit event column contract', () => {
    expectColumn(simAuditEvents.id, { name: 'id', notNull: true, hasDefault: true, primary: true })
    expectColumn(simAuditEvents.userId, { name: 'user_id', notNull: true, hasDefault: false })
    expectColumn(simAuditEvents.eventType, { name: 'event_type', notNull: true, hasDefault: false })
    expectColumn(simAuditEvents.reason, { name: 'reason', notNull: false, hasDefault: false })
    expectColumn(simAuditEvents.createdAt, { name: 'created_at', notNull: true, hasDefault: true })
  })
})