import { describe, expect, it, vi } from 'vitest'
import { getSimulatorSession } from '../src/api/simulator.js'

describe('simulator api', () => {
  it('sends bearer token to simulator session endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: true, userId: 'user-1' }),
    })

    const session = await getSimulatorSession('token', fetchMock)

    expect(fetchMock).toHaveBeenCalledWith('/api/simulator/session', {
      headers: { Authorization: 'Bearer token' },
    })
    expect(session).toEqual({ authenticated: true, userId: 'user-1' })
  })
})