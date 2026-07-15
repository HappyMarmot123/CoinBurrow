import { readdir, readFile } from 'node:fs/promises'

import postgres from 'postgres'

const connectionString = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL

if (!connectionString) {
  throw new Error('POSTGRES_URL_NON_POOLING or POSTGRES_URL is required')
}

const migrationsDirectory = new URL('../../supabase/migrations/', import.meta.url)
const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith('.sql'))
  .sort()
const migrations = await Promise.all(migrationNames.map(async (name) => ({
  name,
  sql: await readFile(new URL(name, migrationsDirectory), 'utf8'),
})))
const sql = postgres(connectionString, { max: 1, prepare: false })

try {
  await sql.begin(async (transaction) => {
    for (const migration of migrations) {
      await transaction.unsafe(migration.sql)
    }
  })
  migrations.forEach(({ name }) => console.log(`Applied ${name}`))
} finally {
  await sql.end()
}
