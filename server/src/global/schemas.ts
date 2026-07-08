import { z } from 'zod'

export const globalResponseSchema = z.object({
  data: z.object({
    total_market_cap: z.record(z.string(), z.number()),
    total_volume: z.record(z.string(), z.number()).optional(),
    market_cap_percentage: z.record(z.string(), z.number()).optional(),
    market_cap_change_percentage_24h_usd: z.number().optional(),
    active_cryptocurrencies: z.number().optional(),
    markets: z.number().optional(),
    updated_at: z.number().optional(),
  }).passthrough(),
}).passthrough()

export type GlobalApiResponse = z.output<typeof globalResponseSchema>
