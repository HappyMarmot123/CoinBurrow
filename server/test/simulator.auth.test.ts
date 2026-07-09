import { afterEach, describe, expect, it, vi } from 'vitest'
import { config } from '../src/config.js'
import { extractBearerToken, verifySimulatorUser, verifySupabaseUser } from '../src/simulator/auth.js'
import { SimulatorError } from '../src/simulator/errors.js'

describe('simulator auth', () => {
  const originalSupabaseUrl = config.supabaseUrl
  const originalSupabaseServiceRoleKey = config.supabaseServiceRoleKey

  afterEach(() => {
    config.supabaseUrl = originalSupabaseUrl
    config.supabaseServiceRoleKey = originalSupabaseServiceRoleKey
  })

  it('extracts bearer token', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def')
  })

  it('extracts bearer token with case-insensitive scheme and flexible whitespace', () => {
    expect(extractBearerToken('bearer token')).toBe('token')
    expect(extractBearerToken('BEARER   token')).toBe('token')
  })

  it('rejects missing bearer token', () => {
    expect(() => extractBearerToken(undefined)).toThrow(SimulatorError)
  })

  it('rejects empty bearer token', () => {
    expect(() => extractBearerToken('Bearer')).toThrow(SimulatorError)
    expect(() => extractBearerToken('Bearer   ')).toThrow(SimulatorError)
  })

  it('verifies user through supplied verifier', async () => {
    const verifier = vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@example.com' })
    await expect(verifySimulatorUser('Bearer token', verifier)).resolves.toEqual({
      id: 'user-1',
      email: 'a@example.com',
    })
  })

  it('rejects null verifier result as auth required', async () => {
    const verifier = vi.fn().mockResolvedValue(null)

    await expect(verifySimulatorUser('Bearer token', verifier)).rejects.toMatchObject({
      code: 'SIM_AUTH_REQUIRED',
      statusCode: 401,
    })
  })

  it('maps upstream simulator errors to 502', () => {
    expect(new SimulatorError('SIM_UPSTREAM_FAILURE', 'failed').statusCode).toBe(502)
  })

  it('rejects missing Supabase credentials as upstream failure', async () => {
    config.supabaseUrl = ''
    config.supabaseServiceRoleKey = ''

    await expect(verifySupabaseUser('token')).rejects.toMatchObject({
      code: 'SIM_UPSTREAM_FAILURE',
      statusCode: 502,
    })
  })
})
