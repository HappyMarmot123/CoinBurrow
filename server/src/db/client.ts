import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { config } from '../config.js'
import * as schema from './schema.js'

export function createDb(databaseUrl = config.databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for simulator database access')
  }

  const client = postgres(databaseUrl, { prepare: false })

  return drizzle(client, { schema })
}