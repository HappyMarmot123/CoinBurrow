import { readFile } from 'node:fs/promises'

import { afterEach, describe, expect, it, vi } from 'vitest'

type DrizzleMigrationConfig = {
  schema?: string
  out?: string
  dialect?: string
  dbCredentials?: { url?: string }
  strict?: boolean
}

async function readPackageJson(path: string) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')) as {
    scripts?: Record<string, string>
  }
}

describe('Drizzle migration pipeline', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('exposes package scripts for generating and applying database migrations', async () => {
    const rootPackage = await readPackageJson('../../package.json')
    const serverPackage = await readPackageJson('../package.json')

    expect(rootPackage.scripts?.['db:generate']).toBe('npm run db:generate --workspace server')
    expect(rootPackage.scripts?.['db:migrate']).toBe('npm run db:migrate --workspace server')
    expect(rootPackage.scripts?.['db:studio']).toBe('npm run db:studio --workspace server')

    expect(serverPackage.scripts?.['db:generate']).toBe('drizzle-kit generate --config drizzle.config.ts')
    expect(serverPackage.scripts?.['db:migrate']).toBe('drizzle-kit migrate --config drizzle.config.ts')
    expect(serverPackage.scripts?.['db:studio']).toBe('drizzle-kit studio --config drizzle.config.ts')
  })

  it('configures Drizzle Kit for Supabase Postgres migrations', async () => {
    vi.stubEnv('POSTGRES_URL_NON_POOLING', 'postgres://postgres:secret@db.example.supabase.co:5432/postgres')
    vi.stubEnv('DATABASE_URL', 'postgres://pooled:secret@pooler.example.supabase.co:6543/postgres')

    const { default: rawDrizzleConfig } = await import('../drizzle.config.js')
    const drizzleConfig = rawDrizzleConfig as DrizzleMigrationConfig

    expect(drizzleConfig.schema).toBe('./src/db/schema.ts')
    expect(drizzleConfig.out).toBe('./drizzle')
    expect(drizzleConfig.dialect).toBe('postgresql')
    expect(drizzleConfig.dbCredentials).toEqual({
      url: 'postgres://postgres:secret@db.example.supabase.co:5432/postgres',
    })
    expect(drizzleConfig.strict).toBe(true)
  })
})
