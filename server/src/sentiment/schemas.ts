import { z } from 'zod'

export const fngEntrySchema = z.object({
  value: z.string(),
  value_classification: z.string(),
  timestamp: z.string(),
  time_until_update: z.string().optional(),
})

export const fngResponseSchema = z.object({
  name: z.string().optional(),
  data: z.array(fngEntrySchema).min(1),
  metadata: z.object({ error: z.unknown().nullable() }).optional(),
})

export type FngResponse = z.output<typeof fngResponseSchema>
