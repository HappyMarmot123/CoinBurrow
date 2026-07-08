import { request } from 'undici'
import { z } from 'zod'

import { FreeApiError } from './errors.js'

interface RetryState {
  retryCount: number
}

interface RequestJsonOptions {
  timeoutMs?: number
  maxRetries?: number
  retryDelaysMs?: number[]
}

export const DEFAULT_TIMEOUT_MS = 3000
export const DEFAULT_MAX_RETRIES = 2
export const DEFAULT_RETRY_DELAYS_MS = [250, 500]

// 일부 공급자(예: CoinGecko)는 Cloudflare 엣지에서 User-Agent 없는 요청을 403으로 차단한다.
// 모든 무료 API 호출이 자신을 식별하도록 기본 헤더를 부착한다.
const DEFAULT_REQUEST_HEADERS: Record<string, string> = {
  "user-agent": "CoinBurrow/1.0 (+https://github.com/coinburrow)",
  accept: "application/json",
}

export interface RequestPolicy {
  timeoutMs: number
  maxRetries: number
  retryDelaysMs: number[]
}

export const DEFAULT_REQUEST_POLICY: RequestPolicy = {
  timeoutMs: DEFAULT_TIMEOUT_MS,
  maxRetries: DEFAULT_MAX_RETRIES,
  retryDelaysMs: [...DEFAULT_RETRY_DELAYS_MS],
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function parseTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => {
    controller.abort(new Error("request timeout"))
  }, timeoutMs)

  return controller.signal
}

function normalizeToNumber(value: unknown): number {
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const sanitized = value.replaceAll(",", "").trim()
    const parsed = Number(sanitized)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  throw new Error(`invalid number: ${String(value)}`)
}

export function parseNumericString(value: unknown): string {
  return String(normalizeToNumber(value))
}

async function requestJsonOnce<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestJsonOptions,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  try {
    const response = await request(path, {
      signal: parseTimeoutSignal(timeoutMs),
      headers: DEFAULT_REQUEST_HEADERS,
    })

    if (response.statusCode < 200 || response.statusCode >= 300) {
      const retryable = isRetryableStatus(response.statusCode)
      await response.body.dump()
      if (response.statusCode === 429) {
        throw new FreeApiError(
          `upstream rate limited: ${path}`,
          "RATE_LIMIT",
          { status: response.statusCode, retryable: true },
        )
      }

      throw new FreeApiError(`upstream error: ${response.statusCode}`, "UPSTREAM_ERROR", {
        status: response.statusCode,
        retryable,
      })
    }

    try {
      const body = await response.body.json()
      return schema.parse(body)
    } catch (cause) {
      if (cause instanceof FreeApiError) {
        throw cause
      }
      throw new FreeApiError("upstream schema mismatch", "SCHEMA_MISMATCH", { cause })
    }
  } catch (error) {
    if (error instanceof FreeApiError) {
      throw error
    }
    if (error instanceof Error && error.message === "request timeout") {
      throw new FreeApiError("upstream request timeout", "TIMEOUT", { retryable: true, cause: error })
    }
    throw new FreeApiError("upstream request failed", "NETWORK_ERROR", { retryable: true, cause: error })
  }
}

export async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestJsonOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS
  const state: RetryState = { retryCount: 0 }

  while (true) {
    try {
      return await requestJsonOnce(path, schema, options)
    } catch (error) {
      if (
        error instanceof FreeApiError
        && error.retryable
        && state.retryCount < maxRetries
      ) {
        const delay = retryDelaysMs[Math.min(state.retryCount, retryDelaysMs.length - 1)]
        state.retryCount += 1
        await sleep(delay)
        continue
      }
      throw error
    }
  }
}
