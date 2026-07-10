import { describe, expect, it, vi } from 'vitest'
import { ensurePaperAccount } from '../src/simulator/accountService.js'

describe('ensurePaperAccount', () => {
  it('returns existing paper account', async () => {
    const repository = {
      findProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
      createProfile: vi.fn(),
      findPaperAccount: vi.fn().mockResolvedValue({ id: 'account-1', cashBalance: '100000000' }),
      createPaperAccount: vi.fn(),
    }

    await expect(ensurePaperAccount(repository, { id: 'user-1', email: 'a@example.com' })).resolves.toEqual({
      id: 'account-1',
      cashBalance: '100000000',
    })
    expect(repository.createPaperAccount).not.toHaveBeenCalled()
  })

  it('creates profile and account when missing', async () => {
    const repository = {
      findProfile: vi.fn().mockResolvedValue(null),
      createProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
      findPaperAccount: vi.fn().mockResolvedValue(null),
      createPaperAccount: vi.fn().mockResolvedValue({ id: 'account-1', cashBalance: '100000000' }),
    }

    await expect(ensurePaperAccount(repository, { id: 'user-1', email: 'a@example.com' })).resolves.toEqual({
      id: 'account-1',
      cashBalance: '100000000',
    })
  })
})
