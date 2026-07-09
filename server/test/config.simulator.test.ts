import { afterEach, describe, expect, it, vi } from 'vitest'

describe('simulator config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('exposes simulator env values when configured', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/postgres')

    vi.resetModules()
    const { config } = await import('../src/config.js')

    expect(config.supabaseUrl).toBe('https://example.supabase.co')
    expect(config.supabaseServiceRoleKey).toBe('service-role')
    expect(config.databaseUrl).toBe('postgres://user:pass@localhost:5432/postgres')
  })
})
