import { describe, expect, it, vi } from 'vitest'
import { extractBearerToken, verifySimulatorUser } from '../src/simulator/auth.js'
import { SimulatorError } from '../src/simulator/errors.js'

describe('simulator auth', () => {
  it('extracts bearer token', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def')
  })

  it('rejects missing bearer token', () => {
    expect(() => extractBearerToken(undefined)).toThrow(SimulatorError)
  })

  it('verifies user through supplied verifier', async () => {
    const verifier = vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@example.com' })
    await expect(verifySimulatorUser('Bearer token', verifier)).resolves.toEqual({
      id: 'user-1',
      email: 'a@example.com',
    })
  })
})
