import { requestJson } from '../freeapi/http.js'
import { FreeApiError } from '../freeapi/errors.js'
import { fngResponseSchema } from './schemas.js'
import type { SentimentLabel, SentimentResponse } from './types.js'

const FNG_BASE_URL = 'https://api.alternative.me/fng/'
const PROVIDER = 'alternative.me' as const

export const SENTIMENT_TTL_MS = 30 * 60_000 // 30분
export const SENTIMENT_STALE_TTL_MS = 6 * 60 * 60_000 // 6시간

// 라벨 경계는 서버 상수로 고정(업스트림 분류 문자열 변동에 흔들리지 않게).
function toLabel(value: number): SentimentLabel {
  if (value <= 44) return 'negative'
  if (value <= 54) return 'neutral'
  return 'positive'
}

function toFiniteNumber(raw: string, field: string): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    throw new FreeApiError(`invalid F&G ${field}: ${raw}`, 'SCHEMA_MISMATCH', { retryable: false })
  }
  return parsed
}

export async function fetchFearGreed(days: number): Promise<SentimentResponse> {
  // 추세 days개 + 현재값 1개 여유
  const feed = await requestJson(`${FNG_BASE_URL}?limit=${days + 1}`, fngResponseSchema)

  const points = feed.data.map((entry) => ({
    t: toFiniteNumber(entry.timestamp, 'timestamp') * 1000,
    value: toFiniteNumber(entry.value, 'value'),
    classification: entry.value_classification,
    nextUpdateInSec: entry.time_until_update ? Number(entry.time_until_update) : null,
  }))
  points.sort((a, b) => a.t - b.t) // 오름차순(마지막이 오늘)

  const latest = points[points.length - 1]

  return {
    provider: PROVIDER,
    value: latest.value,
    classification: latest.classification,
    label: toLabel(latest.value),
    updatedAt: latest.t,
    nextUpdateInSec: Number.isFinite(latest.nextUpdateInSec ?? NaN) ? latest.nextUpdateInSec : null,
    history: points.map((point) => ({ t: point.t, value: point.value })),
    fetchedAt: Date.now(),
    cacheTtlMs: SENTIMENT_TTL_MS,
    stale: false,
  }
}
