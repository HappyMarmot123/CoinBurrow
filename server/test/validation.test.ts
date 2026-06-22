import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { parseWithSchema } from '../src/shared/validation/parse.js'
import { apiEnvelopeSchema } from '../src/shared/validation/schemas/api/api-envelope.js'

describe('parseWithSchema', () => {
  it('returns parsed data without throwing', () => {
    expect(parseWithSchema(z.object({ id: z.string() }), { id: 'btc' }, 'http')).toEqual({
      ok: true,
      data: { id: 'btc' },
    })
  })

  it('normalizes schema failures', () => {
    const result = parseWithSchema(z.object({ id: z.string() }), { id: 1 }, 'http')

    expect(result).toMatchObject({
      ok: false,
      error: {
        source: 'http',
        code: 'SCHEMA_MISMATCH',
        path: 'id',
      },
    })
  })
})

describe('apiEnvelopeSchema', () => {
  it('accepts success envelopes', () => {
    const result = apiEnvelopeSchema(z.array(z.string())).safeParse({
      success: true,
      data: ['KRW-BTC'],
    })

    expect(result.success).toBe(true)
  })

  it('accepts error envelopes', () => {
    const result = apiEnvelopeSchema(z.array(z.string())).safeParse({
      success: false,
      code: 'UPSTREAM_ERROR',
      message: 'upstream unavailable',
    })

    expect(result.success).toBe(true)
  })
})
