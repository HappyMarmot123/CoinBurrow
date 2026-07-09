import { describe, expect, it } from 'vitest'
import {
  profiles,
  simAccounts,
  simAuditEvents,
} from '../src/db/schema.js'

describe('simulator schema', () => {
  it('defines profile, account, and audit tables', () => {
    expect(profiles).toBeDefined()
    expect(simAccounts).toBeDefined()
    expect(simAuditEvents).toBeDefined()
  })
})