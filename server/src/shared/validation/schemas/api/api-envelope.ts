import { z } from 'zod'

import type { NormalizedError } from '../../error/normalized-error.js'
import { createNormalizedError, type NormalizedErrorSource } from '../../error/normalized-error.js'

export interface ApiSuccessEnvelope<T> {
  success: true
  data: T
  requestId?: string
  timestamp?: number
}

export interface ApiErrorEnvelope {
  success: false
  code: string
  message: string
  detail?: unknown
  requestId?: string
  timestamp?: number
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope

export const apiErrorEnvelopeSchema = z
  .object({
    success: z.literal(false),
    code: z.string().min(1),
    message: z.string().min(1),
    detail: z.unknown().optional(),
    requestId: z.string().optional(),
    timestamp: z.number().optional(),
  })
  .passthrough()

export function apiEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T): z.ZodType<ApiEnvelope<z.infer<T>>> {
  return z.discriminatedUnion('success', [
    z
      .object({
        success: z.literal(true),
        data: dataSchema,
        requestId: z.string().optional(),
        timestamp: z.number().optional(),
      })
      .passthrough(),
    apiErrorEnvelopeSchema,
  ]) as z.ZodType<ApiEnvelope<z.infer<T>>>
}

export function toApiError(error: NormalizedError): ApiErrorEnvelope {
  return {
    success: false,
    code: error.code,
    message: error.message,
    ...(error.detail === undefined ? {} : { detail: error.detail }),
    timestamp: Date.now(),
  }
}

export function toApiSuccess<T>(data: T): ApiSuccessEnvelope<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  }
}

export function apiEnvelopeErrorToNormalizedError(
  envelope: ApiErrorEnvelope,
  source: NormalizedErrorSource,
): NormalizedError {
  return createNormalizedError({
    source,
    code: normalizeApiErrorCode(envelope.code),
    message: envelope.message,
    detail: envelope.detail,
  })
}

function normalizeApiErrorCode(code: string): NormalizedError['code'] {
  if (
    code === 'VALIDATION_ERROR' ||
    code === 'SCHEMA_MISMATCH' ||
    code === 'NETWORK_ERROR' ||
    code === 'TIMEOUT' ||
    code === 'UPSTREAM_ERROR' ||
    code === 'RATE_LIMIT'
  ) {
    return code
  }
  return 'UPSTREAM_ERROR'
}
