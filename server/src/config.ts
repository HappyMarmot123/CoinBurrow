import { TARGET_COINS, UPBIT_REST_URL } from './upbit/constants.js'

export const config = {
  port: Number(process.env.PORT ?? 4000),
  upbitRestUrl: UPBIT_REST_URL,
  targetCoins: TARGET_COINS,
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  databaseUrl: process.env.DATABASE_URL ?? '',
}
